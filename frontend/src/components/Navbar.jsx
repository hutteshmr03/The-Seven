import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./Navbar.css";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/gallery", label: "Gallery" },
  { to: "/timeline", label: "Timeline" },
  { to: "/board", label: "Chat & Chill" },
  { to: "/polls", label: "Polls" },
  { to: "/family-tree", label: "Family Tree" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="nav-brand">
          THE <span>SEVEN</span>
        </NavLink>
        <nav className="nav-links">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
          {user.is_leader && (
            <NavLink to="/admin" className="nav-link nav-link-admin">
              + Add Friend
            </NavLink>
          )}
        </nav>
        <div className="nav-user">
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          
          <NavLink to={`/friends/${user.id}`} className="nav-user-chip">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.nickname} />
            ) : (
              <span className="nav-user-initial">{user.nickname[0]}</span>
            )}
            <span>{user.nickname}</span>
          </NavLink>
          <button
            className="btn ghost small navbar-logout-btn"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
