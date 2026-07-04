from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/users/relationships", tags=["relationships"])


@router.post("/request", response_model=schemas.RelationshipRequestOut)
def send_relationship_request(
    receiver_id: int = Form(...),
    relation_type: str = Form(...), # 'father', 'mother', 'spouse'
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Sends a relationship link request to another user, requiring their consent."""
    if receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot link a relationship to yourself")

    if relation_type not in ["father", "mother", "spouse"]:
        raise HTTPException(status_code=400, detail="Invalid relation type")

    # Check if receiver exists
    receiver = db.query(models.User).filter(models.User.id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Target agent not found")

    # Check if a pending request already exists of the same type
    existing = (
        db.query(models.RelationshipRequest)
        .filter(
            models.RelationshipRequest.sender_id == current_user.id,
            models.RelationshipRequest.receiver_id == receiver_id,
            models.RelationshipRequest.relation_type == relation_type,
            models.RelationshipRequest.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="A pending request already exists for this relative")

    new_req = models.RelationshipRequest(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        relation_type=relation_type,
        status="pending",
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req


@router.get("/pending", response_model=list[schemas.RelationshipRequestOut])
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lists all pending incoming relationship claims waiting for the user's approval."""
    requests = (
        db.query(models.RelationshipRequest)
        .filter(
            models.RelationshipRequest.receiver_id == current_user.id,
            models.RelationshipRequest.status == "pending",
        )
        .order_by(models.RelationshipRequest.created_at.desc())
        .all()
    )
    return requests


@router.post("/respond/{request_id}")
def respond_to_request(
    request_id: int,
    accept: bool = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Accepts or rejects an incoming relationship request, updating lineage details on approval."""
    req = db.query(models.RelationshipRequest).filter(models.RelationshipRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to respond to this request")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")

    sender = db.query(models.User).filter(models.User.id == req.sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")

    if accept:
        req.status = "accepted"
        # Update actual database relationship fields
        if req.relation_type == "father":
            sender.father_id = current_user.id
        elif req.relation_type == "mother":
            sender.mother_id = current_user.id
        elif req.relation_type == "spouse":
            sender.spouse_id = current_user.id
            current_user.spouse_id = sender.id  # Mutual spouse link
    else:
        req.status = "rejected"

    db.commit()
    return {"status": req.status}
