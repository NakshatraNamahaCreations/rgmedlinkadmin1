import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { Ic, PATHS, sc, Modal, Toast } from "./Styles";
import NewOrderForm from "./NewOrderForm";

/* ─── TOKENS ───────────────────────────────────────────────────── */
const S = {
  bg: "#F0F4F8",
  card: "#FFFFFF",
  ink: "#0F172A",
  ink2: "#334155",
  muted: "#64748B",
  border: "#E2E8F0",
  brand: "#06549d",
  green: "#059669",   greenBg: "#ECFDF5",
  amber: "#D97706",   amberBg: "#FFFBEB",
  red: "#DC2626",     redBg: "#FEF2F2",
  purple: "#7C3AED",  purpleBg: "#F5F3FF",
  teal: "#0D9488",    tealBg: "#F0FDFA",
  blue: "#2563EB",    blueBg: "#EFF6FF",
};
const card = (x = {}) => ({
  background: S.card, borderRadius: 12,
  border: `1px solid ${S.border}`,
  boxShadow: "0 1px 4px rgba(15,23,42,.05)", ...x,
});

/* ─── MAIN ─────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const toast_ = (m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); };

  const handleSaveOrder = async (data) => {
    await API.post("/prescriptions", data);
    toast_("Order created successfully");
    setShowNewOrder(false);
    API.get("/orders").then((r) => setOrders(r.data.data || []));
  };

  useEffect(() => {
    API.get("/orders").then((r) => setOrders(r.data.data || []));
    API.get("/dashboard/summary").then((r) => setMedicines(r.data.medicines || []));
    API.get("/patients").then((r) => setPatients(r.data.data || r.data || [])).catch(() => {});
  }, []);


  
  /* ── DATE HELPERS ── */
  const todayStr = new Date().toDateString();
const getNow = () => new Date();
const now = new Date();  
  /* ── ORDERS ── */
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const pendingDispatch = orders.filter(o => ["Created", "Processing", "Packed"].includes(o.orderStatus));
  const inTransit = orders.filter(o => o.orderStatus === "Shipped");
  const deliveredToday = orders.filter(o => o.orderStatus === "Delivered" && new Date(o.updatedAt || o.createdAt).toDateString() === todayStr);
  const unpaidOrders = orders.filter(o => o.paymentStatus !== "Paid");
  const stuckOrders = orders.filter(o => {
    if (!["Created", "Processing"].includes(o.orderStatus)) return false;
    return (now - new Date(o.createdAt)) > 86400000;
  });

/* ── PRESCRIPTIONS ── */
const rxOrders = orders.filter(o => o.prescription?.rxId);

// ✅ SAME LOGIC AS RxView
const getExpiry = (o) => {
 if (o.prescription?.expiry) {
  const exp = new Date(o.prescription.expiry);
  if (!isNaN(exp)) return exp; // ✅ prevent invalid date
}

  const items = o.items || o.prescription?.meds || [];

  const maxDuration = Math.max(
    ...items.map(m => m.duration || m.dur || 0),
    0
  );

  if (o.prescription?.start && maxDuration > 0) {
    const start = new Date(o.prescription.start);
    start.setDate(start.getDate() + maxDuration);
    return start;
  }

  return null;
};

const activeRx = rxOrders.filter(o => {
  const exp = getExpiry(o);
  const now = getNow();

  return exp && exp > now;
});

const expiringRx = rxOrders.filter(o => {
  const exp = getExpiry(o);
  if (!exp) return false;

  const now = getNow(); // ✅ always fresh
  const days = (exp - now) / 86400000;

  return days > 0 && days <= 7;
});

