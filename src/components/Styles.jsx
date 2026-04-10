import React from "react";

/* ─── GLOBAL CSS ──────────────────────────────────────────────────────── */
export const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'DM Sans',sans-serif;background:#EEF2F8;color:#0F172A;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#C8D2E0;border-radius:99px}
    ::-webkit-scrollbar-thumb:hover{background:#94A3B8}
    input,select,textarea,button{font-family:'DM Sans',sans-serif}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
    @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(220,38,38,.4)}70%{box-shadow:0 0 0 10px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes countUp{from{opacity:0}to{opacity:1}}
    @keyframes navActiveGlow{0%,100%{box-shadow:0 4px 16px rgba(79,70,229,0.28)}50%{box-shadow:0 4px 24px rgba(79,70,229,0.45)}}
    .fu{animation:fadeUp .35s cubic-bezier(.22,1,.36,1) both}
    .si{animation:slideIn .3s cubic-bezier(.22,1,.36,1) both}
    .sc{animation:scaleIn .26s cubic-bezier(.22,1,.36,1) both}
    .alert-pulse{animation:pulseRing 2.2s infinite}
    .stagger-1{animation-delay:.06s}
    .stagger-2{animation-delay:.12s}
    .stagger-3{animation-delay:.18s}
    .stagger-4{animation-delay:.24s}
    .stagger-5{animation-delay:.30s}
    tr:hover td{background:#F7F9FC!important}
    .nav-btn:hover{background:rgba(255,255,255,0.09)!important;color:rgba(255,255,255,0.92)!important}
    .card-hover{transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s}
    .card-hover:hover{transform:translateY(-3px);box-shadow:0 24px 64px rgba(15,23,42,0.13)!important}
    .premium-tab{transition:all .15s}
    .premium-tab:hover{color:#0F172A!important;background:#F1F5F9!important}
  `}</style>
);

/* ─── DESIGN TOKENS ───────────────────────────────────────────────────── */
export const C = {
  ink: "#0F172A",
  ink2: "#1E293B",
  ink3: "#64748B",
  ink4: "#94A3B8",
  surface: "#FFFFFF",
  surface2: "#F8FAFC",
  surface3: "#F1F5F9",
  border: "#E2E8F0",
  border2: "#CBD5E1",
  blue: "#4F46E5",
  blue2: "#4338CA",
  blueT: "#EEF2FF",
  green: "#059669",
  green2: "#047857",
  greenT: "#ECFDF5",
  amber: "#D97706",
  amber2: "#B45309",
  amberT: "#FFFBEB",
  red: "#DC2626",
  red2: "#B91C1C",
  redT: "#FEF2F2",
  purple: "#7C3AED",
  purpleT: "#F5F3FF",
  teal: "#0D9488",
  tealT: "#F0FDFA",
  rose: "#E11D48",
  roseT: "#FFF1F2",
  sidebarBg: "#0B1226",
  sidebarActive: "#4F46E5",
};

export const sc = (s) => ({
  Active: C.green,
  Expired: C.red,
  "Expiring Soon": C.amber,
  Delivered: C.green,
  Processing: C.blue,
  Shipped: C.purple,
  "Out for Delivery": C.teal,
  Packed: C.teal,
  Pending: C.amber,
  Paid: C.green,
  Unpaid: C.red,
  Sent: C.blue,
  Read: C.ink3,
  "In Stock": C.green,
  "Low Stock": C.amber,
  Critical: C.red,
  Loyal: C.green,
  New: C.blue,
  "At Risk": C.red,
  Churned: C.red,
}[s] || C.ink3);

/* ─── SVG ICON SYSTEM ─────────────────────────────────────────────────── */
export const Ic = ({ d, s = 18, c = "currentColor", w = 1.75 }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {[].concat(d).map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);

export const PATHS = {
  dash: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  rx: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  box: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  truck: "M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  staff: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  plus: "M12 4v16m8-8H4",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  trending: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  cal: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  unlock: "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z",
  forecast: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  orders: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 7h11M9 20a1 1 0 100 2 1 1 0 000-2zm10 0a1 1 0 100 2 1 1 0 000-2z",
  billing: "M6 2h12a2 2 0 012 2v18l-3-2-3 2-3-2-3 2-3-2-2 1V4a2 2 0 012-2zm3 6h6m-6 4h6m-6 4h4"
};

/* ─── ATOMS ───────────────────────────────────────────────────────────── */
export const Card = ({ ch, sx = {}, hover }) => (
  <div
    className={hover ? "card-hover" : ""}
    style={{
      background: C.surface,
      borderRadius: 16,
      boxShadow: "0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.07)",
      border: `1px solid ${C.border}`,
      padding: 10,
      transition: "all .22s cubic-bezier(.22,1,.36,1)",
      ...sx,
    }}
  >
    {ch}
  </div>
);

export const Tag = ({ label, color }) => {
  const bg = {
    [C.green]: C.greenT,
    [C.amber]: C.amberT,
    [C.red]: C.redT,
    [C.blue]: C.blueT,
    [C.purple]: C.purpleT,
    [C.teal]: C.tealT,
    [C.rose]: C.roseT,
  }[color] || C.surface3;
  return (
    <span
      style={{
        background: bg,
        color,
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        letterSpacing: 0.2,
        border: `1px solid ${color}20`,
      }}
    >
      {label}
    </span>
  );
};

export const Pill = ({ v, max, color, h = 8 }) => (
  <div
    style={{
      background: C.surface3,
      borderRadius: 99,
      height: h,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${Math.min((v / max) * 100, 100)}%`,
        height: "100%",
        background: `linear-gradient(90deg, ${color}, ${color}CC)`,
        borderRadius: 99,
        transition: "width .6s cubic-bezier(.22,1,.36,1)",
      }}
    />
  </div>
);

