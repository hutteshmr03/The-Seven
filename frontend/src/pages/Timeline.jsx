import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import MediaLightbox from "../components/MediaLightbox";
import "./Timeline.css";

export default function Timeline() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", location: "", event_date: "" });
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);
  const { user } = useAuth();

  // Global Lightbox State
  const [lightbox, setLightbox] = useState({ show: false, url: "", type: "" });

  function load() {
    client
      .get("/timeline")
      .then((res) => setMemories(res.data))
      .catch((err) => console.error("Failed to load timeline:", err))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("event_date", new Date(form.event_date).toISOString());
      if (form.location) {
        data.append("location", form.location);
      }
      if (fileRef.current?.files?.[0]) {
        data.append("file", fileRef.current.files[0]);
      }

      await client.post("/timeline", data);
      setForm({ title: "", description: "", location: "", event_date: "" });
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      console.error("Failed to submit memory:", err);
      alert(err.response?.data?.detail || "Failed to submit memory");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this memory from the timeline?")) return;
    try {
      await client.delete(`/timeline/${id}`);
      load();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  return (
    <div className="page timeline-page-container">
      <span className="eyebrow">Timeline</span>
      <h1>Hangouts, Trips & Milestones</h1>
      <p className="muted">A running record of everything the crew has been up to.</p>

      {/* Memory Form Panel */}
      <form className="card memory-form" onSubmit={handleSubmit}>
        <div className="memory-form-grid">
          <label className="form-field">
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="Beach day 2026"
            />
          </label>
          <label className="form-field">
            Location
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Miami Beach, FL"
            />
          </label>
          <label className="form-field">
            Date
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              required
            />
          </label>
        </div>

        <label className="form-field">
          Description
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What happened, who said what…"
          />
        </label>

        <label className="form-field">
          Photo (optional)
          <input type="file" accept="image/*" ref={fileRef} className="file-input" />
        </label>

        <button className="btn memory-submit-btn" disabled={submitting}>
          {submitting ? "Adding Dossier…" : "ADD MEMORY"}
        </button>
      </form>

      {/* Timeline List */}
      {loading ? (
        <div className="empty-state">Decrypting timeline logs…</div>
      ) : memories.length === 0 ? (
        <div className="empty-state">No memories logged yet — add the first one!</div>
      ) : (
        <ol className="timeline-list">
          {memories.map((m) => (
            <li key={m.id} className="timeline-item card">
              <div className="timeline-date">
                {new Date(m.event_date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="timeline-body">
                <h3>{m.title}</h3>
                
                <div className="timeline-meta-row">
                  <span className="uploader-tag">added by {m.author.nickname}</span>
                  {m.location && (
                    <span className="location-tag">
                      📍 {m.location}
                    </span>
                  )}
                </div>

                {m.description && <p className="timeline-desc">{m.description}</p>}
                {m.photo_url && (
                  <img 
                    src={m.photo_url} 
                    alt={m.title} 
                    className="timeline-img cursor-pointer" 
                    loading="lazy"
                    onClick={() => setLightbox({ show: true, url: m.photo_url, type: "image" })} 
                  />
                )}
                
                {(m.author.id === user.id || user.is_leader) && (
                  <button className="timeline-delete-btn" onClick={() => handleDelete(m.id)}>
                    delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {/* Global Media Lightbox Overlay */}
      {lightbox.show && (
        <MediaLightbox
          mediaUrl={lightbox.url}
          mediaType={lightbox.type}
          onClose={() => setLightbox({ show: false, url: "", type: "" })}
        />
      )}
    </div>
  );
}
