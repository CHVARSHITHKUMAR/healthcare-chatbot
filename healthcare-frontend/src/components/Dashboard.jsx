import { useState, useRef, useEffect } from "react";
import api from "../api";

export default function Dashboard({ setView }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async () => {
    if (!message) return;

    const userMessage = message;
    setChat((prev) => [...prev, { type: "user", content: userMessage }]);
    setMessage("");

    try {
      const res = await api.post(
        `/chat?message=${encodeURIComponent(userMessage)}`
      );

      setChat((prev) => [
        ...prev,
        { type: "bot", content: res.data.reply },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        { type: "bot", content: "Error contacting AI." },
      ]);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("message", "Analyze this medical image");

    setChat((prev) => [
      ...prev,
      { type: "user", content: "📷 Image uploaded" },
    ]);

    try {
      const res = await api.post("/analyze-image", formData);
      setChat((prev) => [
        ...prev,
        { type: "bot", content: res.data.reply },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        { type: "bot", content: "Image analysis failed." },
      ]);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setChat((prev) => [
      ...prev,
      { type: "user", content: "📄 PDF uploaded" },
    ]);

    try {
      const res = await api.post("/analyze-pdf", formData);
      setChat((prev) => [
        ...prev,
        { type: "bot", content: res.data.reply },
      ]);
    } catch {
      setChat((prev) => [
        ...prev,
        { type: "bot", content: "PDF analysis failed." },
      ]);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setView("login");
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2>🩺 Healthcare AI</h2>
        <button onClick={logout} style={styles.logout}>
          Logout
        </button>
      </div>

      <div style={styles.chatArea}>
        <div style={styles.chatBox}>
          {chat.map((msg, index) => (
            <div
              key={index}
              style={
                msg.type === "user"
                  ? styles.userBubble
                  : styles.botBubble
              }
            >
              {msg.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div style={styles.inputArea}>
          <input
            style={styles.input}
            value={message}
            placeholder="Ask medical question..."
            onChange={(e) => setMessage(e.target.value)}
          />
          <button style={styles.sendBtn} onClick={sendMessage}>
            Send
          </button>

          <label style={styles.uploadBtn}>
            📷
            <input type="file" hidden onChange={handleImageUpload} />
          </label>

          <label style={styles.uploadBtn}>
            📄
            <input type="file" hidden onChange={handlePDFUpload} />
          </label>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial",
  },
  sidebar: {
    width: "250px",
    background: "#0f172a",
    color: "white",
    padding: "20px",
  },
  logout: {
    marginTop: "20px",
    padding: "10px",
    background: "#ef4444",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  chatBox: {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
    background: "#f1f5f9",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "white",
    padding: "10px 15px",
    borderRadius: "15px",
    margin: "10px 0",
    maxWidth: "60%",
  },
  botBubble: {
    alignSelf: "flex-start",
    background: "#e2e8f0",
    padding: "10px 15px",
    borderRadius: "15px",
    margin: "10px 0",
    maxWidth: "60%",
  },
  inputArea: {
    display: "flex",
    padding: "15px",
    background: "white",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "20px",
    border: "1px solid #ccc",
    marginRight: "10px",
  },
  sendBtn: {
    padding: "10px 15px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginRight: "10px",
  },
  uploadBtn: {
    cursor: "pointer",
    fontSize: "20px",
    marginRight: "10px",
  },
};