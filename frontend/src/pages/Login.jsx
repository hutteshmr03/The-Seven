import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your username and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <video className="login-bg-video" autoPlay loop muted playsInline>
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>
      <div className="login-overlay"></div>

      <form className="login-card card" onSubmit={handleSubmit} autoComplete="off">
        <div className="login-brand glitch-text" data-text="THE SEVEN">
          THE <span>SEVEN</span>
        </div>
        <h1 className="illegal-title">YOU'RE ENTERING THE ILLEGAL WORLD</h1>
        <div className="login-logo-container">
          <img src="/the-boys-logo-official.svg" alt="The Boys" className="login-logo-image-svg" />
        </div>
        <p className="muted">Log in with the username and password your group leader gave you.</p>

        <label className="login-label">
          Username
          <input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            autoFocus 
            autoComplete="off"
          />
        </label>
        <label className="login-label">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="btn login-btn" type="submit" disabled={submitting}>
          {submitting ? "VERIFYING USER…" : "SECURE SIGN IN"}
        </button>
      </form>
    </div>
  );
}
