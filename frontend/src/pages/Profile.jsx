import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me, refreshUser } = useAuth();
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: "", full_name: "", about_me: "", father_id: "", mother_id: "", spouse_id: "" });
  const [allUsers, setAllUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.startEditing) {
      setEditing(true);
    }
  }, [location.state]);

  // Full-screen activity log view toggle
  const [fullScreenActivity, setFullScreenActivity] = useState(false);

  // Reset password modal state
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  function openResetPassModal() {
    setResetNewPass("");
    setResetConfirmPass("");
    setResetError("");
    setResetSuccess("");
    setResetSubmitting(false);
    setResetPassOpen(true);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetNewPass.trim()) {
      setResetError("Password cannot be empty");
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setResetError("Passwords do not match");
      return;
    }
    setResetSubmitting(true);
    setResetError("");
    setResetSuccess("");
    try {
      const formData = new FormData();
      formData.append("new_password", resetNewPass);
      if (isOwnProfile) {
        await client.post("/users/change-password", formData);
        refreshUser({ ...me, password_changed: true });
      } else {
        await client.post(`/users/${id}/reset-password`, formData);
      }
      setResetSuccess("Password updated successfully!");
      setTimeout(() => {
        setResetPassOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Password reset failed:", err);
      setResetError(err.response?.data?.detail || "Failed to update password");
    } finally {
      setResetSubmitting(false);
    }
  }

  const isOwnProfile = me && Number(id) === me.id;

  function load() {
    client
      .get(`/users/${id}/feed`)
      .then((res) => {
        setFeed(res.data);
        setEditForm({
          nickname: res.data.user.nickname,
          full_name: res.data.user.full_name || "",
          about_me: res.data.user.about_me || "",
        });
      })
      .catch(() => setError("Couldn't find that friend."));
  }

  useEffect(() => {
    setFeed(null);
    setFullScreenActivity(false); // Reset view on ID change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveEdits(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await client.put("/users/me", editForm);
      setEditing(false);
      load();
      if (isOwnProfile) refreshUser(res.data);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await client.post("/users/me/photo", data);
      if (isOwnProfile) refreshUser(res.data);
      load();
    } catch (err) {
      console.error("Failed to upload photo:", err);
      alert(err.response?.data?.detail || "Failed to upload photo");
    }
  }

  async function handleDeleteFriend() {
    const nickname = feed?.user?.nickname || "this friend";
    if (
      !window.confirm(
        `ARE YOU SURE? This will permanently delete ${nickname} and ALL their photos, memories, board posts, and votes. This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await client.delete(`/users/${id}`);
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.detail || "Couldn't delete this friend.");
    }
  }

  if (error) return <div className="page empty-state">{error}</div>;
  if (!feed) return <div className="page empty-state">Loading profile database…</div>;

  const { user, photos, memories, posts, polls, votes = [] } = feed;
  const clearanceLevel = user?.is_leader ? "07" : `0${(user?.id % 6) + 1}`;
  const agentCode = user?.is_leader ? "BOSS-01" : `AGT-${((user?.id * 17) % 90 + 10)}`;

  // Render Full Screen Activity Logs
  if (fullScreenActivity) {
    const allActivities = [
      ...photos.map((p) => ({ ...p, type: "photo", date: new Date(p.created_at), key: `photo-${p.id}` })),
      ...memories.map((m) => ({ ...m, type: "memory", date: new Date(m.created_at), key: `memory-${m.id}` })),
      ...posts.map((post) => ({ ...post, type: "post", date: new Date(post.created_at), key: `post-${post.id}` })),
      ...polls.map((poll) => ({ ...poll, type: "poll", date: new Date(poll.created_at), key: `poll-${poll.id}` })),
      ...votes.map((v) => ({ ...v, type: "vote", date: new Date(v.created_at), key: `vote-${v.id}` })),
    ];
    allActivities.sort((a, b) => b.date - a.date);

    return (
      <div className="page full-activity-page">
        <div className="full-activity-header">
          <button className="btn ghost back-btn" onClick={() => setFullScreenActivity(false)}>
            ← BACK TO DOSSIER
          </button>
          <div className="header-info">
            <span className="eyebrow">Dossier Activity Logs</span>
            <h1>{user.nickname}'s Activity Archive</h1>
            <p className="muted">Chronological database records of transmissions, files, and votes.</p>
          </div>
        </div>

        <div className="activity-timeline card">
          {allActivities.length === 0 ? (
            <p className="empty-state">No activity logs found in the database archive.</p>
          ) : (
            <div className="timeline-stream">
              {allActivities.map((act) => (
                <div key={act.key} className={`timeline-stream-item ${act.type}`}>
                  <div className="timeline-stream-badge">
                    {act.type === "photo" && "📸"}
                    {act.type === "memory" && "🗓️"}
                    {act.type === "post" && "💬"}
                    {act.type === "poll" && "🗳️"}
                    {act.type === "vote" && "✔️"}
                  </div>
                  <div className="timeline-stream-body">
                    <div className="timeline-stream-meta">
                      <span className="stream-type">{act.type === "post" ? "Transmission" : act.type}</span>
                      <span className="stream-time">{act.date.toLocaleString()}</span>
                    </div>

                    {act.type === "photo" && (
                      <div className="stream-content">
                        <img src={act.url} alt="Gallery addition" className="stream-photo" onClick={() => window.open(act.url)} />
                        {act.caption && <p className="stream-caption">{act.caption}</p>}
                      </div>
                    )}

                    {act.type === "memory" && (
                      <div className="stream-content">
                        <h3>{act.title}</h3>
                        <span className="stream-event-date">Mission Date: {new Date(act.event_date).toLocaleDateString()}</span>
                        {act.description && <p>{act.description}</p>}
                        {act.photo_url && <img src={act.photo_url} alt="Memory" className="stream-photo" />}
                      </div>
                    )}

                    {act.type === "post" && (
                      <div className="stream-content">
                        {act.media_url && (
                          <div className="stream-post-media">
                            {act.media_type === "video" ? (
                              <video src={act.media_url} controls className="stream-video" />
                            ) : (
                              <img src={act.media_url} alt="Attachment" className="stream-photo" onClick={() => window.open(act.media_url)} />
                            )}
                          </div>
                        )}
                        {act.content && <p className="stream-post-text">{act.content}</p>}
                      </div>
                    )}

                    {act.type === "poll" && (
                      <div className="stream-content">
                        <p>Created the poll <strong>"{act.question}"</strong>.</p>
                      </div>
                    )}

                    {act.type === "vote" && (
                      <div className="stream-content">
                        <p>Voted <strong>"{act.option_text}"</strong> in the poll <em>"{act.poll_question}"</em>.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page profile-page-container">
      <div className="profile-header card">
        <div className="profile-photo-wrap">
          <div className="profile-photo-square">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.nickname} />
            ) : (
              <span>{user.nickname[0]}</span>
            )}
          </div>
          {isOwnProfile && (
            <>
              <button className="btn secondary small change-photo-btn" onClick={() => fileRef.current?.click()}>
                Change photo
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileRef}
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </>
          )}
        </div>

        <div className="profile-info">
          {user.is_leader && <span className="friend-badge">Group Leader</span>}
          {!editing ? (
            <>
              <div className="profile-dossier-header-block">
                <h1 className="profile-title">{user.nickname}</h1>
                <div className="profile-dossier-meta">
                  <span className="profile-code">[CODE: {agentCode}]</span>
                  <span className="profile-clearance">CLEARANCE: LEVEL {clearanceLevel}</span>
                </div>
              </div>
              {user.full_name && <p className="profile-fullname">{user.full_name}</p>}
              <p className="profile-about" style={{ marginTop: "12px" }}>{user.about_me || "No bio profile dossier recorded…"}</p>
              
              <div className="profile-actions-bar">
                {isOwnProfile && (
                  <button className="btn secondary small" onClick={() => setEditing(true)}>
                    Edit my profile
                  </button>
                )}
                
                <button className="btn secondary small" onClick={() => setFullScreenActivity(true)}>
                  View Activity Logs
                </button>

                {me?.is_leader && (
                  <button className="btn secondary small reset-pass-btn" onClick={openResetPassModal}>
                    Reset Password
                  </button>
                )}
                
                {me?.is_leader && !isOwnProfile && !user.is_leader && (
                  <button className="btn danger small delete-friend-btn" onClick={handleDeleteFriend}>
                    Delete Friend Account
                  </button>
                )}
              </div>
            </>
          ) : (
            <form className="profile-edit-form" onSubmit={saveEdits}>
              <label>
                Nickname
                <input
                  value={editForm.nickname}
                  onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))}
                  required
                />
              </label>
              <label>
                Full name
                <input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </label>
              <label>
                About me
                <textarea
                  rows={3}
                  value={editForm.about_me}
                  onChange={(e) => setEditForm((f) => ({ ...f, about_me: e.target.value }))}
                />
              </label>
              <div className="admin-actions">
                <button className="btn small" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="btn ghost small" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="profile-grid">
        <section className="profile-section card clickable-section" onClick={() => setFullScreenActivity(true)} title="Click to view full log details">
          <h2>📸 Gallery Additions</h2>
          {photos.length === 0 ? (
            <p className="muted">No records in the database.</p>
          ) : (
            <div className="mini-grid">
              {photos.slice(0, 4).map((p) => (
                <div className="mini-photo" key={p.id}>
                  <img src={p.url} alt={p.caption || "photo"} loading="lazy" />
                  {p.caption && <span className="mini-caption">{p.caption}</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="profile-section card clickable-section" onClick={() => setFullScreenActivity(true)} title="Click to view full log details">
          <h2>🗓️ Missions & Timeline</h2>
          {memories.length === 0 ? (
            <p className="muted">No timeline activities recorded.</p>
          ) : (
            <ul className="mini-list timeline-list">
              {memories.slice(0, 3).map((m) => (
                <li key={m.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-date">{new Date(m.event_date).toLocaleDateString()}</span>
                    <strong>{m.title}</strong>
                    {m.description && <p>{m.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile-section card clickable-section" onClick={() => setFullScreenActivity(true)} title="Click to view full log details">
          <h2>💬 Transmission logs (Posts)</h2>
          {posts.length === 0 ? (
            <p className="muted">No messages posted.</p>
          ) : (
            <ul className="mini-list post-logs">
              {posts.slice(0, 3).map((p) => (
                <li key={p.id} className="post-log-item">
                  <div className="post-log-meta">{new Date(p.created_at).toLocaleString()}</div>
                  <div className="post-log-content">
                    {p.media_url && (
                      <div className="post-log-media-preview" style={{ marginBottom: "8px" }}>
                        {p.media_type === "video" ? (
                          <video src={p.media_url} controls style={{ maxWidth: "100%", maxHeight: "150px", display: "block" }} />
                        ) : (
                          <img src={p.media_url} alt="Attachment" style={{ maxWidth: "100%", maxHeight: "150px", objectFit: "contain", display: "block" }} />
                        )}
                      </div>
                    )}
                    {p.content}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile-section card clickable-section" onClick={() => setFullScreenActivity(true)} title="Click to view full log details">
          <h2>🗳️ Poll Decisions</h2>
          {polls.length === 0 && votes.length === 0 ? (
            <p className="muted">No polls created or votes cast.</p>
          ) : (
            <ul className="mini-list poll-logs">
              {polls.slice(0, 2).map((p) => (
                <li key={`poll-${p.id}`} className="poll-log-item">
                  <span className="poll-dot" />
                  <div>
                    <strong>Created Poll:</strong> {p.question} {p.is_closed && <span className="closed-badge">Closed</span>}
                  </div>
                </li>
              ))}
              {votes.slice(0, 2).map((v) => (
                <li key={`vote-${v.id}`} className="poll-log-item">
                  <span className="poll-dot vote" />
                  <div>
                    <strong>Voted "{v.option_text}"</strong> in poll <em>"{v.poll_question}"</em>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Reset Password Modal */}
      {resetPassOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-card card">
            <h2 className="modal-title">RESET PASSWORD</h2>
            <p className="modal-message">
              {isOwnProfile 
                ? "Update your administrative access credentials." 
                : `Set a new temporary password for "${user.nickname}". They will be forced to change this password on their next login.`}
            </p>
            
            <form className="force-password-form" onSubmit={handleResetPassword} style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                New Password
                <input
                  type="password"
                  className="force-password-input"
                  placeholder="Enter new password"
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  required
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Confirm Password
                <input
                  type="password"
                  className="force-password-input"
                  placeholder="Confirm password"
                  value={resetConfirmPass}
                  onChange={(e) => setResetConfirmPass(e.target.value)}
                  required
                />
              </label>
              
              {resetError && <p className="error-message" style={{ margin: 0, color: "var(--marvel-red)" }}>{resetError}</p>}
              {resetSuccess && <p className="success-message" style={{ margin: 0, color: "#00E676" }}>{resetSuccess}</p>}
              
              <div className="modal-actions" style={{ marginTop: "12px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button 
                  type="button"
                  className="btn ghost modal-cancel-btn" 
                  onClick={() => setResetPassOpen(false)}
                  disabled={resetSubmitting}
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="btn modal-confirm-btn" 
                  disabled={resetSubmitting}
                >
                  {resetSubmitting ? "UPDATING..." : "UPDATE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
