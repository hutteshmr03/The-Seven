from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/polls", tags=["polls"])


def _serialize_poll(poll: models.Poll, current_user: models.User) -> schemas.PollOut:
    options_out = []
    total_votes = 0
    my_vote_option_id = None
    for opt in poll.options:
        count = len(opt.votes)
        total_votes += count
        options_out.append(schemas.PollOptionOut(id=opt.id, text=opt.text, vote_count=count))
        for v in opt.votes:
            if v.user_id == current_user.id:
                my_vote_option_id = opt.id

    return schemas.PollOut(
        id=poll.id,
        question=poll.question,
        is_closed=poll.is_closed,
        created_at=poll.created_at,
        creator=poll.creator,
        options=options_out,
        my_vote_option_id=my_vote_option_id,
        total_votes=total_votes,
    )


@router.get("", response_model=list[schemas.PollOut])
def list_polls(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    polls = (
        db.query(models.Poll)
        .options(joinedload(models.Poll.options).joinedload(models.PollOption.votes))
        .order_by(models.Poll.created_at.desc())
        .all()
    )
    return [_serialize_poll(p, current_user) for p in polls]


@router.post("", response_model=schemas.PollOut)
def create_poll(
    payload: schemas.PollCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if len(payload.options) < 2:
        raise HTTPException(status_code=400, detail="A poll needs at least 2 options")

    poll = models.Poll(creator_id=current_user.id, question=payload.question)
    poll.options = [models.PollOption(text=opt) for opt in payload.options]
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return _serialize_poll(poll, current_user)


@router.post("/{poll_id}/vote", response_model=schemas.PollOut)
def vote(
    poll_id: int,
    payload: schemas.VoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    poll = db.query(models.Poll).filter(models.Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.is_closed:
        raise HTTPException(status_code=400, detail="This poll is closed")

    option = db.query(models.PollOption).filter(
        models.PollOption.id == payload.option_id, models.PollOption.poll_id == poll_id
    ).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    existing_vote = db.query(models.Vote).filter(
        models.Vote.poll_id == poll_id, models.Vote.user_id == current_user.id
    ).first()
    if existing_vote:
        existing_vote.option_id = option.id
    else:
        db.add(models.Vote(poll_id=poll_id, option_id=option.id, user_id=current_user.id))
    db.commit()

    db.refresh(poll)
    return _serialize_poll(poll, current_user)


@router.post("/{poll_id}/close", response_model=schemas.PollOut)
def close_poll(
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    poll = db.query(models.Poll).filter(models.Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.creator_id != current_user.id and not current_user.is_leader:
        raise HTTPException(status_code=403, detail="Only the poll creator or leader can close it")
    poll.is_closed = True
    db.commit()
    db.refresh(poll)
    return _serialize_poll(poll, current_user)
