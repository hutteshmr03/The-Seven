import { useState } from "react";

export default function MediaLightbox({ mediaUrl, mediaType, onClose }) {
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  if (!mediaUrl) return null;

  const handleProgress = (e) => {
    const media = e.target;
    if (media.duration > 0 && media.buffered.length > 0) {
      const bufferedEnd = media.buffered.end(media.buffered.length - 1);
      const percent = Math.round((bufferedEnd / media.duration) * 100);
      setBufferedPercent(percent);
    }
  };

  const handleCanPlay = () => {
    setIsMediaLoading(false);
  };

  const handleWaiting = () => {
    setIsMediaLoading(true);
  };

  const handlePlaying = () => {
    setIsMediaLoading(false);
  };

  return (
    <div className="media-lightbox-overlay" onClick={onClose}>
      <button className="media-lightbox-close" onClick={onClose}>✕ CLOSE</button>
      
      <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Loading Spinner & Progress Text */}
        {isMediaLoading && (
          <div className="media-lightbox-loader">
            <div className="media-lightbox-spinner"></div>
            <div className="media-lightbox-loader-text">
              {mediaType === "audio" ? "BUFFERING SECURE AUDIO..." : "DECRYPTING TRANSMISSION..."} 
              <span className="percent-glow"> {bufferedPercent}%</span>
            </div>
            <div className="media-lightbox-progress-bar-container">
              <div 
                className="media-lightbox-progress-bar-fill" 
                style={{ width: `${bufferedPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {mediaType === "video" ? (
          <video 
            src={mediaUrl} 
            controls 
            autoPlay 
            className={`media-lightbox-video ${isMediaLoading ? "hidden-media" : ""}`}
            onProgress={handleProgress}
            onCanPlay={handleCanPlay}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
          />
        ) : mediaType === "audio" ? (
          <div className={`media-lightbox-audio-card card ${isMediaLoading ? "hidden-media" : ""}`}>
            <span className="audio-visualizer-icon">🎵 AUDIO PLAYBACK</span>
            <audio 
              src={mediaUrl} 
              controls 
              autoPlay 
              className="media-lightbox-audio"
              onProgress={handleProgress}
              onCanPlay={handleCanPlay}
              onWaiting={handleWaiting}
              onPlaying={handlePlaying}
            />
          </div>
        ) : (
          <img 
            src={mediaUrl} 
            alt="Full Screen Preview" 
            className={`media-lightbox-image ${isMediaLoading ? "hidden-media" : ""}`}
            onLoad={() => setIsMediaLoading(false)}
          />
        )}
      </div>
    </div>
  );
}
