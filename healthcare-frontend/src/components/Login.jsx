import { useState } from "react";
import api from "../api";

export default function Login({ setView }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await api.post(
        "/login",
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

      localStorage.setItem("token", res.data.access_token);
      setView("dashboard");
    } catch {
      alert("Login failed");
    }
  };

  return (
    <div style={{ padding: 50 }}>
      <h2>Login</h2>
      <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
      <br /><br />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      <br /><br />
      <button onClick={handleLogin}>Login</button>
      <br /><br />
      <button onClick={() => setView("register")}>Go to Register</button>
    </div>
  );
}