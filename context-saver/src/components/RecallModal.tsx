import React, { useEffect, useState } from "react";
import "./RecallModal.css";

interface CaptureNote {
  where_left_off: string;
  next_step: string;
  captured_at: string;
  recalled_count: number;
}

interface Props {
  data: CaptureNote;
  onClose: () => void;
}

export default function RecallModal({ data, onClose }: Props) {
  const [fadeOut, setFadeOut] = useState(false);

  // Auto-close after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onClose, 500); // Wait for fade animation
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setFadeOut(true);
    setTimeout(onClose, 500);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  return (
    <div
      className={`recall-overlay ${fadeOut ? "fade-out" : ""}`}
      onClick={handleClose}
    >
      <div className="recall-content" onClick={(e) => e.stopPropagation()}>
        <div className="recall-header">
          <h2>Welcome Back! 👋</h2>
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="recall-body">
          <div className="recall-section">
            <h3>Where you left off</h3>
            <p className="recall-text">{data.where_left_off}</p>
          </div>

          <div className="recall-section">
            <h3>Your next step</h3>
            <p className="recall-text">{data.next_step}</p>
          </div>

          <div className="recall-meta">
            <span className="time-ago">
              Last captured: {formatTime(data.captured_at)} • Recalled {data.recalled_count || 0} time{(data.recalled_count || 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="recall-footer">
          <button className="btn-primary" onClick={handleClose}>
            Got it, let's go!
          </button>
        </div>
      </div>
    </div>
  );
}
