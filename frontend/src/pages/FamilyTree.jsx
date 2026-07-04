import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./FamilyTree.css";

export default function FamilyTree() {
  const { user: me, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Currently focused user in tree visualizer
  const [focusUser, setFocusUser] = useState(null);
  const navigate = useNavigate();

  function loadData() {
    client
      .get("/users")
      .then((res) => {
        setUsers(res.data);
        const myData = res.data.find((u) => u.id === me?.id);
        if (!focusUser) {
          setFocusUser(myData || res.data.find((u) => u.is_leader) || res.data[0]);
        } else {
          const updatedFocus = res.data.find((u) => u.id === focusUser.id);
          if (updatedFocus) setFocusUser(updatedFocus);
        }
      })
      .catch(() => setError("Failed to fetch crew database."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [relationModal, setRelationModal] = useState(null);
  const [inputName, setInputName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [savingRelation, setSavingRelation] = useState(false);

  const handleCircleClick = (e, slot) => {
    e.stopPropagation();
    if (focusUser?.id !== me?.id) {
      alert("Only the agent themselves can edit their family tree.");
      return;
    }
    setRelationModal({ slot });
    setInputName(focusUser[`${slot}_name`] || "");
    setSelectedFile(null);
  };

  const handleSaveRelation = async () => {
    if (!relationModal) return;
    setSavingRelation(true);
    const slot = relationModal.slot;

    try {
      const namePayload = {
        [`${slot}_name`]: inputName || ""
      };
      const res = await client.put("/users/me/custom-family", namePayload);

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await client.post(`/users/me/custom-family/photo?slot=${slot}`, formData);
        refreshUser(uploadRes.data);
      } else {
        refreshUser(res.data);
      }

      setRelationModal(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update family member.");
    } finally {
      setSavingRelation(false);
    }
  };

  if (loading) return <div className="page empty-state">Accessing lineage channels…</div>;
  if (error) return <div className="page empty-state">{error}</div>;

  const relativeCandidates = users.filter((u) => u.id !== me?.id);

  // Focus node parents
  const father = users.find((u) => u.id === focusUser?.father_id);
  const mother = users.find((u) => u.id === focusUser?.mother_id);
  const spouse = users.find((u) => u.id === focusUser?.spouse_id);

  // Focus node grandparents (Tier 1)
  const paternalGrandfather = users.find((u) => u.id === father?.father_id);
  const paternalGrandmother = users.find((u) => u.id === father?.mother_id);
  const maternalGrandfather = users.find((u) => u.id === mother?.father_id);
  const maternalGrandmother = users.find((u) => u.id === mother?.mother_id);

  // Direct children of focused user
  const children = users.filter(
    (u) => u.father_id === focusUser?.id || u.mother_id === focusUser?.id
  );

  // Siblings of focused user
  const siblings = users.filter(
    (u) =>
      u.id !== focusUser?.id &&
      ((focusUser?.father_id && u.father_id === focusUser.father_id) ||
        (focusUser?.mother_id && u.mother_id === focusUser.mother_id))
  );

  return (
    <div className="page family-tree-container">
      {/* Pending Approval Notifications Banner */}
      {/* Page Header */}
      <div className="family-tree-header">
        <span className="eyebrow">Dossier Linkage Interface</span>
        <h1>CYBERNETIC LINEAGE SYSTEM</h1>
        <p className="muted">Map your connections and explore the network's relational database links.</p>
      </div>

      <div className="family-tree-layout">
        {/* Left Column: Agent Index */}
        <div className="family-left-panel">

          {/* Agent Directory */}
          <div className="card roster-select-card">
            <h2>Agent Directory</h2>
            <p className="muted">Select any agent profile to load their tree structure.</p>
            <div className="roster-list-scroll">
              {users.map((u) => (
                <button
                  key={u.id}
                  className={`roster-select-btn ${focusUser?.id === u.id ? "active" : ""}`}
                  onClick={() => setFocusUser(u)}
                >
                  <div className="roster-btn-avatar">
                    {u.photo_url ? (
                      <img src={u.photo_url} alt={u.nickname} />
                    ) : (
                      <span>{u.nickname[0]}</span>
                    )}
                  </div>
                  <div className="roster-btn-info">
                    <span className="roster-btn-nick">{u.nickname}</span>
                    <span className="roster-btn-code">
                      {u.is_leader ? "BOSS-01" : `AGT-${((u.id * 17) % 90 + 10)}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Hierarchy Roster Chart */}
        <div className="family-right-panel">
          <div className="card tree-viewport-card">
            <div className="viewport-header">
              <span className="node-indicator">DIAGRAM EXPLORER ACTIVE</span>
              <h3>Tree Visualizer: {focusUser?.nickname}</h3>
            </div>

            <div className="tree-explorer circular-tree-theme">
              {/* TIER 1: Grandparents (4 Nodes) */}
              <div className="tree-tier grandparents-tier-circular">
                <div className="grandparent-pair">
                  <div className="node-group">
                    <span className="sub-label">FATHER'S FATHER</span>
                    {focusUser?.father_father_name ? (
                      <div className="circle-node" onClick={(e) => handleCircleClick(e, "father_father")}>
                        {focusUser.father_father_photo ? (
                          <img src={focusUser.father_father_photo} alt={focusUser.father_father_name} />
                        ) : (
                          <span className="circle-placeholder">+</span>
                        )}
                        <h4>{focusUser.father_father_name}</h4>
                      </div>
                    ) : (
                      <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "father_father")}>
                        <span className="circle-placeholder">+</span>
                        <h4>UNKNOWN</h4>
                      </div>
                    )}
                  </div>
                  <div className="node-group">
                    <span className="sub-label">FATHER'S MOTHER</span>
                    {focusUser?.father_mother_name ? (
                      <div className="circle-node" onClick={(e) => handleCircleClick(e, "father_mother")}>
                        {focusUser.father_mother_photo ? (
                          <img src={focusUser.father_mother_photo} alt={focusUser.father_mother_name} />
                        ) : (
                          <span className="circle-placeholder">+</span>
                        )}
                        <h4>{focusUser.father_mother_name}</h4>
                      </div>
                    ) : (
                      <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "father_mother")}>
                        <span className="circle-placeholder">+</span>
                        <h4>UNKNOWN</h4>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grandparent-pair">
                  <div className="node-group">
                    <span className="sub-label">MOTHER'S FATHER</span>
                    {focusUser?.mother_father_name ? (
                      <div className="circle-node" onClick={(e) => handleCircleClick(e, "mother_father")}>
                        {focusUser.mother_father_photo ? (
                          <img src={focusUser.mother_father_photo} alt={focusUser.mother_father_name} />
                        ) : (
                          <span className="circle-placeholder">+</span>
                        )}
                        <h4>{focusUser.mother_father_name}</h4>
                      </div>
                    ) : (
                      <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "mother_father")}>
                        <span className="circle-placeholder">+</span>
                        <h4>UNKNOWN</h4>
                      </div>
                    )}
                  </div>
                  <div className="node-group">
                    <span className="sub-label">MOTHER'S MOTHER</span>
                    {focusUser?.mother_mother_name ? (
                      <div className="circle-node" onClick={(e) => handleCircleClick(e, "mother_mother")}>
                        {focusUser.mother_mother_photo ? (
                          <img src={focusUser.mother_mother_photo} alt={focusUser.mother_mother_name} />
                        ) : (
                          <span className="circle-placeholder">+</span>
                        )}
                        <h4>{focusUser.mother_mother_name}</h4>
                      </div>
                    ) : (
                      <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "mother_mother")}>
                        <span className="circle-placeholder">+</span>
                        <h4>UNKNOWN</h4>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector from Grandparents down to Parents */}
              <div className="split-connector-line"></div>

              {/* TIER 2: Parents (2 Nodes) */}
              <div className="tree-tier parents-tier-circular">
                <div className="node-group">
                  <span className="sub-label">FATHER</span>
                  {focusUser?.father_name ? (
                    <div className="circle-node" onClick={(e) => handleCircleClick(e, "father")}>
                      {focusUser.father_photo ? (
                        <img src={focusUser.father_photo} alt={focusUser.father_name} />
                      ) : (
                        <span className="circle-placeholder">+</span>
                      )}
                      <h4>{focusUser.father_name}</h4>
                    </div>
                  ) : (
                    <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "father")}>
                      <span className="circle-placeholder">+</span>
                      <h4>UNKNOWN</h4>
                    </div>
                  )}
                </div>

                <div className="parents-bridge-connector"></div>

                <div className="node-group">
                  <span className="sub-label">MOTHER</span>
                  {focusUser?.mother_name ? (
                    <div className="circle-node" onClick={(e) => handleCircleClick(e, "mother")}>
                      {focusUser.mother_photo ? (
                        <img src={focusUser.mother_photo} alt={focusUser.mother_name} />
                      ) : (
                        <span className="circle-placeholder">+</span>
                      )}
                      <h4>{focusUser.mother_name}</h4>
                    </div>
                  ) : (
                    <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "mother")}>
                      <span className="circle-placeholder">+</span>
                      <h4>UNKNOWN</h4>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector from Parents down to Center Node */}
              <div className="single-connector-line-vertical"></div>

              {/* TIER 3: Center Node & Spouse (and Siblings) */}
              <div className="tree-tier focus-tier-circular">
                {/* Siblings column (render to the left if any) */}
                {siblings.length > 0 && (
                  <div className="siblings-sidebar-cluster">
                    <span className="side-cluster-title">SIBLINGS</span>
                    <div className="siblings-cluster-nodes">
                      {siblings.slice(0, 2).map((sib) => (
                        <div key={sib.id} className="circle-node sibling-mini" onClick={() => setFocusUser(sib)} title={sib.nickname}>
                          {sib.photo_url ? (
                            <img src={sib.photo_url} alt={sib.nickname} />
                          ) : (
                            <span className="circle-placeholder">{sib.nickname[0]}</span>
                          )}
                          <h4>{sib.nickname}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Focus Target Agent */}
                <div className="node-group focus-agent-group">
                  <span className="sub-label active">FOCUS AGENT</span>
                  <div className="circle-node focus-circle" onClick={() => navigate(`/friends/${focusUser?.id}`)}>
                    {focusUser?.photo_url ? (
                      <img src={focusUser.photo_url} alt={focusUser.nickname} />
                    ) : (
                      <span className="circle-placeholder">{focusUser?.nickname[0]}</span>
                    )}
                    <h4>{focusUser?.nickname}</h4>
                    <span className="agent-code-tag">
                      {focusUser?.is_leader ? "BOSS-01" : `AGT-${((focusUser?.id * 17) % 90 + 10)}`}
                    </span>
                  </div>
                </div>

                {focusUser?.spouse_name ? (
                  <div className="node-group spouse-agent-group">
                    <span className="sub-label">SPOUSE</span>
                    <div className="circle-node" onClick={(e) => handleCircleClick(e, "spouse")}>
                      {focusUser.spouse_photo ? (
                        <img src={focusUser.spouse_photo} alt={focusUser.spouse_name} />
                      ) : (
                        <span className="circle-placeholder">+</span>
                      )}
                      <h4>{focusUser.spouse_name}</h4>
                    </div>
                  </div>
                ) : (
                  <div className="node-group spouse-agent-group empty">
                    <span className="sub-label">SPOUSE</span>
                    <div className="circle-node empty" onClick={(e) => handleCircleClick(e, "spouse")}>
                      <span className="circle-placeholder">+</span>
                      <h4>NONE RECORDED</h4>
                    </div>
                  </div>
                )}
              </div>

              {/* Connector from Center Node down to Children */}
              {children.length > 0 && <div className="single-connector-line-vertical"></div>}

              {/* TIER 4: Children */}
              {children.length > 0 && (
                <div className="tree-tier children-tier-circular">
                  {children.map((child) => (
                    <div key={child.id} className="node-group">
                      <span className="sub-label">CHILD</span>
                      <div className="circle-node" onClick={() => setFocusUser(child)}>
                        {child.photo_url ? (
                          <img src={child.photo_url} alt={child.nickname} />
                        ) : (
                          <span className="circle-placeholder">{child.nickname[0]}</span>
                        )}
                        <h4>{child.nickname}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {relationModal && (
        <div className="relation-modal-backdrop" onClick={() => setRelationModal(null)}>
          <div className="relation-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update {relationModal.slot.replace("_", "'s ").toUpperCase()}</h3>
              <button className="close-btn" onClick={() => setRelationModal(null)}>&times;</button>
            </div>
            
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "15px 0 10px 0" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Relation Name</span>
              <input
                type="text"
                placeholder="Enter name"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  padding: "10px",
                  borderRadius: "4px",
                  fontFamily: "inherit"
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "10px 0 20px 0" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Relation Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.9rem"
                }}
              />
            </label>

            <div className="relation-modal-actions" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn small" onClick={handleSaveRelation} disabled={savingRelation}>
                {savingRelation ? "Saving..." : "Save Member"}
              </button>
              <button className="btn ghost small" onClick={() => setRelationModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
