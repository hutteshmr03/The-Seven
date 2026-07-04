import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import MediaLightbox from "../components/MediaLightbox";
import "./Board.css";

const EMOJI_CATEGORIES = {
  "Smilies": [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", 
    "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", 
    "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", 
    "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", 
    "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", 
    "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", 
    "🤫", "🤥", "😶", "😐", "😑", "😬", "🫠", "🙄", "😯", "😴"
  ],
  "Gestures": [
    "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", 
    "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", 
    "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", 
    "🙏", "✍️", "💅", "🤳", "💪", "👀", "👁️", "👅", "👄", "💋"
  ],
  "Hearts": [
    "❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🖤", "🩶", 
    "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", 
    "💖", "💘", "💝", "💟"
  ],
  "Party & Food": [
    "🎉", "✨", "🔥", "👑", "🍕", "🍔", "🍟", "🌭", "🍿", "🍩", 
    "🍪", "🎂", "🍫", "🍬", "🍭", "🍨", "🍺", "🍻", "🥂", "🍷", 
    "🥃", "☕", "🎮", "⚽", "🏀", "🏈", "⚾", "🎾", "🎱", "🎯"
  ]
};

const CATEGORY_ICONS = {
  "Smilies": "😊",
  "Gestures": "👍",
  "Hearts": "❤️",
  "Party & Food": "🎉"
};

