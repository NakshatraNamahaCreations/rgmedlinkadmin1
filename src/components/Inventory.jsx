import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRef } from "react";
import API from "../api";
import { Modal, Ic, PATHS, Btn, Inp, Toast } from "./Styles";

/* ── Constants ──────────────────────────────────────────────────────────── */
const DEF_CATS = ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Medical Device"];
const UNITS = ["Tablet", "Bottle", "Strip", "Tube", "Box"];
const STATUSES = ["Active", "Inactive"];
const PER_PAGE = 10;

/* ── Palette ───────────────────────────────────────────────────────────── */
const P = {
  ink: "#0F172A", ink2: "#1E293B", ink3: "#475569", ink4: "#94A3B8", ink5: "#CBD5E1",
  surface: "#FFFFFF", bg: "#F1F5F9", subtle: "#F8FAFC", muted: "#E2E8F0",

  pri: "#6366F1", priDk: "#4F46E5", priLt: "#EEF2FF", priRing: "#C7D2FE",
  grn: "#10B981", grnDk: "#059669", grnLt: "#ECFDF5", grnRing: "#A7F3D0",
  amb: "#F59E0B", ambDk: "#D97706", ambLt: "#FFFBEB", ambRing: "#FDE68A",
  red: "#EF4444", redDk: "#DC2626", redLt: "#FEF2F2", redRing: "#FECACA",
  teal: "#14B8A6", tealLt: "#F0FDFA",
  purple: "#8B5CF6", purpleLt: "#F5F3FF",

  // Dark header gradient
  heroA: "#0F172A", heroB: "#1E293B", heroC: "#334155",

  shadow: "0 1px 3px rgba(15,23,42,0.06), 0 6px 24px rgba(15,23,42,0.08)",
  shadowLg: "0 4px 6px rgba(15,23,42,0.05), 0 12px 40px rgba(15,23,42,0.12)",
  shadowFloat: "0 20px 60px rgba(15,23,42,0.15), 0 4px 12px rgba(15,23,42,0.06)",

  font: "'DM Sans', -apple-system, sans-serif",
  mono: "'DM Mono', monospace",
  r: 12, rSm: 8, rLg: 16, rXl: 20,
};

/* ── Stock helpers ─────────────────────────────────────────────────────── */
const getStatus = (m) => {
  if (m.status === "Inactive") return { label: "Inactive", c: P.ink4, bg: P.subtle, dot: P.ink5 };
  if (m.stock === 0) return { label: "Out of Stock", c: "#B91C1C", bg: "#FEE2E2", dot: P.redRing };
  if (m.stock > 0 && m.stock <= m.minStock * 0.5) return { label: "Critical", c: P.redDk, bg: P.redLt, dot: P.redRing };
  if (m.stock > m.minStock * 0.5 && m.stock <= m.minStock) return { label: "Low Stock", c: P.ambDk, bg: P.ambLt, dot: P.ambRing };
  return { label: "In Stock", c: P.grnDk, bg: P.grnLt, dot: P.grnRing };
};
const priority = (m) => ({ Critical: 1, "Out of Stock": 2, "Low Stock": 3, Inactive: 4 }[getStatus(m).label] || 5);