const expiredRx = rxOrders.filter(o => {
  const exp = getExpiry(o);
  const now = getNow();

  return exp && exp <= now;
});
  /* ── INVENTORY ── */
  const getInvStatus = (m) => {
    if (m.stock === 0) return "Out";
    if (m.stock <= m.minStock * 0.5) return "Critical";
    if (m.stock <= m.minStock) return "Low";
    return "OK";
  };
  const inv = {
    ok: medicines.filter(m => getInvStatus(m) === "OK").length,
    low: medicines.filter(m => getInvStatus(m) === "Low").length,
    critical: medicines.filter(m => getInvStatus(m) === "Critical").length,
    out: medicines.filter(m => getInvStatus(m) === "Out").length,
  };

  /* ── TOP MEDICINES ── */
  const topMeds = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      o.prescription?.meds?.forEach(m => {
        const name = m.medicine?.name;
        if (!name) return;
        if (!map[name]) map[name] = { name, orders: 0, qty: 0, revenue: 0 };
        map[name].orders++;
        map[name].qty += m.qty || 0;
        map[name].revenue += m.subtotal || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.orders - a.orders).slice(0, 6);
  }, [orders]);

  /* ── PIPELINE ── */
  const pipeline = useMemo(() => {
    return ["Created", "Processing", "Packed", "Shipped", "Delivered"].map(s => ({
      label: s, count: orders.filter(o => o.orderStatus === s).length,
    }));
  }, [orders]);

  /* ── RECENT ORDERS ── */
  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
  [orders]);

  /* ── GREETING ── */
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: S.ink, letterSpacing: -0.4 }}>
            {greeting}, Admin
          </h1>
          <p style={{ fontSize: 13, color: S.muted, marginTop: 3 }}>
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/reports")} style={ghostBtn}>
            <Ic d={PATHS.chart} s={14} c={S.muted} /> Reports
          </button>
        </div>
      </div>

      {/* ── ROW 1: 6 KPI STRIP ── */}
      <div style={{ ...card(), display: "grid", gridTemplateColumns: "repeat(6,1fr)", overflow: "hidden" }}>
        {[
          { label: "Today's Orders",    value: todayOrders.length,    route: "/orders" ,          color: S.brand,  icon: PATHS.orders,   sub: "received today" },
          { label: "Total Revenue",     value: `₹${(totalRevenue/100000).toFixed(1)}L`,       route: "/billing" , color: S.green, icon: PATHS.dollar, sub: `₹${totalRevenue.toLocaleString("en-IN")}` },
          { label: "Pending Dispatch",  value: pendingDispatch.length,   route: "/orders",       color: S.amber,  icon: PATHS.clock,    sub: "awaiting shipment" },
          { label: "Active Rx",         value: activeRx.length,      route: "/prescriptions",           color: S.purple, icon: PATHS.rx,       sub: `${expiringRx.length} expiring soon` },
          { label: "Total Patients",    value: patients.length,        route: "/patients",          color: S.teal,   icon: PATHS.users,    sub: "registered users" },
          { label: "Stock Alerts",      value: inv.low + inv.critical,        route: "/inventory",   color: S.red,    icon: PATHS.alert,    sub: `${inv.critical} critical` },
        ].map((m, i, arr) => (
          <div key={m.label} onClick={() => navigate(m.route)}  style={{ padding: "18px 20px", borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : "none" , cursor: "pointer",}}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ background: m.color + "15", borderRadius: 7, padding: 6, display: "flex" }}>
                <Ic d={m.icon} s={13} c={m.color} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                {m.label}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: S.ink, letterSpacing: -0.8, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 5 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── ROW 2: ORDER LIFECYCLE + RX SNAPSHOT + DELIVERY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        {/* ORDER LIFECYCLE */}
        <div style={card({ padding: "20px 22px" })}>
          <CardHead title="Order Lifecycle" sub={`${totalOrders} total orders`} action={{ label: "Manage", fn: () => navigate("/orders") }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
         {pipeline.map(({ label, count }) => {
  const color = sc(label);
  const pct = totalOrders ? Math.round((count / totalOrders) * 100) : 0;

  return (
    <div
      key={label}
      onClick={() =>
        navigate("/orders", {
          state: { statusFilter: label },
        })
      }
      style={{ cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
          <span style={{ fontSize: 13, color: S.ink2, fontWeight: 500 }}>
            {label}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: S.muted }}>{pct}%</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>
            {count}
          </span>
        </div>
      </div>

      <MiniBar value={count} max={totalOrders || 1} color={color} />
    </div>
  );
})}
          </div>
        </div>

        {/* PRESCRIPTION SNAPSHOT */}
        <div style={card({ padding: "20px 22px" })}>
          <CardHead title="Prescription Snapshot" sub={`${rxOrders.length} total prescriptions`} action={{ label: "View Rx", fn: () => navigate("/prescriptions") }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {[
  { label: "Active Prescriptions", value: activeRx.length, filter: "Active", color: S.green, bg: S.greenBg },
  { label: "Expiring (≤ 7 days)", value: expiringRx.length, filter: "Expiring", color: S.amber, bg: S.amberBg },
  { label: "Expired", value: expiredRx.length, filter: "Expired", color: S.red, bg: S.redBg },
  { label: "No Expiry Set", value: rxOrders.length - activeRx.length - expiredRx.length, filter: "All", color: S.muted, bg: S.bg },
].map(({ label, value, color, bg, filter }) => (
  <div
    key={label}
    onClick={() =>
      navigate("/prescriptions", {
        state: { filter },
      })
    }
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "9px 12px",
      background: bg,
      borderRadius: 8,
      border: `1px solid ${color}20`,
      cursor: "pointer",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
  >
    <span style={{ fontSize: 13, color: S.ink2, fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
  </div>
))}
          </div>
          {expiringRx.length > 0 && (
            <div style={{ marginTop: 12, padding: "9px 12px", background: S.amberBg, borderRadius: 8, border: `1px solid ${S.amber}30`, display: "flex", gap: 8, alignItems: "center" }}>
              <Ic d={PATHS.alert} s={13} c={S.amber} />
              <span style={{ fontSize: 12, color: S.amber, fontWeight: 600 }}>
                {expiringRx.length} prescription{expiringRx.length > 1 ? "s" : ""} expiring within 7 days
              </span>
            </div>
          )}
        </div>

        {/* DISPATCH & DELIVERY */}
        <div style={card({ padding: "20px 22px" })}>
          <CardHead title="Dispatch & Delivery" sub="Live shipping status" action={{ label: "Orders", fn: () => navigate("/orders") }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
           {[
          { label: "Pending Dispatch", value: pendingDispatch.length, color: S.amber, icon: PATHS.clock, status: "Created" },
          { label: "In Transit", value: inTransit.length, color: S.purple, icon: PATHS.truck, status: "Shipped" },
          { label: "Delivered Today", value: deliveredToday.length, color: S.green, icon: PATHS.check, status: "Delivered" },
          { label: "Stuck > 24 hrs", value: stuckOrders.length, color: S.red, icon: PATHS.alert, status: "Created" },
        ].map(({ label, value, color, icon, status }) => (
              <div
  key={label}
  onClick={() =>
    navigate("/orders", {
      state: { statusFilter: status },
    })
  }
  style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "9px 12px",
    background:
      value > 0 && color === S.red ? S.redBg : S.bg,
    borderRadius: 8,
    border: `1px solid ${
      value > 0 && color === S.red ? S.red + "25" : S.border
    }`,
    cursor: "pointer",
  }}
>
                <div style={{ background: color + "18", borderRadius: 7, padding: 6, display: "flex", flexShrink: 0 }}>
                  <Ic d={icon} s={13} c={color} />
                </div>
                <span style={{ fontSize: 13, color: S.ink2, fontWeight: 500, flex: 1 }}>{label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: S.muted }}>Total dispatched</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{inTransit.length + orders.filter(o => o.orderStatus === "Delivered").length}</span>
          </div>
        </div>
      </div>

      {/* ── ROW 3: RECENT ORDERS + ACTION REQUIRED ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

        {/* RECENT ORDERS - with prescription context */}
        <div style={card({ padding: "22px 26px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: S.ink, letterSpacing: -0.2 }}>Recent Orders</p>
              <p style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>Latest {recentOrders.length} with prescription context</p>
            </div>
            <button onClick={() => navigate("/orders")} style={ghostBtn}>View all <Ic d={PATHS.trending} s={12} c={S.muted} /></button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${S.border}` }}>
                  {["Order ID", "Patient", "Doctor", "Rx ID", "Date", "Amount", "Status", "Payment"].map(h => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o._id} style={{ borderBottom: `1px solid ${S.border}`, transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 10px", fontWeight: 700, color: S.brand, fontFamily: "'DM Mono',monospace", fontSize: 11, cursor: "pointer", }} onMouseEnter={(e) => {
    e.currentTarget.style.textDecoration = "underline";
    e.currentTarget.style.color = "#4338CA";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.textDecoration = "none";
    e.currentTarget.style.color = S.brand;
  }}   onClick={() => navigate("/orders", { state: { orderId: o.orderId } })}>{o.orderId}</td>
                    <td style={{ padding: "10px 10px", color: S.ink2, fontWeight: 500, whiteSpace: "nowrap" }}>{o.patientDetails?.name || "—"}</td>
                    <td style={{ padding: "10px 10px", color: S.muted, whiteSpace: "nowrap" }}>{o.prescription?.doctor || "—"}</td>
                    
                    <td
                style={{
                  padding: "10px 10px",
                  color: S.purple,
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  cursor: "pointer",
                }}
                onClick={() =>
                  navigate("/prescriptions", {
                    state: {
                      rxId: o.prescription?.rxId,
                    },
                  })
                }
              >
                {o.prescription?.rxId || "—"}
              </td>

                    <td style={{ padding: "10px 10px", color: S.muted, whiteSpace: "nowrap" }}>{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: S.ink }}>₹{(o.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "10px 10px" }}><Chip label={o.orderStatus} /></td>
                    <td style={{ padding: "10px 10px" }}><Chip label={o.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTION REQUIRED */}
        <div style={card({ padding: "20px 22px" })}>
          <p style={{ fontSize: 14, fontWeight: 700, color: S.ink, marginBottom: 4 }}>Action Required</p>
          <p style={{ fontSize: 12, color: S.muted, marginBottom: 16 }}>Items needing immediate attention</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ActionItem icon={PATHS.alert}  color={S.red}    bg={S.redBg}    label="Expiring Rx (≤ 7 days)"   count={expiringRx.length}    to="/prescriptions" navigate={navigate} priority="high" />
            <ActionItem
  label="Critical stock items"
  count={inv.critical}
  to="/inventory"
  navigate={() =>
    navigate("/inventory", {
      state: { tab: "Crit" , scrollTo: "table"},
    })
  }
/>
            <ActionItem icon={PATHS.clock}  color={S.amber}  bg={S.amberBg}  label="Orders stuck > 24 hrs"     count={stuckOrders.length}    to="/orders"        navigate={navigate} priority="medium" />
            <ActionItem icon={PATHS.dollar} color={S.amber}  bg={S.amberBg}  label="Unpaid orders"             count={unpaidOrders.length}   to="/billing"       navigate={navigate} priority="medium" />
            <ActionItem icon={PATHS.box}    color={S.purple} bg={S.purpleBg} label="Low stock medicines"        count={inv.low}               to="/inventory"     navigate={() =>
  navigate("/inventory", {
    state: { tab: "Low", scrollTo: "table" },
  })
}  priority="low" />
            <ActionItem icon={PATHS.truck}  color={S.brand}  bg={S.blueBg}   label="Pending dispatch"           count={pendingDispatch.length} to="/orders"        navigate={navigate} priority="low" />
          </div>
        </div>
      </div>

      {/* ── ROW 4: TOP MEDICINES + INVENTORY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* TOP MEDICINES */}
        <div style={card({ padding: "22px 26px" })}>
          <CardHead title="Top Prescribed Medicines" sub="By order frequency" action={{ label: "Inventory", fn: () => navigate("/inventory") }} />
          {topMeds.length === 0 ? (
            <p style={{ fontSize: 13, color: S.muted, marginTop: 20, textAlign: "center" }}>No prescription data available</p>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0 4px 8px", borderBottom: `1px solid ${S.border}` }}>
                {["Medicine", "Orders", "Qty", "Revenue"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</span>
                ))}
              </div>
              {topMeds.map((med, i) => {
                const maxOrders = topMeds[0]?.orders || 1;
                const stockInfo = medicines.find(m => m.name === med.name);
                const stockStatus = stockInfo ? getInvStatusLabel(stockInfo) : null;
                return (
                  <div key={med.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 4px", borderBottom: `1px solid ${S.border}`, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.ink2, cursor:"pointer" }} onClick={() => navigate("/inventory", {state: { medicineName: med.name }  })}
    onMouseEnter={(e) => {
    e.currentTarget.style.textDecoration = "underline";
    e.currentTarget.style.color = "#4338CA";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.textDecoration = "none";
    e.currentTarget.style.color = S.ink2;
  }}
  >{med.name}</div>
                      <div style={{ width: "80%", height: 3, background: S.border, borderRadius: 99, marginTop: 4 }}>
                        <div style={{ width: `${(med.orders / maxOrders) * 100}%`, height: "100%", background: S.brand, borderRadius: 99 }} />
                      </div>
                      {stockStatus && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: stockStatus.color, background: stockStatus.bg, padding: "1px 6px", borderRadius: 99, marginTop: 3, display: "inline-block" }}>
                          {stockStatus.label}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{med.orders}</span>
                    <span style={{ fontSize: 13, color: S.ink2 }}>{med.qty}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: S.green }}>₹{med.revenue.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INVENTORY HEALTH */}
        <div style={card({ padding: "22px 26px" })}>
          <CardHead title="Inventory Health" sub={`${medicines.length} total SKUs`} action={{ label: "Manage", fn: () => navigate("/inventory") }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {[
              { label: "In Stock",     val: inv.ok,       color: S.green,  bg: S.greenBg },
              { label: "Low Stock",    val: inv.low,      color: S.amber,  bg: S.amberBg },
              { label: "Critical",     val: inv.critical, color: S.red,    bg: S.redBg   },
              { label: "Out of Stock", val: inv.out,      color: S.muted,  bg: S.bg      },
            ].map(({ label, val, color, bg }) => (
              <div
                key={label}
             onClick={() =>
                  navigate("/inventory", {
                    state: {
                      tab:
                        label === "In Stock"
                          ? "InStock"
                          : label === "Low Stock"
                          ? "Low"
                          : label === "Critical"
                          ? "Crit"
                          : "Crit", // Out of Stock also goes to Crit
                           scrollTo: "table",
                    },
                  })
                }
                 style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 12px",
                  background: bg,
                  borderRadius: 8,
                  border: `1px solid ${color}20`,
                  cursor: "pointer",
                }}
                          >
                          <span style={{ fontSize: 13, color: S.ink2, fontWeight: 500 }}>
                  {label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>
                  {val}
                </span>
              </div>
            ))}
                      </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${S.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <StatBox label="Total SKUs" value={medicines.length} color={S.brand} />
            <StatBox label="Need Attention" value={inv.low + inv.critical + inv.out} color={inv.low + inv.critical > 0 ? S.red : S.green} />
          </div>
        </div>
      </div>

      {/* ── MODALS & TOAST ── */}
      {showNewOrder && (
        <Modal title="Create New Order" sub="Select patient, add medicines, and place the order" w={980}
          onClose={() => setShowNewOrder(false)}
          ch={<NewOrderForm onSave={handleSaveOrder} onClose={() => setShowNewOrder(false)} />}
        />
      )}
      {toast && <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── HELPERS ───────────────────────────────────────────────────── */
function getInvStatusLabel(m) {
  if (m.stock === 0) return { label: "Out of Stock", color: "#64748B", bg: "#F1F5F9" };
  if (m.stock <= m.minStock * 0.5) return { label: "Critical", color: "#DC2626", bg: "#FEF2F2" };
  if (m.stock <= m.minStock) return { label: "Low Stock", color: "#D97706", bg: "#FFFBEB" };
  return { label: "In Stock", color: "#059669", bg: "#ECFDF5" };
}

/* ─── SUB COMPONENTS ────────────────────────────────────────────── */
const CardHead = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", letterSpacing: -0.2 }}>{title}</p>
      {sub && <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{sub}</p>}
    </div>
    {action && (
      <button onClick={action.fn} style={ghostBtn}>{action.label}</button>
    )}
  </div>
);

const MiniBar = ({ value, max, color, h = 4 }) => (
  <div style={{ height: h, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
    <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", textAlign: "center", border: "1px solid #E2E8F0" }}>
    <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: -0.5 }}>{value}</div>
    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, fontWeight: 600 }}>{label}</div>
  </div>
);

const PRIORITY_DOT = { high: "#DC2626", medium: "#D97706", low: "#64748B" };
const ActionItem = ({ icon, color, bg, label, count, to, navigate, priority }) => (
  <div onClick={() => navigate(to)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: count > 0 ? bg : "#F8FAFC", borderRadius: 9, cursor: "pointer", border: `1px solid ${count > 0 ? color + "22" : "#E2E8F0"}`, transition: "opacity .15s" }}
    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
  >
    <div style={{ background: count > 0 ? color + "18" : "#E2E8F0", borderRadius: 6, padding: 6, display: "flex", flexShrink: 0 }}>
      <Ic d={icon} s={13} c={count > 0 ? color : "#94A3B8"} />
    </div>
    <span style={{ fontSize: 12, color: count > 0 ? "#0F172A" : "#94A3B8", fontWeight: 500, flex: 1 }}>{label}</span>
    {priority && <div style={{ width: 6, height: 6, borderRadius: "50%", background: count > 0 ? PRIORITY_DOT[priority] : "#E2E8F0", flexShrink: 0 }} />}
    <span style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? color : "#94A3B8", background: count > 0 ? color + "15" : "transparent", padding: "2px 8px", borderRadius: 99 }}>{count}</span>
  </div>
);

const STATUS_COLORS = {
  Delivered:  { bg: "#ECFDF5", color: "#059669" },
  Processing: { bg: "#EFF6FF", color: "#2563EB" },
  Shipped:    { bg: "#F5F3FF", color: "#7C3AED" },
  Packed:     { bg: "#F0FDFA", color: "#0D9488" },
  Created:    { bg: "#F1F5F9", color: "#64748B" },
  Paid:       { bg: "#ECFDF5", color: "#059669" },
  Unpaid:     { bg: "#FEF2F2", color: "#DC2626" },
};
const Chip = ({ label }) => {
  const s = STATUS_COLORS[label] || { bg: "#F1F5F9", color: "#64748B" };
  return <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: "3px 7px", borderRadius: 99, whiteSpace: "nowrap" }}>{label}</span>;
};

/* ─── BUTTON STYLES ─────────────────────────────────────────────── */
const ghostBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "5px 11px", border: "1px solid #E2E8F0", borderRadius: 7,
  background: "#fff", color: "#64748B", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};
const primaryBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 16px", border: "none", borderRadius: 8,
  background: "#06549d", color: "#fff", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  boxShadow: "0 2px 8px rgba(6,84,157,.3)",
};
