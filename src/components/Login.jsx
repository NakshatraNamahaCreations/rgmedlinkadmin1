import { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const FEATURES = [
  { icon: "💊", label: "Prescription Pipeline" },
  { icon: "🚚", label: "Dispatch Tracking" },
  { icon: "📦", label: "Inventory Control" },
  { icon: "👥", label: "Patient Records" },
  { icon: "🧾", label: "Billing & Invoicing" },
  { icon: "📊", label: "Analytics & Reports" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => e.key === "Enter" && handleLogin();

  const inputBase = {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 11,
    outline: "none",
    fontSize: 14,
    color: "#0F172A",
    background: "#F8FAFC",
    transition: "all .15s",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── LEFT BRAND PANEL ── */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(145deg, #080E1E 0%, #0B1226 45%, #110C3A 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow blobs */}
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 65%)",
            top: -120,
            left: -120,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)",
            bottom: -80,
            right: -60,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)",
            bottom: 120,
            left: 60,
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div
          style={{
            background: "rgba(255,255,255,0.97)",
            borderRadius: 16,
            padding: "12px 20px",
            boxShadow: "0 8px 36px rgba(0,0,0,0.35)",
            marginBottom: 40,
            width: 220,
          }}
        >
          <img
            src="/images/logoimage.png"
            alt="RG Medlink"
            style={{ width: "100%", height: 82, objectFit: "contain" }}
          />
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            marginBottom: 14,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}
        >
          Healthcare Admin
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #818CF8 0%, #C4B5FD 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Management Portal
          </span>
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            maxWidth: 300,
            lineHeight: 1.75,
            marginBottom: 40,
          }}
        >
          Manage prescriptions, patients, inventory, and
          deliveries — all from one powerful dashboard.
        </p>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 380,
          }}
        >
          {FEATURES.map((f) => (
            <span
              key={f.label}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 13px",
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
            letterSpacing: 0.4,
          }}
        >
          RG Medlink · Secure Admin Access
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div
        style={{
          width: 500,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 60px",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #4F46E5 100%)",
            borderRadius: "0 0 0 0",
          }}
        />

        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Form header */}
          <div style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#0F172A",
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Welcome back 👋
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>
              Sign in to your administrator account to continue.
            </p>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 7,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Email Address
            </label>
            <input
              style={inputBase}
              placeholder="admin@rgmedlink.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKey}
              onFocus={(e) => {
                e.target.style.borderColor = "#4F46E5";
                e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)";
                e.target.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#E2E8F0";
                e.target.style.boxShadow = "none";
                e.target.style.background = "#F8FAFC";
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 32 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: "#374151",
                marginBottom: 7,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Password
            </label>
            <input
              type="password"
              style={inputBase}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKey}
              onFocus={(e) => {
                e.target.style.borderColor = "#4F46E5";
                e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)";
                e.target.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#E2E8F0";
                e.target.style.boxShadow = "none";
                e.target.style.background = "#F8FAFC";
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: loading
                ? "#A5B4FC"
                : "linear-gradient(135deg, #4F46E5 0%, #6D28D9 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 11,
              fontWeight: 700,
              fontSize: 14.5,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all .2s cubic-bezier(.22,1,.36,1)",
              boxShadow: loading ? "none" : "0 4px 18px rgba(79,70,229,0.4)",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: 0.2,
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(79,70,229,0.5)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = loading ? "none" : "0 4px 18px rgba(79,70,229,0.4)";
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          {/* Footer */}
          <div
            style={{
              marginTop: 32,
              padding: "16px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
              🔒 Secured connection · Admin access only
              <br />
              <span style={{ fontSize: 11, color: "#94A3B8" }}>
                RG Medlink Healthcare Administration v2.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
