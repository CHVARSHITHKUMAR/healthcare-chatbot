import { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

function App() {
  const [view, setView] = useState("login");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setView("dashboard");
    }
  }, []);

  if (view === "login")
    return <Login setView={setView} />;

  if (view === "register")
    return <Register setView={setView} />;

  return <Dashboard setView={setView} />;
}

export default App;