export const Toast = ({ msg, type, onClose }) => {
  const map = {
    ok: { bg: C.green, icon: PATHS.check },
    err: { bg: C.red, icon: PATHS.x },
    warn: { bg: C.amber, icon: PATHS.alert },
  };
  const t = map[type] || { bg: C.blue, icon: PATHS.alert };
  return (
    <div
      className="si"
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        background: t.bg,
        color: "#fff",
        borderRadius: 14,
        padding: "14px 20px",
        boxShadow: `0 8px 32px ${t.bg}40, 0 2px 8px rgba(0,0,0,0.15)`,
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 380,
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: 5, display: "flex", flexShrink: 0 }}>
        <Ic d={t.icon} s={14} c="#fff" />
      </div>
      <span style={{ flex: 1 }}>{msg}</span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", opacity: 0.7, display: "flex", padding: 2 }}
      >
        <Ic d={PATHS.x} s={14} c="#fff" />
      </button>
    </div>
  );
};

export const Modal = ({ title, ch, onClose, w = 760, sub }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(8px)",
      padding: 20,
     
    }}
  >
    <div
      className="sc"
      style={{
        background: C.surface,
        borderRadius: 20,
        width: "100%",
        maxWidth: w,
        maxHeight: "92vh",
        overflow: "auto",
        boxShadow: "0 40px 100px rgba(15,23,42,0.30), 0 8px 32px rgba(15,23,42,0.15)",
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "22px 28px 18px",
          borderBottom: `1px solid ${C.border}`,
          position: "sticky",
          top: 0,
          background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
          zIndex: 1,
          borderRadius: "20px 20px 0 0",
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>{title}</h3>
          {sub && <p style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>{sub}</p>}
        </div>
        <button
          onClick={onClose}
          style={{
            background: C.surface3,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 8,
            cursor: "pointer",
            display: "flex",
            transition: "all .15s",
          }}
        >
          <Ic d={PATHS.x} s={15} c={C.ink3} />
        </button>
      </div>
      <div style={{ padding: "24px 28px" }}>{ch}</div>
    </div>
  </div>
);

export const Btn = ({ ch, v = "primary", onClick, disabled, sm, icon, sx = {} }) => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    borderRadius: 10,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    transition: "all .18s cubic-bezier(.22,1,.36,1)",
    opacity: disabled ? 0.5 : 1,
    fontSize: sm ? 12 : 13,
    padding: sm ? "6px 13px" : "9px 18px",
    letterSpacing: 0.1,
  };
  const vs = {
    primary: {
      background: "linear-gradient(135deg, #4F46E5 0%, #6D28D9 100%)",
      color: "#fff",
      boxShadow: "0 2px 10px rgba(79,70,229,0.35)",
    },
    ok: {
      background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      color: "#fff",
      boxShadow: "0 2px 10px rgba(5,150,105,0.3)",
    },
    danger: {
      background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
      color: "#fff",
      boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
    },
    ghost: { background: "transparent", color: C.blue, border: `1.5px solid ${C.border}` },
    warn: { background: C.amber, color: "#fff" },
    subtle: { background: C.surface3, color: C.ink2, border: `1px solid ${C.border}` },
    dark: { background: C.ink, color: "#fff" },
  };
  return (
    <button
      style={{ ...base, ...vs[v], ...sx }}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Ic d={PATHS[icon]} s={sm ? 13 : 14} c="currentColor" />}
      {ch}
    </button>
  );
};

