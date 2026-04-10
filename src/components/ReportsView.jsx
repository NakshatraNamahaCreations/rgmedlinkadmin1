import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { saveAs } from "file-saver";
import API from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Ic, PATHS, Toast } from "./Styles";
import { exportFormattedExcel } from "../utils/excelExport";

/* ── TOKENS ───────────────────────────────────────────────────── */
const S = {
  ink: "#0F172A", ink2: "#1E293B", ink3: "#475569", ink4: "#94A3B8", ink5: "#CBD5E1",
  surface: "#FFFFFF", bg: "#F8FAFC", subtle: "#F1F5F9",
  border: "#E2E8F0",
  brand: "#4F46E5", brandDk: "#4338CA", brandLt: "#EEF2FF",
  green: "#059669", greenLt: "#ECFDF5",
  amber: "#D97706", amberLt: "#FFFBEB",
  red: "#DC2626", redLt: "#FEF2F2",
  blue: "#3B82F6", blueLt: "#EFF6FF",
  purple: "#7C3AED", purpleLt: "#F5F3FF",
  teal: "#0D9488", tealLt: "#F0FDFA",
  font: "'DM Sans', sans-serif",
  shadow: "0 1px 3px rgba(15,23,42,0.04), 0 6px 24px rgba(15,23,42,0.08)",
  r: 12, rSm: 8,
};

const card = (x = {}) => ({
  background: S.surface, borderRadius: S.r,
  border: `1px solid ${S.border}`, boxShadow: S.shadow, ...x,
});

const PER_PAGE = 10;

