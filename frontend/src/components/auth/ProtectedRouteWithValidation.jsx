import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { clearAllAuth } from "../../lib/authHelpers";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProtectedRouteWithValidation({ children, tokenKey = "konekt_token" }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setStatus("blocked");
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then(() => setStatus("ok"))
      .catch(() => {
        clearAllAuth();
        setStatus("blocked");
      });
  }, [tokenKey]);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "blocked") return <Navigate to="/login" replace />;
  return children;
}
