import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function ProtectedRoute({ children }) {
  const { user, loading, refreshUser } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return <div className="empty-state">Loading FriendZone…</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force password change on first login or temporary reset
  if (!user.password_changed) {
    const handleForceChangePassword = async (e) => {
      e.preventDefault();
      if (!newPassword.trim()) {
        setError("Password cannot be empty");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setSubmitting(true);
      setError("");
      try {
        const formData = new FormData();
        formData.append("new_password", newPassword);
        await client.post("/users/change-password", formData);
        
        // Update user state locally
        refreshUser({ ...user, password_changed: true });
      } catch (err) {
        console.error("Password change failed:", err);
        setError(err.response?.data?.detail || "Failed to update password");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="force-password-container">
        <div className="force-password-card card">
          <h2 className="force-password-title">SECURITY ENFORCEMENT</h2>
          <p className="force-password-desc">
            You are using a temporary or first-time password. You must update your password to continue.
          </p>
          
          <form className="force-password-form" onSubmit={handleForceChangePassword}>
            <label>
              New Password
              <input
                type="password"
                className="force-password-input"
                placeholder="Enter new secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                className="force-password-input"
                placeholder="Confirm secure password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
            
            {error && <p className="error-message" style={{ margin: 0, color: "var(--marvel-red)" }}>{error}</p>}
            
            <button className="btn force-password-submit-btn" disabled={submitting}>
              {submitting ? "UPDATING PROTOCOL..." : "SAVE & AUTHORIZE"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
