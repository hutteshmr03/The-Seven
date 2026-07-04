import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = sessionStorage.getItem("friendzone_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("friendzone_token");
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get("/users/me")
      .then((res) => {
        setUser(res.data);
        sessionStorage.setItem("friendzone_user", JSON.stringify(res.data));
      })
      .catch(() => {
        sessionStorage.removeItem("friendzone_token");
        sessionStorage.removeItem("friendzone_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const res = await client.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    sessionStorage.setItem("friendzone_token", res.data.access_token);
    sessionStorage.setItem("friendzone_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    sessionStorage.removeItem("friendzone_token");
    sessionStorage.removeItem("friendzone_user");
    setUser(null);
  }

  function refreshUser(updated) {
    setUser(updated);
    sessionStorage.setItem("friendzone_user", JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
