import { useEffect, useState } from "react";
import FriendCard from "../components/FriendCard";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

export default function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const [searchTerm, setSearchTerm] = useState("");
  const [clearanceFilter, setClearanceFilter] = useState("ALL");
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  function loadHistory() {
    setHistoryLoading(true);
    client
      .get("/timeline")
      .then((res) => {
        // Sort timeline items chronologically (descending event_date)
        const sorted = res.data.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
        setHistory(sorted);
      })
      .catch((err) => console.error("Failed to load operations history:", err))
      .finally(() => setHistoryLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Fetch operations history when clicking the HISTORY tab
  useEffect(() => {
    if (activeTab === "HISTORY" && history.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  // Simulated holographic terminal logs for the Leader Dossier
  useEffect(() => {
    if (loading || error) return;
    
    const logs = [
      "INITIALIZING SECURE PROTOCOL CHANNEL...",
      "USER IDENTITY ACCESS GRANTED: LEADER LEVEL 07",
      "SYNCING ROSTER DOSSIERS WITH REMOTE ENCRYPTED HOST...",
      "DATABASE INTEGRITY CHECK: SECURE [100% OK]",
      "TACTICAL SYSTEM ENGAGED. MONITORING LOGGED CHANNELS...",
      "WARN: UNAUTHORIZED INTRUSION ATTEMPTS BLOCKED BY FIREWALL",
      "SYSTEM STATUS: ONLINE. DIRECTIVES OPERATIONAL."
    ];
    
    let currentIdx = 0;
    setTerminalLogs([`[08:00:12 AM] ${logs[0]}`]);
    currentIdx++;

    const interval = setInterval(() => {
      if (currentIdx < logs.length) {
        const time = new Date().toLocaleTimeString();
        setTerminalLogs((prev) => [...prev, `[${time}] ${logs[currentIdx]}`]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [loading, error]);

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
          // Reload history in case their actions were wiped
          if (activeTab === "HISTORY" || history.length > 0) {
            loadHistory();
          }
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

  // Filter crew list based on search and clearance level
  const filteredFriends = friends.filter((f) => {
    const matchesSearch = 
      f.nickname.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (f.full_name && f.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const clearanceLevel = `0${(f.id % 6) + 1}`;
    const matchesClearance = clearanceFilter === "ALL" || clearanceLevel === clearanceFilter;
    
    return matchesSearch && matchesClearance;
  });

  // Format date utility for timeline history
  const formatDate = (dateStr) => {
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="page home-page-container">
      {/* Marvel Avengers-Style Hero Header */}
      <div className="marvel-hero-header">
        <div className="hero-header-overlay"></div>
        <div className="hero-header-content">
          <div className="marvel-red-badge">DATABASE STATUS: ACTIVE</div>
          <h1 className="marvel-title">THE SEVEN</h1>
          <p className="marvel-tagline">
            VOUGHT'S PREMIER OPERATIONAL CREW. SYSTEM INTEGRITY NODE SECURED.
          </p>
        </div>
      </div>

      {/* Marvel-Style Sub-Navigation Tab Bar */}
      <nav className="marvel-sub-nav">
        <button 
          className={`nav-tab-btn ${activeTab === "OVERVIEW" ? "active" : ""}`}
          onClick={() => setActiveTab("OVERVIEW")}
        >
          OVERVIEW
        </button>
        <button 
          className={`nav-tab-btn ${activeTab === "ROSTER" ? "active" : ""}`}
          onClick={() => setActiveTab("ROSTER")}
        >
          FULL ROSTER
        </button>
        <button 
          className={`nav-tab-btn ${activeTab === "HISTORY" ? "active" : ""}`}
          onClick={() => setActiveTab("HISTORY")}
        >
          MISSION LOGS
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="tab-panel-container">
        
        {/* OVERVIEW PANEL */}
        {activeTab === "OVERVIEW" && (
          <div className="tab-panel overview-panel anim-fade-in">
            {/* Asymmetric Dossier Summary Text */}
            <div className="overview-hero-row">
              <div className="overview-bio-card card">
                <h2>DECRYPTED COMMAND BRIEFING</h2>
                <p>
                  Established by Vought International, **The Seven** represents the apex of corporate meta-human operations. 
                  This secure portal serves as the unified node for accessing classified crew rosters, sharing operational media logs, 
                  scheduling mission timelines, and initiating team votes. 
                </p>
                <p>
                  Only the **Group Leader** holds level 07 clearance, enabling the authorization and commissioning of new agent dossiers. 
                  All other members maintain restricted access profiles bound by their assigned clearance keys.
                </p>
              </div>

              {/* Stats Widgets Inline */}
              <div className="overview-stats-column">
                <div className="telemetry-card">
                  <span className="telemetry-label">ROSTER INTEGRITY</span>
                  <div className="telemetry-value-wrap">
                    <span className="telemetry-value text-glow-red">99.8%</span>
                    <span className="telemetry-badge secure">SECURED</span>
                  </div>
                  <div className="telemetry-progress-bg">
                    <div className="telemetry-progress-fill red" style={{ width: "99.8%" }}></div>
                  </div>
                </div>
                <div className="telemetry-card">
                  <span className="telemetry-label">ACTIVE DOSSIERS</span>
                  <div className="telemetry-value-wrap">
                    <span className="telemetry-value">{users.length}</span>
                    <span className="telemetry-unit">FILES</span>
                  </div>
                </div>
                <div className="telemetry-card">
                  <span className="telemetry-label">OPERATIONAL NETWORK</span>
                  <div className="telemetry-value-wrap">
                    <span className="telemetry-value text-glow-green">ONLINE</span>
                    <span className="telemetry-badge active">LIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Asymmetric Leader Terminal Dossier */}
            {leader && (
              <div className="leader-section-outer">
                <div className="leader-terminal-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                  <span className="terminal-title">LEADER_DOSSIER.SH // CLEARANCE LEVEL 07</span>
                </div>
                <div className="leader-section card">
                  <div className="leader-spotlight">
                    <div className="leader-card-wrap">
                      <FriendCard friend={leader} big />
                    </div>
                    <div className="leader-bio-teaser">
                      <div className="dossier-header-row">
                        <span className="eyebrow-red">FEATURED LEADER</span>
                        <span className="dossier-id">[CLASSIFIED ID: BOSS-01]</span>
                      </div>
                      <h1 className="leader-title">{leader.nickname}</h1>
                      {leader.full_name && <p className="leader-fullname">{leader.full_name}</p>}
                      
                      <div className="cyber-divider"></div>

                      <p className="leader-desc">
                        {leader.about_me || "Directing operations here at The Seven HQ."}
                      </p>

                      <div className="cyber-divider"></div>

                      {/* Simulated Holographic Log Window */}
                      <div className="terminal-log-window">
                        <div className="log-window-header">ACTIVE CONSOLE LOGS</div>
                        <div className="log-window-body">
                          {terminalLogs.map((log, index) => (
                            <div className="log-line" key={index}>
                              <span className="log-arrow">&gt;</span> {log}
                            </div>
                          ))}
                          <div className="log-line log-cursor-line">
                            <span className="log-arrow">&gt;</span> <span className="terminal-cursor">_</span>
                          </div>
                        </div>
                      </div>

                      <div className="dossier-footer-row">
                        <span className="dossier-badge">SYS CLEARANCE LEVEL: MAXIMUM</span>
                        <span className="dossier-status text-glow-green">STATUS: ACTIVE / DECRYPTED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROSTER PANEL */}
        {activeTab === "ROSTER" && (
          <div className="tab-panel roster-panel anim-fade-in">
            {/* Search and Filters Section */}
            <div className="tactical-search-panel">
              <div className="search-bracket top-left"></div>
              <div className="search-bracket top-right"></div>
              <div className="search-bracket bottom-left"></div>
              <div className="search-bracket bottom-right"></div>
              
              <div className="panel-header">
                <span className="panel-title">FILTER CHANNELS</span>
              </div>
              
              <div className="filters-row">
                <div className="search-box-wrap">
                  <label className="field-label">Search Crew</label>
                  <div className="search-input-inner">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Enter character name or nickname..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="cyber-input"
                    />
                  </div>
                </div>
                
                <div className="filter-dropdown-wrap">
                  <label className="field-label">Clearance Level</label>
                  <select
                    value={clearanceFilter}
                    onChange={(e) => setClearanceFilter(e.target.value)}
                    className="cyber-select"
                  >
                    <option value="ALL">ALL CLEARANCES</option>
                    <option value="01">LEVEL 01</option>
                    <option value="02">LEVEL 02</option>
                    <option value="03">LEVEL 03</option>
                    <option value="04">LEVEL 04</option>
                    <option value="05">LEVEL 05</option>
                    <option value="06">LEVEL 06</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Featured Characters Headline */}
            <div className="featured-characters-header">
              <h2>DATABASE DOSSIERS</h2>
              <span className="results-count">MATCHES: {filteredFriends.length}</span>
            </div>

            {/* Friends Cards Grid */}
            {filteredFriends.length === 0 ? (
              <div className="empty-state">
                No records match the current filters. Clear your query or add a new friend.
              </div>
            ) : (
              <div className="friends-grid">
                {filteredFriends.map((f) => (
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
          </div>
        )}

        {/* MISSION LOGS PANEL (HISTORY) */}
        {activeTab === "HISTORY" && (
          <div className="tab-panel history-panel anim-fade-in">
            <div className="featured-characters-header">
              <h2>MISSION CHRONICLES</h2>
              <span className="results-count">LOGS RECORDED: {history.length}</span>
            </div>

            {historyLoading ? (
              <div className="empty-state">Decrypting operational archive...</div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                No missions or activities logged in the database yet. Add events via the "Timeline" tab.
              </div>
            ) : (
              <div className="history-logs-list">
                {history.map((m) => (
                  <div className="history-log-card card" key={m.id}>
                    <div className="log-badge-row">
                      <span className="log-date">{formatDate(m.event_date)}</span>
                      {m.location && <span className="log-location">📍 {m.location}</span>}
                    </div>
                    
                    <h3 className="log-title">{m.title}</h3>
                    
                    {m.description && <p className="log-desc">{m.description}</p>}
                    
                    {m.photo_url && (
                      <div className="log-image-preview-wrap">
                        <img src={m.photo_url} alt={m.title} className="log-image-preview" loading="lazy" />
                      </div>
                    )}
                    
                    <div className="log-footer">
                      <span className="log-author">FILED BY: {m.author.nickname.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

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