export const Inp = ({ value, onChange, placeholder, type = "text", sx = {}, ...r }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    type={type}
    {...r}
    style={{
      padding: "10px 13px",
      border: `1.5px solid ${C.border}`,
      borderRadius: 10,
      fontSize: 13,
      color: C.ink,
      outline: "none",
      background: C.surface2,
      width: "100%",
      transition: "border .15s, box-shadow .15s",
      ...sx,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = C.blue;
      e.target.style.boxShadow = `0 0 0 3px rgba(79,70,229,0.1)`;
    }}
    onBlur={(e) => {
      e.target.style.borderColor = C.border;
      e.target.style.boxShadow = "none";
    }}
  />
);

export const Sel = ({ value, onChange, children, sx = {}, ...rest }) => (
  <select
    value={value}
    onChange={onChange}
    {...rest}
    style={{
      padding: "10px 13px",
      border: `1.5px solid ${C.border}`,
      borderRadius: 10,
      fontSize: 13,
      color: C.ink,
      outline: "none",
      background: C.surface2,
      width: "100%",
      cursor: "pointer",
      transition: "border .15s, box-shadow .15s",
      appearance: "none",
      ...sx,
    }}
    onFocus={(e) => {
      e.target.style.borderColor = C.blue;
      e.target.style.boxShadow = `0 0 0 3px rgba(79,70,229,0.1)`;
    }}
    onBlur={(e) => {
      e.target.style.borderColor = C.border;
      e.target.style.boxShadow = "none";
    }}
  >
    {children}
  </select>
);

export const Field = ({ label, required, hint, ch }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.ink3,
        textTransform: "uppercase",
        letterSpacing: 0.6,
      }}
    >
      {label}
      {required && <span style={{ color: C.red }}> *</span>}
    </label>
    {ch}
    {hint && <span style={{ fontSize: 11, color: C.ink3 }}>{hint}</span>}
  </div>
);

export const KPI = ({ label, value, sub, icon, color, trend, anim, sx = {} }) => (
  <div
    style={{
      background: C.surface,
      borderRadius: 16,
      padding: "20px 22px 18px",
      boxShadow: "0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.07)",
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      flex: 1,
      minWidth: 150,
      transition: "all .2s",
      ...sx,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
      }}
    >
      <div style={{
        background: `linear-gradient(135deg, ${color}22, ${color}0E)`,
        borderRadius: 10,
        padding: 10,
        display: "flex",
        border: `1px solid ${color}25`,
      }}>
        <Ic d={PATHS[icon]} s={18} c={color} />
      </div>
      {trend != null && (
        <span
          style={{
            fontSize: 11,
            color: trend > 0 ? C.green : C.red,
            fontWeight: 700,
            background: (trend > 0 ? C.green : C.red) + "12",
            padding: "3px 8px",
            borderRadius: 99,
          }}
        >
          {trend > 0 ? "↑" : "↓"}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 700,
        color: C.ink,
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 12, color: C.ink3, marginTop: 5, fontWeight: 500 }}>
      {label}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>
        {sub}
      </div>
    )}
  </div>
);
