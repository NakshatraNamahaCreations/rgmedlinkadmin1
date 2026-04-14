import { useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import API from "./api";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { G, C, PATHS, Ic, Toast } from "./components/Styles";
import { ROLES_CFG } from "./data/MasterData";
import { fDate } from "./data/MasterData";
import Dashboard from "./components/Dashboard";
import RxView from "./components/Prescriptions";
import PatientsView from "./components/PatientsView";
import InvView, { SalesRanking } from "./components/Inventory";
import OrdersView from "./components/OrdersView";
import BillingInvoicing from "./components/BillingInvoicing";
import InvoiceView from "./components/InvoiceView";
import ReportsView from "./components/ReportsView";
import TicketsView from "./components/TicketsView";
import Login from "./components/Login";
import InventoryDetail from "./components/InventoryDetail";
import PrescriptionDetail from "./components/PrescriptionDetail";

/* ─── SIDEBAR ──────────────────────────────────────────────────────────── */
const Sidebar = ({ currentRole, NAV }) => {
  return (
    <div
      style={{
        width: 224,
        background: "linear-gradient(180deg, #080E1E 0%, #0B1226 40%, #0F1933 100%)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "6px 0 32px rgba(0,0,0,0.28)",
        zIndex: 100,
      }}
    >
      {/* ── LOGO ── */}
      <div
        style={{
          padding: "18px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.97)",
            borderRadius: 12,
            padding: "6px 10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          }}
        >
          <img
            src="/images/logoimage.png"
            alt="RG Medlink"
            style={{ width: "100%", height: 66, objectFit: "contain" }}
          />
        </div>
      </div>

      {/* ── NAV LABEL ── */}
      <div style={{ padding: "16px 18px 6px" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.28)",
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          Navigation
        </span>
      </div>

      {/* ── NAV ITEMS ── */}
      <nav
        style={{
          flex: 1,
          padding: "0 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.id}
            to={n.path}
            className={({ isActive }) => isActive ? "" : "nav-btn"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 13px",
              borderRadius: 10,
              textDecoration: "none",
              background: isActive
                ? "linear-gradient(90deg, rgba(79,70,229,0.85) 0%, rgba(109,40,217,0.65) 100%)"
                : "transparent",
              color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 400,
              boxShadow: isActive
                ? "0 4px 18px rgba(79,70,229,0.32), inset 0 1px 0 rgba(255,255,255,0.12)"
                : "none",
              borderLeft: isActive
                ? "2px solid rgba(255,255,255,0.55)"
                : "2px solid transparent",
              transition: "all .18s cubic-bezier(.22,1,.36,1)",
            })}
          >
            <Ic d={PATHS[n.icon]} s={15} c="currentColor" />
            {n.l}
            {n.badge && (
              <span
                style={{
                  marginLeft: "auto",
                  background: n.badgeColor,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 99,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                }}
              >
                {n.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── USER SECTION ── */}
      <div
        style={{
          padding: "12px 14px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              boxShadow: "0 2px 10px rgba(79,70,229,0.45)",
            }}
          >
            A
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Administrator
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
              Full Access
            </div>
          </div>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Ic d={PATHS.logout} s={13} c="rgba(255,255,255,0.45)" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN APP ─────────────────────────────────────────────────────────── */
export default function App() {
  const [currentRole] = useState("Admin");
  const [rx, setRx] = useState([]);
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const isLoginPage = location.pathname === "/";

  
  useEffect(() => {
    fetchMeds();
  }, []);

  const fetchMeds = async () => {
    try {
      const res = await API.get("/medicines");
      setMeds(res.data);
    } catch (err) {
      console.error("Failed to load medicines", err);
    }
  };

  const [meds, setMeds] = useState([]);
  const critStock = meds.filter((m) => m.stock <= m.minStock).length;

  /* ── NAVIGATION ── */
  const NAV = [
    { id: "dashboard",     l: "Dashboard",     icon: "dash",    path: "/dashboard" },
    { id: "prescriptions", l: "Prescriptions", icon: "rx",      path: "/prescriptions" },
    { id: "patients",      l: "Patients",       icon: "users",   path: "/patients" },
    {
      id: "inventory", l: "Inventory", icon: "box", path: "/inventory",
      badge: critStock > 0 ? critStock : null,
      badgeColor: C.red,
    },
    { id: "orders",  l: "Orders",  icon: "orders",  path: "/orders" },
    { id: "billing", l: "Billing", icon: "billing", path: "/billing" },
    { id: "reports", l: "Reports", icon: "chart",   path: "/reports" },
    { id: "tickets", l: "Tickets", icon: "tag",     path: "/tickets" },
  ].filter(
    (n) =>
      ROLES_CFG[currentRole]?.includes(n.id) ||
      ROLES_CFG[currentRole]?.includes("all") ||
      currentRole === "Admin"
  );

  return (
    <>
      <G />

      {toast && (
        <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />
      )}

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* SIDEBAR */}
        {!isLoginPage && <Sidebar currentRole={currentRole} NAV={NAV} />}

        {/* MAIN AREA */}
        <div
          style={{
            marginLeft: !isLoginPage ? 224 : 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >

          {/* HEADER — removed */}

          {/* PAGE CONTENT */}
          <div
            style={{
              flex: 1,
              padding: isLoginPage ? "0px" : "24px 28px",
              background: "#EEF2F8",
            }}
          >
            <Routes>
              <Route path="/dashboard"     element={<Dashboard rx={rx} />} />
              <Route path="/prescriptions" element={<RxView role={currentRole} />} />
              <Route path="/"              element={<Login />} />
              <Route path="/patients"      element={<PatientsView rx={rx} setRx={setRx} />} />
              <Route path="/inventory"     element={<InvView rx={rx} />} />
              <Route path="/inventory/sales-ranking" element={<SalesRanking />} />
              <Route path="/orders"        element={<OrdersView />} />
              <Route path="/billing"       element={<BillingInvoicing rx={rx} />} />
              <Route path="/invoice/:id"   element={<InvoiceView />} />
              <Route path="/reports"       element={<ReportsView />} />
              <Route path="/tickets"      element={<TicketsView />} />
              <Route path="/inventory/:id" element={<InventoryDetail />} />
              <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
            </Routes>
          </div>

        </div>
      </div>
    </>
  );
}
