import { useState } from "react";
import api from "../api";

export default function Register({ setView }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      await api.post(
        "/register",
        new URLSearchParams({
          username,
          password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      alert("Registered successfully!");
      setView("login");
    } catch {
      alert("Registration failed");
    }
  };

  return (
    <div style={{ padding: 50 }}>
      <h2>Register</h2>
      <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <br /><br />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <br /><br />
      <button onClick={handleRegister}>Register</button>
      <br /><br />
      <button onClick={() => setView("login")}>Back to Login</button>
    </div>
  );
}