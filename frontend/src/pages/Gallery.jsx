import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import MediaLightbox from "../components/MediaLightbox";
import "./Gallery.css";

const DEFAULT_CATEGORIES = ["Hangout", "Self Love", "Chakkas Nude", "Gays"];

export default function Gallery() {
  const [photos, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("Hangout");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [uploading, setUploading] = useState(false);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Global Lightbox State
  const [lightbox, setLightbox] = useState({ show: false, url: "", type: "" });

  // System Storage limits (Super User Alert features)
  const [storage, setStorage] = useState(null);
  const [purgeAmount, setPurgeAmount] = useState(25);
  
  const fileRef = useRef(null);
  const { user } = useAuth();

  function load() {
    client
      .get("/gallery")
      .then((res) => {
        setPosts(res.data);
        const uploadedCats = Array.from(new Set(res.data.map((p) => p.category).filter(Boolean)));
        const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...uploadedCats]));
        setCategories(combined);
      })
      .catch((err) => console.error("Failed to load gallery:", err))
      .finally(() => setLoading(false));
  }

  function loadStorage() {
    if (user?.is_leader) {
      client
        .get("/admin/storage")
        .then((res) => setStorage(res.data))
        .catch((err) => console.error("Failed to load storage status:", err));
    }
  }

  useEffect(() => {
    load();
    loadStorage();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const finalCategory = showCustomInput ? customCategory.trim() : selectedCategory;
    if (!finalCategory) {
      alert("Please select or enter a category.");
      return;
    }

    setUploading(true);
    try {
      const fileBaseName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
      const finalCaption = caption.trim() || fileBaseName;

      const data = new FormData();
      data.append("file", file);
      data.append("caption", finalCaption);
      data.append("category", finalCategory);

      await client.post("/gallery", data);
      
      setCaption("");
      setCustomCategory("");
      setShowCustomInput(false);
      setSelectedCategory("Hangout");
      if (fileRef.current) fileRef.current.value = "";
      load();
      loadStorage();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePurgeStorage() {
    triggerConfirm(
      "CONFIRM SYSTEM PURGE",
      `Are you sure you want to permanently delete the oldest ${purgeAmount}% of media files from the database and storage?`,
      async () => {
        try {
          await client.post("/admin/storage/purge", { purge_percent: purgeAmount });
          loadStorage();
          load();
        } catch (err) {
          console.error("Purge error:", err);
          alert("Failed to purge storage");
        }
      }
    );
  }

  // Deletion logic with custom confirmation modals
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

  async function handleDeleteConfirmed(id) {
    try {
      await client.delete(`/gallery/${id}`);
      load();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  async function handleDeleteCategoryConfirmed(catName) {
    try {
      await client.delete(`/gallery/categories/${encodeURIComponent(catName)}`);
      if (activeFilter === catName) {
        setActiveFilter("All");
      }
      load();
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("Could not delete category.");
    }
  }

  function handleCategorySelection(e) {
    const val = e.target.value;
    if (val === "CUSTOM_OPTION") {
      setShowCustomInput(true);
      setSelectedCategory("");
    } else {
      setShowCustomInput(false);
      setSelectedCategory(val);
    }
  }

  const isVideo = (url) => {
    if (!url) return false;
    const ext = url.split(".").pop().toLowerCase();
    return ["mp4", "webm", "mov", "ogg", "m4v"].includes(ext);
  };

  const filteredPhotos = activeFilter === "All"
    ? photos
    : photos.filter((p) => p.category === activeFilter);

  return (
    <div className="page gallery-page-container">
      <span className="eyebrow">Shared Gallery</span>
      <h1>Group Photos & Videos</h1>
      <p className="muted">Drop a photo, video, meme, or inside joke. Categorize and filter shared media below.</p>

      {/* Storage Alert & Purge Controls for Super User (Leader) */}
      {user.is_leader && storage && storage.is_critical && (
        <div className="storage-warning-banner card">
          <div className="warning-header">
            <span className="warning-title">⚠️ SYSTEM ALERT: STORAGE SPACE CRITICAL ({storage.percent_used}% FULL)</span>
            <span className="warning-stats">{Math.round(storage.used_bytes / (1024 * 1024))}MB / {Math.round(storage.max_bytes / (1024 * 1024))}MB</span>
          </div>
          <p className="warning-text">
            The server's secure media storage is nearly full. To prevent upload failures, purge a percentage of the oldest media files:
          </p>
          <div className="warning-actions">
            <label className="purge-label">
              PURGE TARGET:
              <select 
                value={purgeAmount} 
                onChange={(e) => setPurgeAmount(Number(e.target.value))}
                className="purge-select"
              >
                <option value={10}>Oldest 10%</option>
                <option value={25}>Oldest 25% (Recommended)</option>
                <option value={50}>Oldest 50%</option>
                <option value={75}>Oldest 75%</option>
              </select>
            </label>
            <button className="btn warning-purge-btn" onClick={handlePurgeStorage}>
              RUN STORAGE PURGE
            </button>
          </div>
        </div>
      )}

      {/* Upload Form Wrapper */}
      <form className="card gallery-upload-form" onSubmit={handleUpload}>
        <div className="form-row">
          <input 
            type="file" 
            accept="image/*,video/*" 
            ref={fileRef} 
            required 
            className="file-input"
          />
          <input
            type="text"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="caption-input"
          />
        </div>

        <div className="form-row category-selector-row">
          <div className="select-container">
            <label className="field-label">Category (Optional - Defaults to Hangout)</label>
            <select 
              value={showCustomInput ? "CUSTOM_OPTION" : selectedCategory} 
              onChange={handleCategorySelection}
              className="category-select"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {/* Render existing custom categories in the select dropdown */}
              {categories.filter(cat => !DEFAULT_CATEGORIES.includes(cat)).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="CUSTOM_OPTION">+ Add custom category...</option>
            </select>
          </div>

          {showCustomInput && (
            <div className="custom-input-container">
              <label className="field-label">Custom Category (Optional, Max 20 Chars)</label>
              <input
                type="text"
                placeholder="Enter new category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                className="custom-category-input"
                maxLength={20}
              />
            </div>
          )}

          <button className="btn gallery-post-btn" disabled={uploading}>
            {uploading ? "Uploading Dossier…" : "POST TO GALLERY"}
          </button>
        </div>
      </form>

      {/* Category Filter Tabs */}
      <div className="gallery-filter-tabs">
        <button
          className={`filter-tab-btn ${activeFilter === "All" ? "active" : ""}`}
          onClick={() => setActiveFilter("All")}
        >
          ALL MEDIA
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-tab-btn ${activeFilter === cat ? "active" : ""}`}
            onClick={() => setActiveFilter(cat)}
          >
            {cat.toUpperCase()}
            {user.is_leader && cat !== "Hangout" && (
              <span
                className="delete-category-x"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerConfirm(
                    "DELETE CATEGORY",
                    `Are you sure you want to delete category "${cat}"? This will reset all matching gallery items back to the default "Hangout" category.`,
                    () => handleDeleteCategoryConfirmed(cat)
                  );
                }}
                title={`Delete category "${cat}"`}
              >
                ✕
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="empty-state">Decrypting shared archive…</div>
      ) : filteredPhotos.length === 0 ? (
        <div className="empty-state">No media files in category: "{activeFilter.toUpperCase()}"</div>
      ) : (
        <div className="gallery-grid">
          {filteredPhotos.map((p) => (
            <figure className="gallery-item-card" key={p.id}>
              <div className="media-container">
                {isVideo(p.url) ? (
                  <div className="gallery-video-wrapper cursor-pointer" onClick={() => setLightbox({ show: true, url: p.url, type: "video" })}>
                    <video src={`${p.url}#t=0.1`} preload="metadata" className="gallery-video" />
                    <div className="media-play-overlay">▶</div>
                  </div>
                ) : (
                  <img src={p.url} alt={p.caption || "gallery item"} className="gallery-image cursor-pointer" onClick={() => setLightbox({ show: true, url: p.url, type: "image" })} />
                )}
                <span className="gallery-item-tag">{p.category}</span>
              </div>
              <figcaption className="gallery-item-meta">
                <p className="caption-text">{p.caption || (isVideo(p.url) ? "Shared Video" : "Shared Photo")}</p>
                <div className="meta-footer">
                  <span className="uploader-name">by {p.uploader.nickname}</span>
                  {(p.uploader.id === user.id || user.is_leader) && (
                    <button 
                      className="gallery-delete-btn" 
                      onClick={() => triggerConfirm(
                        "DELETE MEDIA ITEM",
                        "Are you sure you want to permanently delete this media file from the shared gallery?",
                        () => handleDeleteConfirmed(p.id)
                      )}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </figcaption>
            </figure>
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