/* ── Confirm Dialog ────────────────────────────────────────────────────── */
const Confirm = ({ title, msg, label = "Delete", onYes, onNo }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 2000,
    background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <div className="sc" style={{
      background: P.surface, borderRadius: P.rLg, width: 400,
      boxShadow: P.shadowFloat, overflow: "hidden",
    }}>
      <div style={{ padding: "28px 28px 16px" }}>
        <div style={{
          width: 44, height: 44, borderRadius: P.r, marginBottom: 16,
          background: P.redLt, border: `1px solid ${P.redRing}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Ic d={PATHS.alert} s={20} c={P.redDk} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: P.ink, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: P.ink3, lineHeight: 1.6 }}>{msg}</div>
      </div>
      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 8,
        padding: "16px 28px", background: P.subtle, borderTop: `1px solid ${P.muted}`,
      }}>
        <Btn ch="Cancel" v="ghost" onClick={onNo} />
        <Btn ch={label} v="danger" onClick={onYes} />
      </div>
    </div>
  </div>
);

/* ── Field ─────────────────────────────────────────────────────────────── */
const Field = ({ label, req, span, ch }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: P.ink3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}{req && <span style={{ color: P.red }}> *</span>}
    </label>
    {ch}
  </div>
);

const selSx = {
  width: "100%", padding: "10px 13px", border: `1.5px solid ${P.muted}`,
  borderRadius: P.rSm, fontSize: 13, color: P.ink, background: P.subtle,
  outline: "none", cursor: "pointer", fontFamily: P.font,
};

/* ── Sort Indicator ────────────────────────────────────────────────────── */
const SortIc = ({ on, dir }) => (
  <span style={{ display: "inline-flex", flexDirection: "column", gap: 1, marginLeft: 4, opacity: on ? 1 : 0.25 }}>
    <svg width={7} height={4} viewBox="0 0 7 4"><path d="M3.5 0L7 4H0z" fill={on && dir === "asc" ? P.pri : P.ink4} /></svg>
    <svg width={7} height={4} viewBox="0 0 7 4"><path d="M3.5 4L0 0h7z" fill={on && dir === "desc" ? P.pri : P.ink4} /></svg>
  </span>
);

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
const InventoryMgt = () => {
  const [meds, setMeds] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("All");
  const [editMed, setEditMed] = useState(null);
  const [viewMed, setViewMed] = useState(null);
  const [catModal, setCatModal] = useState(false);
  const [cats, setCats] = useState(DEF_CATS);
  const [newCat, setNewCat] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [sCol, setSCol] = useState("priority");
  const [sDir, setSDir] = useState("asc");
  const [fCat, setFCat] = useState("");       // category filter
  const [fUnit, setFUnit] = useState("");      // unit filter
  const [fDate, setFDate] = useState("all");   // date filter: all | today | week | month | year
  const tableRef = useRef(null);
  const nav = useNavigate();
const location = useLocation();
const selectedMedicine = location.state?.medicineName;

const rowRefs = useRef({});


useEffect(() => {
  if (selectedMedicine) {
    setQ(selectedMedicine);
  }
}, [selectedMedicine]);

useEffect(() => {
  if (location.state?.tab) {
    setTab(location.state.tab);
  }
}, [location.state]);


useEffect(() => {
  if (location.state?.scrollTo === "table") {
    setTimeout(() => {
      tableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200); // small delay for render
  }
}, [location.state]);

  const t_ = useCallback((msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API.get("/dashboard/summary");
      setDash(r.data); setMeds(r.data.medicines || []);
    } catch (err) { console.error("Inventory load error:", err); t_("Failed to load inventory", "err"); }
    finally { setLoading(false); }
  }, [t_]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSel(new Set()); }, [q, tab, fCat, fUnit, fDate]);

  const save = async () => {
    try {
      if (editMed._id) { await API.put(`/medicines/${editMed._id}`, editMed); t_(`${editMed.name} updated`); }
      else { await API.post("/medicines", editMed); t_(`${editMed.name} added`); }
      setEditMed(null); load();
    } catch { t_("Save failed", "err"); }
  };

  const del = (id, name) => setConfirm({
    title: "Remove Medicine", msg: `Delete "${name}" permanently? This cannot be undone.`, label: "Delete",
    onYes: async () => { setConfirm(null); try { await API.delete(`/medicines/${id}`); t_("Deleted", "warn"); load(); } catch { t_("Delete failed", "err"); } },
  });

  const toggleActive = async (m) => {
    const ns = m.status === "Active" ? "Inactive" : "Active";
    try { await API.put(`/medicines/${m._id}`, { ...m, status: ns }); t_(`${m.name} → ${ns}`); load(); }
    catch { t_("Update failed", "err"); }
  };

  /* ── Derived ── */
  const total = meds.reduce((a, m) => a + (m.stock || 0), 0);
  const inStk = meds.filter(m => getStatus(m).label === "In Stock").length;
  const low = meds.filter(m => getStatus(m).label === "Low Stock").length;
  const crit = meds.filter(m => ["Critical", "Out of Stock"].includes(getStatus(m).label)).length;
  const inact = meds.filter(m => m.status === "Inactive").length;

  const doSort = (c) => { if (sCol === c) setSDir(d => d === "asc" ? "desc" : "asc"); else { setSCol(c); setSDir("asc"); } };

  /* Unique categories & units for filter dropdowns */
  const catOptions = useMemo(() => [...new Set(meds.map(m => m.category).filter(Boolean))].sort(), [meds]);
  const unitOptions = useMemo(() => [...new Set(meds.map(m => m.unit).filter(Boolean))].sort(), [meds]);

  /* Date range helper */
  const dateRange = useMemo(() => {
    const now = new Date();
    if (fDate === "today") {
      const s = new Date(now); s.setHours(0,0,0,0);
      return s;
    }
    if (fDate === "week") {
      const s = new Date(now); s.setDate(s.getDate() - 7); s.setHours(0,0,0,0);
      return s;
    }
    if (fDate === "month") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return s;
    }
    if (fDate === "year") {
      const s = new Date(now.getFullYear(), 0, 1);
      return s;
    }
    return null;
  }, [fDate]);

  /* All medicines ranked by demand (high → low) */
  const allByDemand = useMemo(() => {
    return [...meds].sort((a, b) => (b.demand30 || 0) - (a.demand30 || 0));
  }, [meds]);

  const topSellers = useMemo(() => allByDemand.filter(m => (m.demand30 || 0) > 0).slice(0, 5), [allByDemand]);
  const maxDemand = topSellers.length > 0 ? topSellers[0].demand30 : 1;

  const filtered = useMemo(() => {
    let d = meds.filter(m => (m.name || "").toLowerCase().includes(q.toLowerCase()) || (m.category || "").toLowerCase().includes(q.toLowerCase()));
    if (tab === "InStock") d = d.filter(m => getStatus(m).label === "In Stock");
    else if (tab === "Low") d = d.filter(m => getStatus(m).label === "Low Stock");
    else if (tab === "Crit") d = d.filter(m => ["Critical", "Out of Stock"].includes(getStatus(m).label));
    else if (tab === "Off") d = d.filter(m => m.status === "Inactive");
    if (fCat) d = d.filter(m => m.category === fCat);
    if (fUnit) d = d.filter(m => m.unit === fUnit);
    if (dateRange) d = d.filter(m => m.createdAt && new Date(m.createdAt) >= dateRange);
    return [...d].sort((a, b) => {
      const dir = sDir === "asc" ? 1 : -1;
      if (sCol === "priority") return (priority(a) - priority(b)) * dir || (a.stock - b.stock) * dir;
      if (sCol === "name") return (a.name || "").localeCompare(b.name || "") * dir;
      if (sCol === "price") return ((a.price || 0) - (b.price || 0)) * dir;
      if (sCol === "stock") return ((a.stock || 0) - (b.stock || 0)) * dir;
      if (sCol === "demand") return ((a.demand30 || 0) - (b.demand30 || 0)) * dir;
      return 0;
    });
  }, [meds, q, tab, sCol, sDir, fCat, fUnit, dateRange]);

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const rows = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

useEffect(() => {
  if (!selectedMedicine) return;

  const key = Object.keys(rowRefs.current).find(
    (k) => k.toLowerCase() === selectedMedicine.toLowerCase()
  );

  if (key && rowRefs.current[key]) {
    rowRefs.current[key].scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}, [selectedMedicine, rows]);


  const allSel = rows.length > 0 && rows.every(m => sel.has(m._id));
  const toggleAll = () => { if (allSel) setSel(new Set()); else setSel(new Set(rows.map(m => m._id))); };
  const toggleOne = (id) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const costP = parseFloat(editMed?.costPrice) || 0;
  const sellP = parseFloat(editMed?.sellingPrice) || 0;
  const profitPerUnit = sellP - costP;
  const profitMargin = sellP > 0 ? ((profitPerUnit / sellP) * 100).toFixed(1) : 0;
  const profitColor = profitPerUnit > 0 ? P.grn : profitPerUnit < 0 ? P.red : P.ink4;

  const TABS = [
    { id: "All", l: "All Items", n: meds.length },
    { id: "InStock", l: "In Stock", n: inStk },
    { id: "Low", l: "Low Stock", n: low },
    { id: "Crit", l: "Critical", n: crit },
    { id: "Off", l: "Inactive", n: inact },
  ];

  const COLS = [
    { k: "name", l: "Medicine", sort: true },
    { k: "price", l: "Price", sort: true },
    { k: "stock", l: "Stock", sort: true },
    { k: "status", l: "Status" },
    { k: "stockout", l: "Stockout" },
    { k: "demand", l: "Demand 30d", sort: true },
    { k: "reorder", l: "Reorder" },
    { k: "act", l: "" },
  ];

  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <Confirm title={confirm.title} msg={confirm.msg} label={confirm.label} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}

      {/* ═══════════════ PAGE HEADER ═══════════════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: P.ink4, fontWeight: 500 }}>Pharmacy</span>
            <span style={{ fontSize: 12, color: P.ink5 }}>/</span>
            <span style={{ fontSize: 12, color: P.pri, fontWeight: 600 }}>Inventory</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: P.ink, letterSpacing: "-0.03em", margin: 0 }}>
            Inventory Management
          </h1>
          <p style={{ fontSize: 13, color: P.ink4, marginTop: 3 }}>
            Stock monitoring, demand forecasting & reorder alerts
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn ch="Refresh" v="subtle" icon="refresh" sm onClick={load} />
          <Btn ch="Export" v="subtle" icon="download" sm onClick={() => {
            const h = "Name,Category,Unit,Price,Stock,MinStock,Status\n";
            const r = meds.map(m => `${m.name},${m.category},${m.unit},${m.price},${m.stock},${m.minStock},${m.status}`).join("\n");
            const b = new Blob([h + r], { type: "text/csv" }); const a = document.createElement("a");
            a.href = URL.createObjectURL(b); a.download = "inventory.csv"; a.click();
          }} />
          <Btn ch="Add Medicine" icon="plus" onClick={() => setEditMed({
            name: "", category: "", costPrice: "", sellingPrice: "", price: "", unit: "Tablet", stock: "", minStock: "", status: "Active", inactiveReason: "",
          })} />
        </div>
      </div>

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { l: "Total SKUs", v: dash?.totalSKUs || meds.length, c: P.pri, bg: P.priLt, ic: PATHS.box },
          { l: "Units in Stock", v: total, c: P.teal, bg: P.tealLt, ic: PATHS.trending },
          { l: "In Stock", v: inStk, c: P.grn, bg: P.grnLt, ic: PATHS.check, click: () => setTab("InStock") },
          { l: "Low Stock", v: low, c: P.amb, bg: P.ambLt, ic: PATHS.alert, sub: low > 0 ? "Reorder soon" : null, click: () => setTab("Low") },
          { l: "Critical / OOS", v: crit, c: P.red, bg: P.redLt, ic: PATHS.alert, sub: crit > 0 ? "Urgent" : null, click: () => setTab("Crit") },
        ].map((k, i) => {
          const tabId = ["All", "All", "InStock", "Low", "Crit"][i];
          const isActive = i > 1 && tab === tabId;
          return (
            <div key={i} onClick={k.click} className="card-hover" style={{
              background: P.surface, borderRadius: P.r, padding: "16px 18px",
              boxShadow: isActive ? `0 0 0 1.5px ${k.c}, ${P.shadow}` : P.shadow,
              border: `1px solid ${isActive ? k.c + "30" : P.muted}`,
              cursor: k.click ? "pointer" : "default",
              transition: "all .2s", position: "relative", overflow: "hidden",
            }}>
              {/* Top accent line */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${k.c}, ${k.c}60)`,
              }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: P.rSm, flexShrink: 0,
                  background: k.bg, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Ic d={k.ic} s={16} c={k.c} />
                </div>
                <span style={{ fontSize: 11, color: P.ink4, fontWeight: 500 }}>{k.l}</span>
              </div>
              <div style={{
                fontSize: 24, fontWeight: 800, color: P.ink, lineHeight: 1,
                letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums",
              }}>
                {typeof k.v === "number" ? k.v.toLocaleString() : k.v}
              </div>
              {k.sub && (
                <div style={{
                  marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 9px", borderRadius: 99,
                  background: `${k.c}10`, fontSize: 10, fontWeight: 700, color: k.c,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: k.c, animation: "pulseRing 2s infinite" }} />
                  {k.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════════════ TOP SELLERS ═══════════════ */}
      {topSellers.length > 0 && (
        <div style={{
          background: P.surface, borderRadius: P.rLg,
          boxShadow: P.shadow, border: `1px solid ${P.muted}`, overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: `1px solid ${P.muted}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: P.rSm,
                background: `linear-gradient(135deg, ${P.grn}, ${P.teal})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Ic d={PATHS.trending} s={14} c="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.ink }}>Top Selling Products</div>
                <div style={{ fontSize: 11, color: P.ink4, marginTop: 1 }}>Based on 30-day demand</div>
              </div>
            </div>
            <button onClick={() => nav("/inventory/sales-ranking")} style={{
              fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 99,
              background: P.priLt, color: P.pri, border: `1px solid ${P.priRing}`,
              cursor: "pointer", fontFamily: P.font, display: "flex", alignItems: "center", gap: 5,
            }}>
              View All <Ic d={PATHS.eye} s={12} c={P.pri} />
            </button>
          </div>

          {/* Table-style rows */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${P.muted}` }}>
                {["Rank", "Product", "Category", "30d Demand", "Stock", "Price", "Status"].map(h => (
                  <th key={h} style={{
                    padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
                    color: P.ink4, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topSellers.map((m, i) => {
                const st = getStatus(m);
                const pct = Math.round(((m.demand30 || 0) / maxDemand) * 100);
                const medalBg = i === 0 ? "#FEF3C7" : i === 1 ? "#F1F5F9" : i === 2 ? "#FFF7ED" : "transparent";
                const medalC = i === 0 ? "#B45309" : i === 1 ? "#475569" : i === 2 ? "#C2410C" : P.ink4;
                return (
                  <tr key={m._id} style={{
                    borderBottom: `1px solid #F1F5F9`,
                    background: i === 0 ? `${P.grnLt}50` : i % 2 === 0 ? P.surface : "#FAFBFC",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F5F7FF"}
                    onMouseLeave={e => e.currentTarget.style.background = i === 0 ? `${P.grnLt}50` : i % 2 === 0 ? P.surface : "#FAFBFC"}
                  >
                    <td style={{ padding: "10px 14px", width: 50, textAlign: "center" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 26, height: 26, borderRadius: 7, background: medalBg,
                        fontSize: 11, fontWeight: 800, color: medalC,
                      }}>{i + 1}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: P.ink }}>{m.name}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: P.priDk, background: P.priLt, padding: "2px 8px", borderRadius: 99 }}>
                        {m.category || "--"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", minWidth: 150 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: P.pri, fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{m.demand30}</span>
                        <div style={{ flex: 1, height: 5, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${P.pri}, ${P.purple})` }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontWeight: 700, color: m.stock <= (m.minStock || 0) ? P.redDk : P.ink, fontVariantNumeric: "tabular-nums" }}>{m.stock}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: P.ink, fontVariantNumeric: "tabular-nums" }}>
                      ₹{m.sellingPrice || m.price}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 10, fontWeight: 700, color: st.c,
                        background: st.bg, padding: "3px 8px", borderRadius: 99,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.c }} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════ INVENTORY TABLE ═══════════════ */}
      <div style={{
        background: P.surface, borderRadius: P.rLg,
        boxShadow: P.shadow, border: `1px solid ${P.muted}`, overflow: "hidden",
      }} ref={tableRef} >
        {/* Toolbar Row 1: Tabs + Date pills */}
        <div style={{
          padding: "12px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 10, flexWrap: "wrap",
        }}>
          {/* Tabs */}
          <div style={{
            display: "inline-flex", gap: 1, padding: 3,
            background: "#F1F5F9", borderRadius: P.rSm, border: `1px solid ${P.muted}`,
          }}>
            {TABS.map(t => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "5px 13px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: on ? P.surface : "transparent",
                  boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  color: on ? P.ink : P.ink4, fontSize: 12, fontWeight: on ? 700 : 500,
                  fontFamily: P.font, transition: "all .15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {t.l}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "0 6px", borderRadius: 99,
                    background: on ? P.priLt : "#E2E8F0", color: on ? P.pri : P.ink4,
                    fontVariantNumeric: "tabular-nums",
                  }}>{t.n}</span>
                </button>
              );
            })}
          </div>

          {/* Date Filter Pills */}
          <div style={{
            display: "inline-flex", gap: 1, padding: 3,
            background: "#F1F5F9", borderRadius: P.rSm, border: `1px solid ${P.muted}`,
          }}>
            {[
              { id: "all", l: "All Time" },
              { id: "today", l: "Today" },
              { id: "week", l: "This Week" },
              { id: "month", l: "This Month" },
              { id: "year", l: "This Year" },
            ].map(d => {
              const on = fDate === d.id;
              return (
                <button key={d.id} onClick={() => setFDate(d.id)} style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: on ? P.surface : "transparent",
                  boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  color: on ? P.pri : P.ink4, fontSize: 11, fontWeight: on ? 700 : 500,
                  fontFamily: P.font, transition: "all .15s",
                }}>
                  {d.l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar Row 2: Search + Filters */}
        <div style={{
          padding: "10px 18px 12px", borderBottom: `1px solid ${P.muted}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 8, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            {sel.size > 0 && (
              <span style={{
                padding: "4px 12px", borderRadius: P.rSm,
                background: P.priLt, fontSize: 12, fontWeight: 600, color: P.pri,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {sel.size} selected
                <button onClick={() => setSel(new Set())} style={{
                  background: "none", border: "none", color: P.pri,
                  fontWeight: 700, cursor: "pointer", fontSize: 11, fontFamily: P.font,
                }}>x</button>
              </span>
            )}
            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: P.subtle, border: `1.5px solid ${P.muted}`,
              borderRadius: P.rSm, padding: "6px 12px", minWidth: 220,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={P.ink5} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search name or category..."
                value={q} onChange={e => setQ(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: P.ink, width: "100%", fontFamily: P.font }}
              />
              {q && <button onClick={() => setQ("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><Ic d={PATHS.x} s={12} c={P.ink5} /></button>}
            </div>

            {/* Category Filter */}
            <select
              value={fCat} onChange={e => setFCat(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: P.rSm, fontSize: 12, fontWeight: 500,
                border: `1.5px solid ${fCat ? P.pri + "50" : P.muted}`, background: fCat ? P.priLt : P.subtle,
                color: fCat ? P.pri : P.ink3, outline: "none", cursor: "pointer", fontFamily: P.font,
              }}
            >
              <option value="">All Categories</option>
              {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Unit Filter */}
            <select
              value={fUnit} onChange={e => setFUnit(e.target.value)}
              style={{
                padding: "6px 10px", borderRadius: P.rSm, fontSize: 12, fontWeight: 500,
                border: `1.5px solid ${fUnit ? P.pri + "50" : P.muted}`, background: fUnit ? P.priLt : P.subtle,
                color: fUnit ? P.pri : P.ink3, outline: "none", cursor: "pointer", fontFamily: P.font,
              }}
            >
              <option value="">All Units</option>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Clear Filters */}
            {(fCat || fUnit || q || fDate !== "all") && (
              <button onClick={() => { setFCat(""); setFUnit(""); setQ(""); setFDate("all"); }} style={{
                padding: "5px 10px", borderRadius: P.rSm, border: `1px solid ${P.redRing}`,
                background: P.redLt, color: P.red, fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: P.font, display: "flex", alignItems: "center", gap: 4,
              }}>
                <Ic d={PATHS.x} s={10} c={P.red} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
            <thead>
              <tr style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)", borderBottom: `2px solid ${P.muted}` }}>
                <th style={{ padding: "9px 10px 9px 18px", width: 36 }}>
                  <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width: 14, height: 14, cursor: "pointer", accentColor: P.pri }} />
                </th>
                {COLS.map(c => (
                  <th key={c.k} onClick={c.sort ? () => doSort(c.k) : undefined} style={{
                    padding: "9px 12px", textAlign: "left",
                    fontSize: 10.5, fontWeight: 700, color: P.ink4,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    cursor: c.sort ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {c.l}{c.sort && <SortIc on={sCol === c.k} dir={sDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={COLS.length + 1} style={{ padding: "56px 0", textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid #F1F5F9`, borderTopColor: P.pri, animation: "spin .7s linear infinite", margin: "0 auto 10px" }} />
                  <div style={{ fontSize: 13, color: P.ink4 }}>Loading inventory…</div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={COLS.length + 1} style={{ padding: "56px 0", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: P.r, background: P.subtle, border: `1px solid ${P.muted}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Ic d={PATHS.box} s={22} c={P.ink5} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: P.ink4 }}>No medicines found</div>
                  <div style={{ fontSize: 12, color: P.ink5, marginTop: 3 }}>{q ? "Adjust search or filters" : "Add medicines to begin"}</div>
                </td></tr>
              ) : rows.map((m, idx) => {
                const st = getStatus(m);
                const pct = Math.min((m.stock / ((m.minStock || 1) * 2)) * 100, 100);
                const urg = ["Critical", "Out of Stock"].includes(st.label);
                const on = sel.has(m._id);
                const bg = on ? `${P.pri}06` : urg ? "#FFF8F8" : st.label === "Low Stock" ? "#FEFCE8" : idx % 2 === 0 ? P.surface : P.subtle;
                const isSelected =
                  selectedMedicine?.toLowerCase() === m.name?.toLowerCase();

                return (
                  <tr
                    key={m._id}
                    ref={(el) => (rowRefs.current[m.name] = el)}
                    style={{
                      background: isSelected ? "#EEF2FF" : bg,
                      borderBottom: `1px solid #F1F5F9`,
                      transition: "0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !on) {
                        e.currentTarget.style.background = "#F5F7FF";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !on) {
                        e.currentTarget.style.background = bg;
                      }
                    }}
                  >
                    <td style={{ padding: "9px 10px 9px 18px" }}>
                      <input type="checkbox" checked={on} onChange={() => toggleOne(m._id)} style={{ width: 14, height: 14, cursor: "pointer", accentColor: P.pri }} />
                    </td>

                    {/* Name */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: P.ink, marginBottom: 3 }}>{m.name}</div>
                      <span style={{
                        background: P.priLt, color: P.priDk, fontSize: 10, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 99, border: `1px solid ${P.pri}12`,
                      }}>{m.category || "—"}</span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: P.ink, fontVariantNumeric: "tabular-nums" }}>₹{m.sellingPrice || m.price}</span>
                      {m.costPrice > 0 && (
                        <div style={{ fontSize: 10, color: (m.sellingPrice || 0) >= (m.costPrice || 0) ? P.grnDk : P.redDk, marginTop: 1, fontWeight: 600 }}>
                          {((m.sellingPrice || 0) - (m.costPrice || 0) >= 0 ? "+" : "")}₹{((m.sellingPrice || 0) - (m.costPrice || 0)).toFixed(0)} profit
                        </div>
                      )}
                      {!(m.costPrice > 0) && <div style={{ fontSize: 10, color: P.ink5, marginTop: 1 }}>{m.unit || "unit"}</div>}
                    </td>

                    {/* Stock */}
                    <td style={{ padding: "10px 12px", minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: m.stock <= (m.minStock || 0) ? P.redDk : P.ink, fontVariantNumeric: "tabular-nums" }}>{m.stock}</span>
                        <span style={{ fontSize: 10, color: P.ink5 }}>/ {m.minStock}</span>
                      </div>
                      <div style={{ height: 4, background: "#F1F5F9", borderRadius: 99, overflow: "hidden", maxWidth: 90 }}>
                        <div style={{
                          width: `${pct}%`, height: "100%", borderRadius: 99, transition: "width .5s",
                          background: m.stock <= (m.minStock || 0) * 0.5
                            ? `linear-gradient(90deg,${P.red},#F87171)`
                            : m.stock <= (m.minStock || 0)
                            ? `linear-gradient(90deg,${P.amb},#FBBF24)`
                            : `linear-gradient(90deg,${P.grn},#34D399)`,
                        }} />
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: st.bg, color: st.c,
                        fontSize: 10.5, fontWeight: 700,
                        padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap",
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%", background: st.c,
                          animation: urg ? "pulseRing 2s infinite" : "none",
                        }} />
                        {st.label}
                      </span>
                    </td>

                    {/* Stockout */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                        color: (m.daysUntilStockout || 999) < 7 ? P.redDk : (m.daysUntilStockout || 999) < 14 ? P.ambDk : P.grnDk,
                      }}>
                        {m.daysUntilStockout != null ? `${m.daysUntilStockout}d` : "—"}
                      </span>
                    </td>

                    {/* Demand */}
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: P.pri, fontVariantNumeric: "tabular-nums" }}>{m.demand30 || 0}</span>
                    </td>

                    {/* Reorder */}
                    <td style={{ padding: "10px 12px" }}>
                      {m.autoReorderQty > 0 ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          background: P.ambLt, color: P.ambDk,
                          fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                        }}>
                          <Ic d={PATHS.trending} s={10} c={P.amb} />{m.autoReorderQty}
                        </span>
                      ) : (
                        <span style={{ color: P.grn, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Ic d={PATHS.check} s={11} c={P.grn} />OK
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        {[
                          { t: "View", ic: PATHS.eye, c: P.pri, bg: P.priLt, fn: () => setViewMed(m) },
                          { t: "Edit", ic: PATHS.edit, c: P.ink4, bg: P.subtle, fn: () => setEditMed(m) },
                          { t: m.status === "Active" ? "Deactivate" : "Activate", ic: m.status === "Active" ? PATHS.lock : PATHS.unlock, c: m.status === "Active" ? P.amb : P.grn, bg: m.status === "Active" ? P.ambLt : P.grnLt, fn: () => toggleActive(m) },
                          { t: "Delete", ic: PATHS.trash, c: P.red, bg: P.redLt, fn: () => del(m._id, m.name) },
                        ].map((b, i) => (
                          <button key={i} title={b.t} onClick={b.fn} style={{
                            width: 28, height: 28, borderRadius: 7,
                            background: b.bg, border: `1px solid ${b.c}12`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all .15s",
                          }}><Ic d={b.ic} s={12} c={b.c} /></button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 0 && (
          <div style={{
            padding: "10px 18px", borderTop: `1px solid ${P.muted}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: P.ink4, fontVariantNumeric: "tabular-nums" }}>
              <b style={{ color: P.ink3 }}>{filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}</b> of <b style={{ color: P.ink3 }}>{filtered.length}</b>
            </span>
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
              <PgBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</PgBtn>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                let p;
                if (pages <= 7) p = i + 1;
                else if (page <= 4) p = i + 1;
                else if (page >= pages - 3) p = pages - 6 + i;
                else p = page - 3 + i;
                return <PgBtn key={p} active={page === p} onClick={() => setPage(p)}>{p}</PgBtn>;
              })}
              <PgBtn disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</PgBtn>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ VIEW MODAL ═══════════════ */}
      {viewMed && (() => {
        const st = getStatus(viewMed);
        const pct = Math.min((viewMed.stock / ((viewMed.minStock || 1) * 2)) * 100, 100);
        return (
          <Modal title={viewMed.name} sub={`${viewMed.category || "No category"} · ${viewMed.unit || "—"}`} w={560} onClose={() => setViewMed(null)}
            ch={
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  background: `linear-gradient(135deg, ${st.bg}, ${st.bg}80)`,
                  border: `1px solid ${st.c}18`, borderRadius: P.r, padding: "14px 18px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.c }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: st.c }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: P.ink3, marginTop: 4 }}>{viewMed.stock} units · Min: {viewMed.minStock}</div>
                  </div>
                  {viewMed.autoReorderQty > 0 && (
                    <span style={{ background: P.ambLt, color: P.ambDk, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 99 }}>
                      Reorder: {viewMed.autoReorderQty}
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: P.ink3 }}>
                    <span style={{ fontWeight: 600 }}>Stock Health</span>
                    <span style={{ fontWeight: 700, fontFamily: P.mono, color: P.ink }}>{viewMed.stock} / {(viewMed.minStock || 0) * 2}</span>
                  </div>
                  <div style={{ height: 8, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: 99,
                      background: viewMed.stock <= (viewMed.minStock || 0) * 0.5 ? `linear-gradient(90deg,${P.red},#F87171)` : viewMed.stock <= (viewMed.minStock || 0) ? `linear-gradient(90deg,${P.amb},#FBBF24)` : `linear-gradient(90deg,${P.grn},#34D399)`,
                    }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { l: "Cost Price", v: viewMed.costPrice ? `₹${viewMed.costPrice}` : "—", ic: PATHS.dollar },
                    { l: "Selling Price", v: `₹${viewMed.sellingPrice || viewMed.price}`, ic: PATHS.dollar },
                    { l: "Profit/Unit", v: viewMed.costPrice ? `₹${((viewMed.sellingPrice || 0) - viewMed.costPrice).toFixed(2)}` : "—", ic: PATHS.trending },
                    { l: "Margin", v: viewMed.profitMargin != null ? `${viewMed.profitMargin}%` : "—", ic: PATHS.chart },
                    { l: "Current Stock", v: viewMed.stock, ic: PATHS.box },
                    { l: "Min Stock", v: viewMed.minStock, ic: PATHS.alert },
                    { l: "Stockout", v: viewMed.daysUntilStockout != null ? `${viewMed.daysUntilStockout}d` : "—", ic: PATHS.clock },
                    { l: "30d Demand", v: viewMed.demand30 || 0, ic: PATHS.forecast },
                  ].map(r => (
                    <div key={r.l} style={{
                      background: P.subtle, border: `1px solid ${P.muted}`, borderRadius: P.rSm,
                      padding: "11px 13px", display: "flex", gap: 10,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: P.priLt, display: "flex", alignItems: "center", justifyContent: "center",
                      }}><Ic d={r.ic} s={12} c={P.pri} /></div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: P.ink5, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{r.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: P.ink, fontVariantNumeric: "tabular-nums" }}>{r.v}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {viewMed.status === "Inactive" && viewMed.inactiveReason && (
                  <div style={{ background: P.redLt, border: `1px solid ${P.redRing}`, borderRadius: P.rSm, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P.redDk, marginBottom: 3 }}>Deactivation Reason</div>
                    <div style={{ fontSize: 13, color: P.ink2, lineHeight: 1.5 }}>{viewMed.inactiveReason}</div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 6, borderTop: `1px solid ${P.muted}` }}>
                  <Btn ch="Edit" v="subtle" icon="edit" onClick={() => { setEditMed(viewMed); setViewMed(null); }} />
                  <Btn ch="Delete" v="danger" onClick={() => { del(viewMed._id, viewMed.name); setViewMed(null); }} />
                </div>
              </div>
            }
          />
        );
      })()}

      {/* ═══════════════ ADD / EDIT MODAL ═══════════════ */}
      {editMed && (
        <Modal
          title={editMed._id ? "Edit Medicine" : "Add New Medicine"}
          sub={editMed._id ? `Editing ${editMed.name}` : "Add a new item to your inventory"}
          w={600} onClose={() => setEditMed(null)}
          ch={
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Basic */}
              <div>
                <SectionHead color={P.pri} label="Basic Information" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Medicine Name" req span={2} ch={
                    <Inp value={editMed.name} onChange={e => setEditMed({ ...editMed, name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
                  } />
                  <Field label="Category" req ch={
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={editMed.category} onChange={e => setEditMed({ ...editMed, category: e.target.value })} style={{ ...selSx, flex: 1 }}>
                        <option value="">Select</option>
                        {cats.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <button onClick={() => setCatModal(true)} style={{
                        width: 40, height: 40, flexShrink: 0, borderRadius: P.rSm,
                        border: `1.5px solid ${P.muted}`, background: P.subtle,
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      }}><Ic d={PATHS.plus} s={14} c={P.pri} /></button>
                    </div>
                  } />
                  <Field label="Unit" ch={
                    <select value={editMed.unit} onChange={e => setEditMed({ ...editMed, unit: e.target.value })} style={selSx}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  } />
                </div>
              </div>

              {/* Pricing */}
              <div>
                <SectionHead color={P.grn} label="Pricing & Profit" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Cost Price (₹)" req ch={
                    <Inp type="number" value={editMed.costPrice} placeholder="0.00"
                      onChange={e => {
                        const cp = e.target.value;
                        setEditMed({ ...editMed, costPrice: cp, price: cp });
                      }}
                    />
                  } />
                  <Field label="Selling Price (₹)" req ch={
                    <Inp type="number" value={editMed.sellingPrice} placeholder="0.00"
                      onChange={e => setEditMed({ ...editMed, sellingPrice: e.target.value })}
                    />
                  } />
                </div>

                {/* Live Profit Calculator */}
                {(costP > 0 || sellP > 0) && (
                  <div style={{
                    marginTop: 14, borderRadius: P.r, overflow: "hidden",
                    border: `1px solid ${profitPerUnit >= 0 ? P.grnRing : P.redRing}`,
                  }}>
                    <div style={{
                      background: profitPerUnit >= 0
                        ? `linear-gradient(135deg, ${P.grnLt}, #D1FAE5)`
                        : `linear-gradient(135deg, ${P.redLt}, #FEE2E2)`,
                      padding: "14px 18px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: P.rSm,
                          background: P.surface, border: `1px solid ${profitColor}20`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Ic d={PATHS.trending} s={15} c={profitColor} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: profitColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {profitPerUnit >= 0 ? "Profit per Unit" : "Loss per Unit"}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: profitColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                            ₹{Math.abs(profitPerUnit).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: P.ink4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Margin
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: profitColor, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                          {profitMargin}%
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
                      background: P.surface, borderTop: `1px solid ${profitPerUnit >= 0 ? P.grnRing : P.redRing}40`,
                    }}>
                      {[
                        { l: "Cost Price", v: `₹${costP.toFixed(2)}` },
                        { l: "Selling Price", v: `₹${sellP.toFixed(2)}` },
                        { l: "GST (12%)", v: `₹${(sellP * 0.12).toFixed(2)}` },
                      ].map((item, idx) => (
                        <div key={item.l} style={{
                          padding: "10px 14px", textAlign: "center",
                          borderRight: idx < 2 ? `1px solid ${P.muted}` : "none",
                        }}>
                          <div style={{ fontSize: 10, color: P.ink4, fontWeight: 600, marginBottom: 2 }}>{item.l}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: P.ink, fontVariantNumeric: "tabular-nums" }}>{item.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stock */}
              <div>
                <SectionHead color={P.pri} label="Stock & Status" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Current Stock" req ch={<Inp type="number" value={editMed.stock} onChange={e => setEditMed({ ...editMed, stock: e.target.value })} placeholder="0" />} />
                  <Field label="Min Stock (Reorder Point)" req ch={<Inp type="number" value={editMed.minStock} onChange={e => setEditMed({ ...editMed, minStock: e.target.value })} placeholder="0" />} />
                  <Field label="Status" ch={
                    <select value={editMed.status} onChange={e => setEditMed({ ...editMed, status: e.target.value })} style={selSx}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  } />
                </div>
              </div>

              {editMed.status === "Inactive" && (
                <Field label="Deactivation Reason" ch={
                  <textarea value={editMed.inactiveReason || ""} placeholder="e.g. Expired batch, Discontinued…"
                    onChange={e => setEditMed({ ...editMed, inactiveReason: e.target.value })}
                    style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${P.muted}`, borderRadius: P.rSm, fontSize: 13, color: P.ink, background: P.subtle, outline: "none", resize: "none", minHeight: 70, fontFamily: P.font }}
                  />
                } />
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: `1px solid ${P.muted}` }}>
                <Btn ch="Cancel" v="ghost" onClick={() => setEditMed(null)} />
                <Btn ch={editMed._id ? "Save Changes" : "Add to Inventory"} onClick={save} />
              </div>
            </div>
          }
        />
      )}

      {/* ═══════════════ CATEGORY MODAL ═══════════════ */}
      {catModal && (
        <Modal title="Add Category" sub="Create a custom medicine category" w={400} onClose={() => setCatModal(false)}
          ch={
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Category Name" req ch={<Inp placeholder="e.g. Antibiotic, Vitamin…" value={newCat} onChange={e => setNewCat(e.target.value)} />} />
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {cats.map(c => (
                  <span key={c} style={{ background: P.subtle, border: `1px solid ${P.muted}`, padding: "3px 10px", borderRadius: 99, fontSize: 10.5, color: P.ink3, fontWeight: 500 }}>{c}</span>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: `1px solid ${P.muted}` }}>
                <Btn ch="Cancel" v="ghost" onClick={() => setCatModal(false)} />
                <Btn ch="Add" onClick={() => {
                  if (!newCat.trim()) return;
                  setCats(p => [...p, newCat.trim()]);
                  if (editMed) setEditMed({ ...editMed, category: newCat.trim() });
                  setNewCat(""); setCatModal(false);
                }} />
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};

/* ── Micro helpers ──────────────────────────────────────────────────────── */
const PgBtn = ({ children, active, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{
    minWidth: active !== undefined && !children?.toString?.().includes("→") && !children?.toString?.().includes("←") ? 30 : "auto",
    height: 30, padding: "0 10px", borderRadius: P.rSm,
    border: active ? "none" : `1px solid ${P.muted}`,
    background: active ? P.pri : P.surface,
    color: active ? "#fff" : disabled ? P.ink5 : P.ink3,
    fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: P.font, opacity: disabled ? 0.4 : 1,
    boxShadow: active ? "0 2px 8px rgba(99,102,241,0.3)" : "none",
    transition: "all .15s",
  }}>{children}</button>
);

const SectionHead = ({ color, label }) => (
  <div style={{
    fontSize: 11, fontWeight: 800, color, textTransform: "uppercase",
    letterSpacing: "0.08em", marginBottom: 14,
    display: "flex", alignItems: "center", gap: 8,
  }}>
    <div style={{ width: 18, height: 2, background: color, borderRadius: 2 }} />
    {label}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   SALES RANKING PAGE
   /inventory/sales-ranking
   ══════════════════════════════════════════════════════════════════════════ */
export const SalesRanking = () => {
  const nav = useNavigate();
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("desc"); // desc = high→low, asc = low→high

  useEffect(() => {
    (async () => {
      try {
        const r = await API.get("/dashboard/summary");
        setMeds(r.data.medicines || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const sorted = useMemo(() => {
    let list = [...meds];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => (m.name || "").toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q));
    }
    list.sort((a, b) => sortDir === "desc"
      ? (b.demand30 || 0) - (a.demand30 || 0)
      : (a.demand30 || 0) - (b.demand30 || 0)
    );
    return list;
  }, [meds, search, sortDir]);

  const maxDemand = useMemo(() => {
    const top = [...meds].sort((a, b) => (b.demand30 || 0) - (a.demand30 || 0))[0];
    return top?.demand30 || 1;
  }, [meds]);

  const totalDemand = meds.reduce((s, m) => s + (m.demand30 || 0), 0);
  const avgDemand = meds.length > 0 ? Math.round(totalDemand / meds.length) : 0;
  const highSellers = meds.filter(m => (m.demand30 || 0) > avgDemand).length;
  const noSales = meds.filter(m => (m.demand30 || 0) === 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: P.font }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <button onClick={() => nav("/inventory")} style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", gap: 4, color: P.ink4, fontSize: 12, fontWeight: 500, fontFamily: P.font,
            }}>
              <Ic d={PATHS.back || "M19 12H5M12 19l-7-7 7-7"} s={14} c={P.ink4} /> Inventory
            </button>
            <span style={{ fontSize: 12, color: P.ink5 }}>/</span>
            <span style={{ fontSize: 12, color: P.pri, fontWeight: 600 }}>Sales Ranking</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: P.ink, letterSpacing: "-0.03em", margin: 0 }}>
            Product Sales Ranking
          </h1>
          <p style={{ fontSize: 13, color: P.ink4, marginTop: 3 }}>
            All products ranked by 30-day demand — highest to lowest
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn ch="Back to Inventory" v="subtle" onClick={() => nav("/inventory")} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { l: "Total Products", v: meds.length, c: P.pri, bg: P.priLt, ic: PATHS.box },
          { l: "Total Demand (30d)", v: totalDemand.toLocaleString(), c: P.teal, bg: P.tealLt, ic: PATHS.trending },
          { l: "High Sellers", v: highSellers, c: P.grn, bg: P.grnLt, ic: PATHS.check, sub: `Above avg (${avgDemand})` },
          { l: "No Sales", v: noSales, c: P.red, bg: P.redLt, ic: PATHS.alert, sub: noSales > 0 ? "Zero demand" : null },
        ].map((k, i) => (
          <div key={i} style={{
            background: P.surface, borderRadius: P.r, padding: "16px 18px",
            boxShadow: P.shadow, border: `1px solid ${P.muted}`,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${k.c}, ${k.c}60)` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: P.rSm, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic d={k.ic} s={16} c={k.c} />
              </div>
              <span style={{ fontSize: 11, color: P.ink4, fontWeight: 500 }}>{k.l}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: P.ink, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{k.v}</div>
            {k.sub && <div style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: k.c }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Search + Sort Controls */}
      <div style={{
        background: P.surface, borderRadius: P.rLg,
        boxShadow: P.shadow, border: `1px solid ${P.muted}`, overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 18px", borderBottom: `1px solid ${P.muted}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: P.subtle, border: `1.5px solid ${P.muted}`,
            borderRadius: P.rSm, padding: "6px 12px", minWidth: 280,
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={P.ink5} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search product or category..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: P.ink, width: "100%", fontFamily: P.font }}
            />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><Ic d={PATHS.x} s={12} c={P.ink5} /></button>}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: P.ink4, fontWeight: 500 }}>Sort:</span>
            <div style={{
              display: "inline-flex", gap: 1, padding: 3,
              background: "#F1F5F9", borderRadius: P.rSm, border: `1px solid ${P.muted}`,
            }}>
              {[
                { id: "desc", l: "High → Low" },
                { id: "asc", l: "Low → High" },
              ].map(s => (
                <button key={s.id} onClick={() => setSortDir(s.id)} style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: sortDir === s.id ? P.surface : "transparent",
                  boxShadow: sortDir === s.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  color: sortDir === s.id ? P.pri : P.ink4, fontSize: 12, fontWeight: sortDir === s.id ? 700 : 500,
                  fontFamily: P.font,
                }}>{s.l}</button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: P.ink4, fontWeight: 600, marginLeft: 4 }}>
              {sorted.length} products
            </span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 56, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid #F1F5F9`, borderTopColor: P.pri, animation: "spin .7s linear infinite", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13, color: P.ink4 }}>Loading...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center", color: P.ink4 }}>No products found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
              <thead>
                <tr style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)", borderBottom: `2px solid ${P.muted}` }}>
                  {["Rank", "Product", "Category", "Demand (30d)", "Demand (90d)", "Stock", "Price", "Status"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: h === "Rank" ? "center" : "left",
                      fontSize: 10, fontWeight: 700, color: P.ink4,
                      textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const st = getStatus(m);
                  const d30 = m.demand30 || 0;
                  const d90 = m.demand90 || 0;
                  const barPct = maxDemand > 0 ? Math.round((d30 / maxDemand) * 100) : 0;
                  const isTop3 = i < 3 && d30 > 0 && sortDir === "desc";
                  const isZero = d30 === 0;
                  const medalBg = i === 0 ? "#FEF3C7" : i === 1 ? "#F1F5F9" : i === 2 ? "#FFF7ED" : "transparent";
                  const medalC = i === 0 ? "#B45309" : i === 1 ? "#475569" : i === 2 ? "#C2410C" : P.ink4;

                  return (
                    <tr key={m._id} style={{
                      borderBottom: `1px solid #F1F5F9`,
                      background: isTop3 ? `${P.grnLt}50` : isZero ? P.subtle : i % 2 === 0 ? P.surface : "#FAFBFC",
                      transition: "background .1s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F5F7FF"}
                      onMouseLeave={e => e.currentTarget.style.background = isTop3 ? `${P.grnLt}50` : isZero ? P.subtle : i % 2 === 0 ? P.surface : "#FAFBFC"}
                    >
                      <td style={{ padding: "11px 14px", textAlign: "center", width: 50 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 7,
                          background: isTop3 ? medalBg : "transparent",
                          fontSize: 12, fontWeight: 800, color: isTop3 ? medalC : P.ink4,
                        }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 600, color: P.ink }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: P.ink4, marginTop: 1 }}>{m.unit || "--"}</div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: P.priDk, background: P.priLt, padding: "2px 8px", borderRadius: 99 }}>
                          {m.category || "--"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontSize: 15, fontWeight: 800,
                            color: d30 > 0 ? P.pri : P.ink5,
                            fontVariantNumeric: "tabular-nums", minWidth: 38,
                          }}>{d30}</span>
                          <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              width: `${barPct}%`, height: "100%", borderRadius: 99,
                              background: d30 > 0
                                ? d30 >= avgDemand
                                  ? `linear-gradient(90deg, ${P.grn}, ${P.teal})`
                                  : `linear-gradient(90deg, ${P.pri}, ${P.purple})`
                                : "transparent",
                              transition: "width .5s",
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: d90 > 0 ? P.ink2 : P.ink5, fontVariantNumeric: "tabular-nums" }}>{d90}</span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                          color: m.stock <= (m.minStock || 0) ? P.redDk : P.ink,
                        }}>{m.stock}</span>
                        {m.stock <= (m.minStock || 0) && m.stock > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: P.amb, marginLeft: 4 }}>LOW</span>
                        )}
                        {m.stock === 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: P.red, marginLeft: 4 }}>OOS</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: P.ink, fontVariantNumeric: "tabular-nums" }}>
                        ₹{m.sellingPrice || m.price}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: st.bg, color: st.c,
                          fontSize: 10, fontWeight: 700,
                          padding: "3px 8px", borderRadius: 99,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.c }} />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryMgt;
