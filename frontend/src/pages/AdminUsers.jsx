import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./AdminUsers.css";

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    nickname: "",
    full_name: "",
    about_me: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  async function fetchUsers() {
    try {
      const res = await client.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Couldn't load crew list:", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (user?.is_leader) {
      fetchUsers();
    }
  }, [user]);

  if (!user?.is_leader) {
    return (
      <div className="page">
        <div className="empty-state">Only the group leader can access these tools.</div>
      </div>
    );
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      const res = await client.post("/users", data);
      setSuccess(`${res.data.nickname} has been added successfully.`);
      setForm({ username: "", password: "", nickname: "", full_name: "", about_me: "" });
      fetchUsers(); // Refresh list
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't create that friend.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(targetUser) {
    if (
      !window.confirm(
        `ARE YOU SURE? This will permanently delete ${targetUser.nickname} (@${targetUser.username}) and ALL their photos, memories, posts, and votes.`
      )
    ) {
      return;
    }
    try {
      await client.delete(`/users/${targetUser.id}`);
      fetchUsers(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.detail || "Could not delete user.");
    }
  }

  return (
    <div className="page admin-page-container">
      <div className="admin-section">
        <span className="eyebrow">Group Leader Tools</span>
        <h1>Add a friend</h1>
        <p className="muted">
          Create a login for a new friend. Share the username and password with them so they can log
          in and build their own profile.
        </p>

        <form className="card admin-form" onSubmit={handleSubmit}>
          <div className="admin-grid">
            <label>
              Username
              <input value={form.username} onChange={(e) => update("username", e.target.value)} required />
            </label>
            <label>
              Password
              <input
                type="text"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={4}
              />
            </label>
            <label>
              Nickname
              <input value={form.nickname} onChange={(e) => update("nickname", e.target.value)} required />
            </label>
            <label>
              Full name
              <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
            </label>
          </div>
          <label>
            About me (they can change this later)
            <textarea
              rows={3}
              value={form.about_me}
              onChange={(e) => update("about_me", e.target.value)}
              placeholder="Dossier summary description…"
            />
          </label>

          {error && <p className="login-error">{error}</p>}
          {success && <p className="admin-success">{success}</p>}

          <div className="admin-actions">
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add crew member"}
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate("/")}>
              Back home
            </button>
          </div>
        </form>
      </div>

      <div className="admin-section admin-list-section">
        <h2>Manage Crew Roster</h2>
        {loadingUsers ? (
          <p className="muted">Loading database roster…</p>
        ) : (
          <div className="admin-users-list card">
            {users.filter((u) => !u.is_leader).length === 0 ? (
              <p className="muted">No crew members registered yet.</p>
            ) : (
              users
                .filter((u) => !u.is_leader)
                .map((u) => (
                  <div key={u.id} className="admin-user-item">
                    <div className="admin-user-info">
                      <div className="admin-user-avatar">
                        {u.photo_url ? (
                          <img src={u.photo_url} alt={u.nickname} />
                        ) : (
                          <span>{u.nickname[0]}</span>
                        )}
                      </div>
                      <div className="admin-user-details">
                        <strong>{u.nickname}</strong>
                        <span className="muted"> (@{u.username})</span>
                        {u.full_name && <p className="admin-user-fullname">{u.full_name}</p>}
                      </div>
                    </div>
                    <button
                      className="btn danger small delete-btn"
                      onClick={() => handleDelete(u)}
                    >
                      Delete
                    </button>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
