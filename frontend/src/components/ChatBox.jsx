import React, { useState } from "react";
import "./ChatBox.css";

/**
 * Simple chat interface that sends messages to POST /api/chat/ask.
 */
export default function ChatBox({ onSend }) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setHistory((h) => [...h, { role: "user", text: message }]);
    onSend?.(message);
    setMessage("");
  };

  return (
    <div className="chat-box">
      <div className="chat-history">
        {history.map((m, i) => (
          <div key={i} className={`chat-message chat-message--${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-row">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ถามหาห้องเรียน..."
        />
        <button type="submit">ส่ง</button>
      </form>
    </div>
  );
}
