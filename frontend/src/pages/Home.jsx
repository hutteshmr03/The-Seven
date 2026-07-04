import { useEffect, useState } from "react";
import FriendCard from "../components/FriendCard";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

export default function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user: me } = useAuth();

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  function triggerConfirm(title, message, onConfirmAction) {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirmAction();
        setConfirmModal((prev) => ({ ...prev, show: false }));
      },
    });
  }

  function loadUsers() {
    client
      .get("/users")
      .then((res) => setUsers(res.data))
      .catch(() => setError("Couldn't load the crew. Try refreshing."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleDeleteUser(e, friendId, friendNickname) {
    e.preventDefault();
    e.stopPropagation();

    triggerConfirm(
      "DELETE USER ACCOUNT",
      `Are you sure you want to permanently delete "${friendNickname}" and all their posts, photos, memories, and votes? This action cannot be undone.`,
      async () => {
        try {
          await client.delete(`/users/${friendId}`);
          loadUsers();
        } catch (err) {
          console.error("Delete user failed:", err);
          alert(err.response?.data?.detail || "Could not delete this user.");
        }
      }
    );
  }

  if (loading) return <div className="empty-state">Assembling the crew…</div>;
  if (error) return <div className="empty-state">{error}</div>;

  const leader = users.find((u) => u.is_leader);
  const friends = users.filter((u) => !u.is_leader);

  return (
    <div className="page home-page-container">
      {/* Marvel-Style Header Banner */}
      <div className="characters-hero-banner">
        <div className="cyber-bracket top-left"></div>
        <div className="cyber-bracket top-right"></div>
        <div className="cyber-bracket bottom-left"></div>
        <div className="cyber-bracket bottom-right"></div>
        <div className="hero-banner-overlay"></div>
        <div className="hero-banner-content">
          <div className="system-status-indicator">
            <span className="pulse-dot"></span> DATABASE SECURE [NODE: 007]
          </div>
          <h1>THE SEVEN CHARACTERS</h1>
          <p>Decrypting crew files. Roster initialized. Accessing dossier logs from the humble House of FriendZone.</p>
        </div>
      </div>

      {/* Leader Spotlight Spotlight (The Leader Face Card) */}
      {leader && (
        <div className="leader-section card">
          <div className="leader-spotlight">
            <div className="leader-card-wrap">
              <FriendCard friend={leader} big />
            </div>
            <div className="leader-bio-teaser">
              <div className="dossier-header-row">
                <span className="eyebrow">Featured Leader</span>
                <span className="dossier-id">[CLASSIFIED ID: BOSS-01]</span>
              </div>
              <h1 className="leader-title">{leader.nickname}</h1>
              {leader.full_name && <p className="leader-fullname">{leader.full_name}</p>}
              
              <div className="cyber-divider"></div>

              <p className="leader-desc">
                {leader.about_me || "Directing operations here at FriendZone HQ."}
              </p>

              <div className="cyber-divider"></div>

              <div className="dossier-footer-row">
                <span className="dossier-badge">CLEARANCE LEVEL 07</span>
                <span className="dossier-status">STATUS: ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Characters Headline */}
      <div className="featured-characters-header">
        <h2>FEATURED CHARACTERS</h2>
      </div>

      {/* Friends Cards Grid */}
      {friends.length === 0 ? (
        <div className="empty-state">
          No crew members added yet. The group leader can add friends from the "+ Add Friend" menu.
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((f) => (
            <div className="friend-card-wrapper" key={f.id} style={{ position: "relative" }}>
              <FriendCard friend={f} />
              {me?.is_leader && (
                <button
                  className="user-delete-btn"
                  onClick={(e) => handleDeleteUser(e, f.id, f.nickname)}
                  title={`Delete user account ${f.nickname}`}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-card card">
            <h2 className="modal-title">{confirmModal.title}</h2>
            <p className="modal-message">{confirmModal.message}</p>
            <div className="modal-actions">
              <button 
                type="button"
                className="btn ghost modal-cancel-btn" 
                onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
              >
                CANCEL
              </button>
              <button 
                type="button"
                className="btn modal-confirm-btn" 
                onClick={confirmModal.onConfirm}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