const TABS = [
  { id: "sales",     label: "Sales",     icon: PATHS.trending, color: S.brand },
  { id: "inventory", label: "Inventory", icon: PATHS.box,      color: S.teal },
  { id: "orders",    label: "Orders",    icon: PATHS.orders,   color: S.blue },
  { id: "revenue",   label: "Revenue",   icon: PATHS.dollar,   color: S.green },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════ */
const ReportsView = () => {
  const [tab, setTab] = useState("sales");
  const [salesData, setSalesData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [ordersTable, setOrdersTable] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const exportRef = useRef(null);

  const t_ = useCallback((m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); }, []);

  useEffect(() => { setCurrentPage(1); }, [tab]);
  useEffect(() => {
    const h = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, ordersRes, revenueRes, inventoryRes] = await Promise.all([
        API.get("/reports/sales"), API.get("/reports/orders"),
        API.get("/reports/revenue"), API.get("/reports/inventory"),
      ]);
      setSalesData((salesRes.data.trend || []).map(r => ({ date: r._id, sales: r.sales, orders: r.orders })));
      setOrdersData((ordersRes.data.trend || []).map(r => ({ date: r._id, orders: r.orders, amount: r.amount })));
      setRevenueData((revenueRes.data.trend || []).map(r => ({ date: r._id, revenue: r.revenue, orders: r.orders })));
      setSummary({
        sales: salesRes.data.summary || {}, orders: ordersRes.data.summary || {},
        revenue: revenueRes.data.summary || {}, inventory: inventoryRes.data.summary || {},
      });
      setOrdersTable(ordersRes.data.table || []);
      setInventoryData(inventoryRes.data.items || []);
    } catch (err) { console.error("Failed to load reports", err); t_("Failed to load reports", "err"); }
    finally { setLoading(false); }
  };

  /* ── DERIVED DATA ── */
  const activeTab = TABS.find(t => t.id === tab);

  const kpis = useMemo(() => {
    const s = summary;
    return {
      sales: [
        { label: "Total Sales", value: `₹${((s.sales?.totalSales || 0)).toLocaleString("en-IN")}`, color: S.brand, icon: PATHS.trending },
        { label: "Orders Sold", value: s.sales?.orders || 0, color: S.green, icon: PATHS.orders },
        { label: "Avg Order Value", value: `₹${(s.sales?.avgOrder || 0).toLocaleString("en-IN")}`, color: S.purple, icon: PATHS.dollar },
        { label: "Data Points", value: salesData.length, color: S.teal, icon: PATHS.chart },
      ],
      inventory: [
        { label: "Total Medicines", value: s.inventory?.total || 0, color: S.brand, icon: PATHS.box },
        { label: "In Stock", value: (s.inventory?.total || 0) - (s.inventory?.lowStock || 0), color: S.green, icon: PATHS.check },
        { label: "Low Stock", value: s.inventory?.lowStock || 0, color: S.red, icon: PATHS.alert },
        { label: "Categories", value: new Set(inventoryData.map(m => m.category)).size || 0, color: S.purple, icon: PATHS.rx },
      ],
      orders: [
        { label: "Total Orders", value: s.orders?.total || 0, color: S.brand, icon: PATHS.orders },
        { label: "Completed", value: s.orders?.completed || 0, color: S.green, icon: PATHS.check },
        { label: "Pending", value: s.orders?.pending || 0, color: S.amber, icon: PATHS.clock },
        { label: "Cancelled", value: s.orders?.cancelled || 0, color: S.red, icon: PATHS.x },
      ],
      revenue: [
        { label: "Total Revenue", value: `₹${((s.revenue?.total || 0)).toLocaleString("en-IN")}`, color: S.brand, icon: PATHS.dollar },
        { label: "Paid Orders", value: s.revenue?.paid || 0, color: S.green, icon: PATHS.check },
        { label: "Avg Order", value: `₹${(s.revenue?.avg || 0).toLocaleString("en-IN")}`, color: S.purple, icon: PATHS.trending },
        { label: "Data Points", value: revenueData.length, color: S.teal, icon: PATHS.chart },
      ],
    };
  }, [summary, salesData, revenueData, inventoryData]);

  /* ── INSIGHTS ── */
  const insights = useMemo(() => {
    if (tab === "sales") {
      const sorted = [...salesData].sort((a, b) => b.sales - a.sales);
      const best = sorted[0]; const worst = sorted[sorted.length - 1];
      const totalSales = salesData.reduce((s, r) => s + (r.sales || 0), 0);
      return {
        breakdown: sorted.slice(0, 6).map(r => ({ label: r.date, value: `₹${(r.sales || 0).toLocaleString("en-IN")}`, raw: r.sales || 0 })),
        highlights: [
          { label: "Best Day", value: best ? `₹${best.sales?.toLocaleString("en-IN")}` : "—", sub: best?.date || "", color: S.green, icon: PATHS.trending },
          { label: "Lowest Day", value: worst ? `₹${worst.sales?.toLocaleString("en-IN")}` : "—", sub: worst?.date || "", color: S.amber, icon: PATHS.trending },
          { label: "Total Volume", value: `₹${totalSales.toLocaleString("en-IN")}`, sub: `across ${salesData.length} days`, color: S.brand, icon: PATHS.dollar },
        ],
        max: sorted[0]?.sales || 1,
      };
    }
    if (tab === "inventory") {
      const lowStock = inventoryData.filter(m => m.stock <= m.minStock);
      const healthy = inventoryData.filter(m => m.stock > m.minStock);
      const outOfStock = inventoryData.filter(m => m.stock === 0);
      const total = inventoryData.length || 1;
      return {
        breakdown: [
          { label: "Healthy Stock", value: healthy.length, pct: Math.round((healthy.length / total) * 100), color: S.green },
          { label: "Low Stock", value: lowStock.length, pct: Math.round((lowStock.length / total) * 100), color: S.amber },
          { label: "Out of Stock", value: outOfStock.length, pct: Math.round((outOfStock.length / total) * 100), color: S.red },
        ],
        highlights: lowStock.slice(0, 5).map(m => ({
          label: m.name, value: `${m.stock}/${m.minStock}`, sub: m.category,
          color: m.stock === 0 ? S.red : S.amber, icon: PATHS.alert,
        })),
      };
    }
    if (tab === "orders") {
      const s = summary.orders || {};
      const total = s.total || 1;
      return {
        breakdown: [
          { label: "Completed", value: s.completed || 0, pct: Math.round(((s.completed || 0) / total) * 100), color: S.green },
          { label: "Pending", value: s.pending || 0, pct: Math.round(((s.pending || 0) / total) * 100), color: S.amber },
          { label: "Cancelled", value: s.cancelled || 0, pct: Math.round(((s.cancelled || 0) / total) * 100), color: S.red },
        ],
        highlights: ordersTable.slice(0, 5).map(r => ({
          label: r.orderId, value: `₹${(r.amount || 0).toLocaleString("en-IN")}`, sub: r.customer,
          color: S.blue, icon: PATHS.orders,
        })),
      };
    }
    // revenue
    const sorted = [...revenueData].sort((a, b) => b.revenue - a.revenue);
    const best = sorted[0];
    const totalRev = revenueData.reduce((s, r) => s + (r.revenue || 0), 0);
    return {
      breakdown: sorted.slice(0, 6).map(r => ({ label: r.date, value: `₹${(r.revenue || 0).toLocaleString("en-IN")}`, raw: r.revenue || 0 })),
      highlights: [
        { label: "Peak Revenue", value: best ? `₹${best.revenue?.toLocaleString("en-IN")}` : "—", sub: best?.date || "", color: S.green, icon: PATHS.trending },
        { label: "Total Revenue", value: `₹${totalRev.toLocaleString("en-IN")}`, sub: `across ${revenueData.length} days`, color: S.brand, icon: PATHS.dollar },
        { label: "Paid Orders", value: summary.revenue?.paid || 0, sub: "successfully collected", color: S.teal, icon: PATHS.check },
      ],
      max: sorted[0]?.revenue || 1,
    };
  }, [tab, salesData, inventoryData, ordersTable, revenueData, summary]);

  /* ── TABLE CONFIG ── */
  const tableConfig = useMemo(() => ({
    sales: { columns: ["Date", "Orders", "Sales"], data: salesData, map: r => [r.date, r.orders, `₹${(r.sales || 0).toLocaleString("en-IN")}`] },
    inventory: { columns: ["Medicine", "Category", "Stock", "Min Stock", "Status"], data: inventoryData, map: r => [r.name, r.category, r.stock, r.minStock, r.stock <= r.minStock ? "Low Stock" : "In Stock"], statusCol: 4 },
    orders: { columns: ["Order ID", "Customer", "Date", "Amount", "Status"], data: ordersTable, map: r => [r.orderId, r.customer, r.date, `₹${(r.amount || 0).toLocaleString("en-IN")}`, r.orderStatus || "Created"], statusCol: 4 },
    revenue: { columns: ["Date", "Paid Orders", "Revenue"], data: revenueData, map: r => [r.date, r.orders, `₹${(r.revenue || 0).toLocaleString("en-IN")}`] },
  }), [salesData, inventoryData, ordersTable, revenueData]);

  const tbl = tableConfig[tab];
  const totalPages = Math.ceil(tbl.data.length / PER_PAGE);
  const paginated = useMemo(() => tbl.data.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE), [tbl.data, currentPage]);

  /* ── EXPORT ── */
  const doExport = async (type) => {
    const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
    if (type === "csv") {
      const rows = [tbl.columns.join(","), ...tbl.data.map(r => tbl.map(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      saveAs(new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8" }), `${tab}_report.csv`);
    } else if (type === "excel") {
      const rows = tbl.data.map(r => {
        const vals = tbl.map(r);
        const obj = {};
        tbl.columns.forEach((c, i) => obj[c] = vals[i]);
        return obj;
      });
      const statusColIdx = tbl.statusCol != null ? [tbl.statusCol] : [];
      const currencyIdx = tbl.columns.reduce((acc, c, i) => {
        if (/sales|amount|revenue|price/i.test(c)) acc.push(i);
        return acc;
      }, []);
      await exportFormattedExcel({
        title: `${tabLabel} Report`,
        sheetName: tabLabel,
        columns: tbl.columns,
        rows,
        currencyCols: currencyIdx,
        statusCols: statusColIdx,
        filename: `${tab}_report`,
      });
    } else {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(`${tabLabel} Report`, 14, 15);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 22);
      autoTable(doc, { startY: 28, head: [tbl.columns], body: tbl.data.map(r => tbl.map(r)), styles: { fontSize: 9, cellPadding: 4 }, headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [248, 250, 252] } });
      doc.save(`${tab}_report.pdf`);
    }
    setExportOpen(false);
    t_(`${tabLabel} ${type.toUpperCase()} exported`);
  };

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: S.font }}>
      {toast && <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />}

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        borderRadius: 16, padding: "24px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 4px 24px rgba(15,23,42,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(79,70,229,0.4)" }}>
            <Ic d={PATHS.chart} s={18} c="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: -0.4 }}>Reports & Analytics</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Data-driven insights for your pharmacy</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Export dropdown */}
          <div ref={exportRef} style={{ position: "relative" }}>
            <button onClick={() => setExportOpen(!exportOpen)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: S.font,
            }}>
              <Ic d={PATHS.trending} s={13} c="rgba(255,255,255,0.5)" /> Export <span style={{ fontSize: 9 }}>▾</span>
            </button>
            {exportOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, ...card({ padding: 5, minWidth: 155 }) }}>
                {["csv", "excel", "pdf"].map(t => (
                  <button key={t} onClick={() => doExport(t)} style={{
                    display: "block", width: "100%", padding: "8px 12px", border: "none", borderRadius: 6,
                    background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500,
                    color: S.ink3, fontFamily: S.font, textAlign: "left", transition: "background .1s",
                  }} onMouseEnter={e => e.currentTarget.style.background = S.subtle}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    Export {t.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={fetchReports} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: S.font,
          }}>
            <Ic d={PATHS.refresh} s={13} c="rgba(255,255,255,0.5)" /> Refresh
          </button>
        </div>
      </div>

      {/* ── TAB CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...card(), padding: "14px 16px", cursor: "pointer", fontFamily: S.font,
              border: active ? `2px solid ${t.color}` : `1px solid ${S.border}`,
              background: active ? `${t.color}06` : S.surface,
              display: "flex", alignItems: "center", gap: 11, position: "relative", overflow: "hidden",
              transition: "all .18s",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: active ? `${t.color}14` : S.subtle,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Ic d={t.icon} s={15} c={active ? t.color : S.ink4} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: active ? t.color : S.ink3 }}>{t.label}</div>
                <div style={{ fontSize: 10, color: S.ink4, marginTop: 1 }}>
                  {t.id === "sales" && `${salesData.length} entries`}
                  {t.id === "inventory" && `${inventoryData.length} items`}
                  {t.id === "orders" && `${ordersTable.length} orders`}
                  {t.id === "revenue" && `${revenueData.length} entries`}
                </div>
              </div>
              {active && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: t.color }} />}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ ...card({ padding: 80 }), textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${S.border}`, borderTopColor: S.brand, borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, color: S.ink4 }}>Loading reports...</p>
        </div>
      ) : (
        <>
          {/* ── KPI ROW ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {(kpis[tab] || []).map(k => (
              <div key={k.label} style={card({ padding: "18px 20px" })}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.8 }}>{k.label}</span>
                  <div style={{ background: k.color + "12", borderRadius: 7, padding: 5, display: "flex" }}>
                    <Ic d={k.icon} s={13} c={k.color} />
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: S.ink, letterSpacing: -1, lineHeight: 1 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* ── INSIGHTS ROW ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* LEFT: Breakdown / Ranking */}
            <div style={card({ padding: "20px 22px" })}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: activeTab?.color || S.brand }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>
                  {(tab === "sales" || tab === "revenue") ? "Top Performing Days" : "Status Breakdown"}
                </span>
              </div>

              {(tab === "sales" || tab === "revenue") ? (
                /* Ranked bar list for sales / revenue */
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(insights.breakdown || []).map((r, i) => (
                    <div key={r.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: i === 0 ? activeTab?.color + "14" : S.subtle,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, color: i === 0 ? activeTab?.color : S.ink4,
                          }}>{i + 1}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: S.ink2 }}>{r.label}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{r.value}</span>
                      </div>
                      <div style={{ height: 5, background: S.subtle, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.max(((r.raw || 0) / (insights.max || 1)) * 100, 4)}%`,
                          height: "100%", borderRadius: 99,
                          background: `linear-gradient(90deg, ${activeTab?.color || S.brand}, ${activeTab?.color || S.brand}88)`,
                          transition: "width .6s cubic-bezier(.22,1,.36,1)",
                        }} />
                      </div>
                    </div>
                  ))}
                  {(insights.breakdown || []).length === 0 && (
                    <p style={{ fontSize: 13, color: S.ink4, textAlign: "center", padding: 20 }}>No data yet</p>
                  )}
                </div>
              ) : (
                /* Status distribution for orders / inventory */
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(insights.breakdown || []).map(r => (
                    <div key={r.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: S.ink2 }}>{r.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: S.ink4 }}>{r.pct}%</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, minWidth: 28, textAlign: "right" }}>{r.value}</span>
                        </div>
                      </div>
                      <div style={{ height: 7, background: S.subtle, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.max(r.pct, 2)}%`, height: "100%", borderRadius: 99,
                          background: `linear-gradient(90deg, ${r.color}, ${r.color}99)`,
                          transition: "width .6s cubic-bezier(.22,1,.36,1)",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Highlights */}
            <div style={card({ padding: "20px 22px" })}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: S.amber }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>
                  {(tab === "inventory") ? "Items Needing Attention" : "Key Highlights"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(insights.highlights || []).map((h, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 10,
                    background: S.bg, border: `1px solid ${S.border}`,
                    transition: "all .15s",
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: h.color + "12", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Ic d={h.icon} s={14} c={h.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.label}</div>
                      {h.sub && <div style={{ fontSize: 11, color: S.ink4, marginTop: 1 }}>{h.sub}</div>}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: h.color, whiteSpace: "nowrap" }}>{h.value}</span>
                  </div>
                ))}
                {(insights.highlights || []).length === 0 && (
                  <div style={{ padding: 30, textAlign: "center" }}>
                    <Ic d={PATHS.check} s={20} c={S.green} />
                    <p style={{ fontSize: 13, color: S.ink4, marginTop: 8 }}>Everything looks good</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── DATA TABLE ── */}
          <div style={card({ overflow: "hidden" })}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 20px", borderBottom: `1px solid ${S.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Ic d={activeTab?.icon || PATHS.chart} s={14} c={activeTab?.color || S.brand} />
                <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} Data
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                  background: (activeTab?.color || S.brand) + "12", color: activeTab?.color || S.brand,
                }}>{tbl.data.length}</span>
              </div>
              {tbl.data.length > 0 && (
                <span style={{ fontSize: 12, color: S.ink4 }}>
                  {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, tbl.data.length)} of {tbl.data.length}
                </span>
              )}
            </div>

            {tbl.data.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: S.subtle, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Ic d={PATHS.chart} s={20} c={S.ink4} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: S.ink }}>No data available</p>
                <p style={{ fontSize: 13, color: S.ink4, marginTop: 4 }}>Data will appear once records are created</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
                        {tbl.columns.map(h => (
                          <th key={h} style={{
                            padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700,
                            color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((r, i) => {
                        const cells = tbl.map(r);
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, transition: "background .1s" }}
                            onMouseEnter={e => e.currentTarget.style.background = S.bg}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            {cells.map((v, j) => (
                              <td key={j} style={tdS}>
                                {tbl.statusCol != null && j === tbl.statusCol ? <StatusChip label={v} />
                                  : j === 0 ? <span style={{ fontWeight: 600, color: S.ink2 }}>{v}</span>
                                  : v}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${S.border}` }}>
                    <span style={{ fontSize: 12, color: S.ink4 }}>Page {currentPage} of {totalPages}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                        style={{ ...pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}>← Prev</button>
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        let pg;
                        if (totalPages <= 5) pg = i + 1;
                        else if (currentPage <= 3) pg = i + 1;
                        else if (currentPage >= totalPages - 2) pg = totalPages - 4 + i;
                        else pg = currentPage - 2 + i;
                        return (
                          <button key={pg} onClick={() => setCurrentPage(pg)} style={{
                            ...pageBtn,
                            background: currentPage === pg ? S.brand : "#fff",
                            color: currentPage === pg ? "#fff" : S.ink3,
                            borderColor: currentPage === pg ? S.brand : S.border,
                          }}>{pg}</button>
                        );
                      })}
                      <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                        style={{ ...pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}>Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ── STATUS CHIP ── */
const STATUS_CFG = {
  "In Stock": { color: S.green, bg: S.greenLt }, "Low Stock": { color: S.red, bg: S.redLt },
  Delivered: { color: "#059669", bg: "#ECFDF5" }, Completed: { color: "#059669", bg: "#ECFDF5" },
  Processing: { color: "#3B82F6", bg: "#EFF6FF" }, Shipped: { color: "#7C3AED", bg: "#F5F3FF" },
  Created: { color: "#64748B", bg: "#F1F5F9" }, Pending: { color: "#D97706", bg: "#FFFBEB" },
  Cancelled: { color: "#DC2626", bg: "#FEF2F2" }, Paid: { color: "#059669", bg: "#ECFDF5" },
};
const StatusChip = ({ label }) => {
  const c = STATUS_CFG[label] || { color: S.ink4, bg: S.subtle };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
      background: c.bg, color: c.color, whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color }} />
      {label}
    </span>
  );
};

/* ── STYLES ── */
const tdS = { padding: "12px 16px", fontSize: 13, color: S.ink3, borderBottom: `1px solid ${S.border}` };
const pageBtn = {
  padding: "6px 12px", borderRadius: 6, border: `1px solid ${S.border}`, background: "#fff",
  cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: S.font, color: S.ink3, transition: "all .15s",
};

export default ReportsView;
