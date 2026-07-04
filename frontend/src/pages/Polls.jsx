import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Polls.css";

export default function Polls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  function load() {
    client
      .get("/polls")
      .then((res) => setPolls(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function updateOption(i, value) {
    setOptions((opts) => opts.map((o, idx) => (idx === i ? value : o)));
  }

  function addOption() {
    setOptions((opts) => [...opts, ""]);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    setSubmitting(true);
    try {
      await client.post("/polls", { question, options: cleanOptions });
      setQuestion("");
      setOptions(["", ""]);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(pollId, optionId) {
    await client.post(`/polls/${pollId}/vote`, { option_id: optionId });
    load();
  }

  async function handleClose(pollId) {
    await client.post(`/polls/${pollId}/close`);
    load();
  }

  return (
    <div className="page">
      <span className="eyebrow">Polls & Decisions</span>
      <h1>Where to meet this weekend?</h1>
      <p className="muted">Start a quick poll and let the group decide.</p>

      <form className="card poll-form" onSubmit={handleCreate}>
        <label>
          Question
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Where should we hang out Saturday?"
            required
          />
        </label>
        {options.map((opt, i) => (
          <label key={i}>
            Option {i + 1}
            <input value={opt} onChange={(e) => updateOption(i, e.target.value)} />
          </label>
        ))}
        <div className="poll-form-actions">
          <button type="button" className="btn ghost small" onClick={addOption}>
            + Add option
          </button>
          <button className="btn" disabled={submitting}>
            {submitting ? "Creating…" : "Create poll"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="empty-state">Loading polls…</div>
      ) : polls.length === 0 ? (
        <div className="empty-state">No polls yet — start one above!</div>
      ) : (
        <div className="poll-list">
          {polls.map((poll) => (
            <div className="card poll-item" key={poll.id}>
              <div className="post-head">
                <strong>{poll.question}</strong>
                {poll.is_closed && <span className="poll-closed-badge">Closed</span>}
              </div>
              <p className="muted small-muted">
                by {poll.creator.nickname} · {poll.total_votes} vote
                {poll.total_votes === 1 ? "" : "s"}
              </p>

              <div className="poll-options">
                {poll.options.map((opt) => {
                  const pct = poll.total_votes ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
                  const mine = poll.my_vote_option_id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`poll-option ${mine ? "mine" : ""}`}
                      disabled={poll.is_closed}
                      onClick={() => handleVote(poll.id, opt.id)}
                    >
                      <span className="poll-option-fill" style={{ width: `${pct}%` }} />
                      <span className="poll-option-label">
                        {opt.text} {mine && "✓"}
                      </span>
                      <span className="poll-option-pct">{pct}%</span>
                    </button>
                  );
                })}
              </div>

              {!poll.is_closed && (poll.creator.id === user.id || user.is_leader) && (
                <button className="link-btn" onClick={() => handleClose(poll.id)}>
                  close poll
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