export default function Board() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  // Attachment states
  const [attachedUrl, setAttachedUrl] = useState(null);
  const [attachedType, setAttachedType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Smilies");
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Global Media Lightbox State
  const [lightbox, setLightbox] = useState({ show: false, url: "", type: "" });

  // WhatsApp-like Location states
  const [sharingLocation, setSharingLocation] = useState(false);

  // WhatsApp-like Voice recording states
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  function load() {
    client
      .get("/board")
      .then((res) => {
        setPosts(res.data);
      })
      .catch((err) => console.error("Couldn't load chat:", err))
      .finally(() => setLoading(false));
  }

  // Poll for new messages every 3 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom whenever posts load/change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  // Click outside listener to close emoji picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!content.trim() && !attachedUrl) return;
    setSubmitting(true);
    try {
      await client.post("/board", {
        content: content.trim(),
        media_url: attachedUrl,
        media_type: attachedType,
      });
      setContent("");
      setAttachedUrl(null);
      setAttachedType(null);
      load();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await client.post("/board/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachedUrl(res.data.url);
      setAttachedType(res.data.media_type);
    } catch (err) {
      setUploadError(err.response?.data?.detail || "File upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await client.delete(`/board/${id}`);
      load();
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  }

  function handleEmojiClick(emoji) {
    setContent((prev) => prev + emoji);
  }

  // Location Sharing Handler
  function handleShareLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await client.post("/board", {
            content: "Shared Location",
            media_url: `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`,
            media_type: "location",
          });
          load();
        } catch (err) {
          console.error("Failed to share location:", err);
          alert("Couldn't upload location coordinates.");
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        console.error("Location error:", error);
        alert("Failed to access your location. Ensure permissions are allowed.");
        setSharingLocation(false);
      }
    );
  }

  // Voice Note Recording Handlers
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const file = new File([audioBlob], "voice-note.wav", { type: "audio/wav" });

        setSubmitting(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await client.post("/board/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          await client.post("/board", {
            content: "",
            media_url: res.data.url,
            media_type: "audio",
          });
          load();
        } catch (err) {
          console.error("Failed to upload voice note:", err);
          alert("Voice note upload failed.");
        } finally {
          setSubmitting(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Allow permission.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  }

  function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  }

  return (
    <div className="page chat-page-container">
      <div className="chat-header">
        <span className="eyebrow">Secure Transmissions</span>
        <h1>Chat & Chill</h1>
        <p className="muted">Group comms channel for The Seven. Emojis, files, voice notes, and locations supported.</p>
      </div>

      <div className="chat-window card">
        <div className="chat-messages-area">
          {loading && posts.length === 0 ? (
            <div className="empty-state">Decrypting channel logs…</div>
          ) : posts.length === 0 ? (
            <div className="empty-state">Channel empty. Send the first secure transmission.</div>
          ) : (
            posts.map((p) => {
              const isOwn = p.author.id === user.id;
              return (
                <div key={p.id} className={`chat-message-row ${isOwn ? "own" : "others"}`}>
                  <div className="chat-message-container">
                    {!isOwn && <span className="chat-message-author">{p.author.nickname}</span>}
                    <div className="chat-message-bubble">
                      {p.media_url && (
                        <div className="chat-message-media">
                          {p.media_type === "video" ? (
                            <div className="chat-media-video-wrapper cursor-pointer" onClick={() => setLightbox({ show: true, url: p.media_url, type: "video" })}>
                              <video src={`${p.media_url}#t=0.1`} preload="metadata" className="chat-media-video" />
                              <div className="media-play-overlay">▶</div>
                            </div>
                          ) : p.media_type === "audio" ? (
                            <div className="chat-audio-wrapper cursor-pointer" onClick={() => setLightbox({ show: true, url: p.media_url, type: "audio" })}>
                              <audio src={p.media_url} className="chat-audio-player" onClick={(e) => e.stopPropagation()} />
                              <span className="audio-lightbox-hint">🔍 VIEW FULLSCREEN PLAYER</span>
                            </div>
                          ) : p.media_type === "location" ? (
                            <div className="location-media">
                              <iframe
                                title="Shared Location Map"
                                src={p.media_url}
                                width="100%"
                                height="200"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                              />
                              <a href={p.media_url.replace("&output=embed", "")} target="_blank" rel="noopener noreferrer" className="location-link-btn">
                                📍 View Maps Location
                              </a>
                            </div>
                          ) : (
                            <img src={p.media_url} alt="Uploaded attachment" className="chat-media-image cursor-pointer" onClick={() => setLightbox({ show: true, url: p.media_url, type: "image" })} />
                          )}
                        </div>
                      )}
                      {p.content && <p className="chat-message-text">{p.content}</p>}
                    </div>
                    <div className="chat-message-meta">
                      <span>{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {user.is_leader && (
                        <button className="chat-delete-btn" onClick={() => handleDelete(p.id)} title="Delete message">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Attachment preview bar */}
        {(attachedUrl || uploading || uploadError) && (
          <div className="chat-attachment-preview-bar">
            {uploading && <span className="upload-loader">Uploading attachment dossier…</span>}
            {uploadError && <span className="upload-error-text">⚠️ {uploadError}</span>}
            {attachedUrl && (
              <div className="attachment-preview">
                {attachedType === "video" ? (
                  <span className="attachment-tag">🎥 Video Ready</span>
                ) : attachedType === "audio" ? (
                  <span className="attachment-tag">🎵 Voice Note Ready</span>
                ) : (
                  <img src={attachedUrl} alt="Upload preview" className="attachment-thumb" />
                )}
                <button className="cancel-attachment-btn" onClick={() => { setAttachedUrl(null); setAttachedType(null); }}>
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input form panel */}
        {recording ? (
          <div className="chat-recording-panel">
            <span className="recording-dot">🔴</span>
            <span className="recording-timer">Voice Note: {formatTime(recordingTime)}</span>
            <button type="button" className="btn ghost cancel-rec-btn" onClick={cancelRecording}>
              ✕ Cancel
            </button>
            <button type="button" className="btn stop-rec-btn" onClick={stopRecording}>
              ⏹ Send Note
            </button>
          </div>
        ) : (
          <form className="chat-input-bar" onSubmit={handleSend}>
            <button
              type="button"
              className="btn ghost chat-addon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Image/Video"
            >
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              className={`btn ghost chat-addon-btn ${sharingLocation ? "loading-location" : ""}`}
              onClick={handleShareLocation}
              disabled={sharingLocation}
              title="Share Location"
            >
              {sharingLocation ? "🛰️" : "📍"}
            </button>

            <button
              type="button"
              className="btn ghost chat-addon-btn"
              onClick={startRecording}
              title="Record Voice Note"
            >
              🎙️
            </button>

            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <button
                type="button"
                className="btn ghost chat-addon-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add Emoji"
              >
                😀
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker-drawer card">
                  <div className="emoji-picker-tabs">
                    {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`emoji-tab-btn ${activeCategory === cat ? "active" : ""}`}
                        onClick={() => setActiveCategory(cat)}
                        title={cat}
                      >
                        {CATEGORY_ICONS[cat]}
                      </button>
                    ))}
                  </div>
                  <div className="emoji-picker-grid">
                    {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="emoji-btn"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              className="chat-text-input"
              placeholder="Broadcast a secure transmission…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <button type="submit" className="btn chat-send-btn" disabled={submitting || uploading}>
              SEND
            </button>
          </form>
        )}
      </div>

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
