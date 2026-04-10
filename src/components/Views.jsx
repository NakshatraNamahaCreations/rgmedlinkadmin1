import { useState } from "react";
import { C, Card, Btn, Inp, Tag, Pill, KPI, PATHS, Ic } from "./Styles";
import { ROLES_CFG, PATIENTS, dLeft, isExp, fDate, fCur, today, fNum } from "../data/MasterData";

export const OrdView = ({ rx, setRx, role }) => {
  const [toast, setToast] = useState(null);
  const toast_ = (m, t = "ok") => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };
  const canUpdate = ["Admin", "Pharmacist", "Delivery Agent"].includes(role);
  const paid = rx.filter((r) => r.payStatus === "Paid");
  const ORDER_FLOW = ["Processing", "Packed", "Shipped", "Out for Delivery", "Delivered"];

  const advance = (id) => {
    setRx((p) =>
      p.map((r) => {
        if (r.id !== id) return r;
        const curr = ORDER_FLOW.indexOf(r.ordStatus);
        const next = ORDER_FLOW[Math.min(curr + 1, ORDER_FLOW.length - 1)];
        toast_(`${id} advanced to "${next}"`);
        return { ...r, ordStatus: next };
      })
    );
  };

  const courierStats = {};
  rx.forEach((r) => {
    if (r.courier && r.courier !== "-") {
      if (!courierStats[r.courier]) courierStats[r.courier] = { t: 0, d: 0 };
      courierStats[r.courier].t++;
      if (r.ordStatus === "Delivered") courierStats[r.courier].d++;
    }
  });

  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Orders & Delivery</h2>
        <p style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Track dispatch status · Monitor courier performance</p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Object.entries(courierStats).map(([name, s]) => (
          <Card
            key={name}
            sx={{ flex: 1, minWidth: 180, borderLeft: `3px solid ${C.teal}` }}
            ch={
              <div>
                <div style={{ fontWeight: 700, color: C.ink, marginBottom: 8, fontSize: 13 }}>🚚 {name}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.teal, fontFamily: "'DM Mono',monospace" }}>
                  {s.t ? Math.round((s.d / s.t) * 100) : 0}%
                </div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2, marginBottom: 8 }}>
                  Delivery rate · {s.d}/{s.t} orders
                </div>
                <Pill v={s.d} max={s.t || 1} color={C.teal} h={6} />
              </div>
            }
          />
        ))}
        <KPI label="Pending Dispatch" value={rx.filter((r) => r.ordStatus === "Processing" && r.payStatus === "Paid").length} icon="clock" color={C.amber} />
        <KPI label="In Transit" value={rx.filter((r) => ["Shipped", "Out for Delivery"].includes(r.ordStatus)).length} icon="truck" color={C.blue} />
        <KPI label="Delivered" value={rx.filter((r) => r.ordStatus === "Delivered").length} icon="check" color={C.green} />
      </div>
      {paid.length === 0 && <Card ch={<div style={{ textAlign: "center", padding: 40, color: C.ink3 }}>No paid orders yet.</div>} />}
      {paid.map((r) => {
        const curr = ORDER_FLOW.indexOf(r.ordStatus);
        return (
          <Card
            key={r.id}
            sx={{ borderLeft: `3px solid ${C.blue}` }}
            ch={
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{r.pName}</span>
                      <code style={{ fontSize: 11, color: C.blue, background: C.blueT, padding: "2px 7px", borderRadius: 5 }}>
                        {r.id}
                      </code>
                      {r.trackId !== "-" && (
                        <code style={{ fontSize: 10, color: C.ink3, background: C.surface2, padding: "2px 7px", borderRadius: 5 }}>
                          Track: {r.trackId}
                        </code>
                      )}
                      <Tag label={r.courier !== "-" ? r.courier : "No Courier"} color={C.teal} />
                    </div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>
                      {r.meds.length} medicines · {fCur(r.total)} · {r.pPhone}
                    </div>
                    <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                      {r.meds.map((m) => `${m.mName}×${m.qty}`).join(", ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag label={r.ordStatus} color={C.blue} />
                    {canUpdate && r.ordStatus !== "Delivered" && (
                      <Btn
                        ch={`→ ${ORDER_FLOW[Math.min(curr + 1, ORDER_FLOW.length - 1)]}`}
                        icon="truck"
                        sm
                        onClick={() => advance(r.id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            }
          />
        );
      })}
    </div>
  );
};

export const NotiView = ({ rx, role }) => {
  const [notifs, setNotifs] = useState([
    { id: 1, to: "P001 – Ramesh Kumar", type: "Reminder", msg: "Your prescription expires in 5 days. Tap to reorder.", sent: "2026-02-26", status: "Read" },
    { id: 2, to: "P002 – Priya Sharma", type: "Order Update", msg: "Your order has shipped via Delhivery. ETA: 2 days.", sent: "2026-02-27", status: "Sent" },
    { id: 3, to: "All Patients", type: "Broadcast", msg: "Closed on March 10 (Holiday). Pre-order recommended.", sent: "2026-02-25", status: "Sent" },
  ]);
  const canSend = ["Admin", "Pharmacist"].includes(role);

  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Push Notifications</h2>
          <p style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Manual compose · Auto-triggered alerts · Broadcast to all patients</p>
        </div>
      </div>
      <Card
        ch={
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Notification History</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notifs.map((n) => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <Tag label={n.type} color={C.blue} />
                      <span style={{ fontSize: 11, color: C.ink3 }}>→ {n.to}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.ink }}>{n.msg}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Tag label={n.status} color={C.green} />
                    <div style={{ fontSize: 10, color: C.ink3, marginTop: 4 }}>{fDate(n.sent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
};

export const RepView = ({ rx }) => {
  const totalRev = rx.reduce((s, r) => s + r.total, 0);
  const paid = rx.filter((r) => r.payStatus === "Paid").reduce((s, r) => s + r.total, 0);
  const gstTotal = rx.reduce((s, r) => s + r.gst, 0);
  const discountTotal = rx.reduce((s, r) => s + r.discount, 0);
  const outstanding = totalRev - paid;

  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Reports & Business Intelligence</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KPI label="Total Revenue" value={fCur(totalRev)} icon="chart" color={C.blue} trend={12} />
        <KPI label="Collected" value={fCur(paid)} icon="check" color={C.green} />
        <KPI label="Outstanding" value={fCur(outstanding)} icon="alert" color={C.red} />
        <KPI label="GST Collected" value={fCur(gstTotal)} icon="tag" color={C.purple} />
        <KPI label="Total Discounts" value={fCur(discountTotal)} icon="dollar" color={C.amber} />
      </div>
      <Card
        ch={
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Financial Summary</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.ink }}>
                  {["Metric", "Amount", "Percentage"].map((h) => (
                    <th key={h} style={{ padding: "10px 13px", color: "#fff", fontWeight: 600, textAlign: "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Total Revenue", value: totalRev, pct: 100 },
                  { label: "Collected", value: paid, pct: Math.round((paid / totalRev) * 100) },
                  { label: "Outstanding", value: outstanding, pct: Math.round((outstanding / totalRev) * 100) },
                  { label: "GST", value: gstTotal, pct: Math.round((gstTotal / totalRev) * 100) },
                  { label: "Discounts", value: discountTotal, pct: Math.round((discountTotal / totalRev) * 100) },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.surface : C.surface2, borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 13px", fontWeight: 600 }}>{row.label}</td>
                    <td style={{ padding: "10px 13px", fontFamily: "'DM Mono',monospace" }}>
                      {fCur(row.value)}
                    </td>
                    <td style={{ padding: "10px 13px", textAlign: "right" }}>{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />
    </div>
  );
};

export const StaffView = ({ currentRole }) => {
  const [staff] = useState([
    {
      id: "S001",
      name: "Ravi Kumar",
      role: "Pharmacist",
      email: "ravi@rgmedlink.com",
      status: "Active",
      joined: "2024-02-01",
      lastLogin: "2026-02-28",
    },
    {
      id: "S002",
      name: "Meena J.",
      role: "Delivery Agent",
      email: "meena@rgmedlink.com",
      status: "Active",
      joined: "2024-05-15",
      lastLogin: "2026-03-01",
    },
  ]);

  const ALL_MODULES = ["dashboard", "prescriptions", "patients", "inventory", "orders", "notifications", "reports", "staff", "billing"];
  const MODULE_LABELS = {
    dashboard: "Dashboard",
    prescriptions: "Prescriptions",
    patients: "Patients",
    inventory: "Inventory",
    orders: "Orders",
    notifications: "Notifications",
    reports: "Reports",
    staff: "Staff Mgmt",
    billing: "Billing",
  };

  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Staff & Role-Based Access Control</h2>
        <p style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Manage staff, assign roles, and control module-level permissions</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {staff.map((s) => {
          const perms = ROLES_CFG[s.role] || [];
          return (
            <Card
              key={s.id}
              sx={{ borderLeft: `3px solid ${C.blue}` }}
              ch={
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: `linear-gradient(135deg,${C.ink},#374151)`,
                        borderRadius: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {s.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>
                        {s.id} · {s.email}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        <Tag label={s.role} color={C.blue} />
                        <Tag label={s.status} color={C.green} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.ink3,
                        fontWeight: 600,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Module Access ({perms.includes("all") ? ALL_MODULES.length : perms.length}/{ALL_MODULES.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ALL_MODULES.map((mod) => {
                        const has = perms.includes(mod) || perms.includes("all");
                        return (
                          <span
                            key={mod}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 5,
                              background: has ? C.greenT : C.surface3,
                              color: has ? C.green : C.border,
                              border: `1px solid ${has ? C.green + "30" : C.border}`,
                            }}
                          >
                            {MODULE_LABELS[mod]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.ink3 }}>
                    <span>Joined: {fDate(s.joined)}</span>
                    <span>Last login: {s.lastLogin === "-" ? "-" : fDate(s.lastLogin)}</span>
                  </div>
                </div>
              }
            />
          );
        })}
      </div>
    </div>
  );
};