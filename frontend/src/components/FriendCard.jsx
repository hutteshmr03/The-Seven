import { Link } from "react-router-dom";
import "./FriendCard.css";

export default function FriendCard({ friend, big = false }) {
  const clearanceLevel = friend.is_leader ? "07" : `0${(friend.id % 6) + 1}`;
  const agentCode = friend.is_leader ? "BOSS-01" : `AGT-${((friend.id * 17) % 90 + 10)}`;

  return (
    <Link to={`/friends/${friend.id}`} className={`friend-card ${big ? "big" : ""}`}>
      <div className="friend-photo">
        {friend.photo_url ? (
          <img src={friend.photo_url} alt={friend.nickname} />
        ) : (
          <span className="friend-photo-initial">{friend.nickname[0]}</span>
        )}
      </div>
      <div className="friend-card-info">
        {friend.is_leader && <span className="friend-badge">Group Leader</span>}
        <h3 className="friend-nickname">{friend.nickname}</h3>
        {friend.full_name && <p className="friend-fullname">{friend.full_name}</p>}
        
        <div className="friend-card-meta-row">
          <span className="card-code">[{agentCode}]</span>
          <span className="card-clearance">LVL {clearanceLevel}</span>
        </div>
      </div>
    </Link>
  );
}
