import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import API from "../api";
import { useNavigate, useLocation } from "react-router-dom";
import { Modal, Ic, PATHS, Btn, Toast } from "./Styles";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { exportFormattedExcel } from "../utils/excelExport";

/* ── TOKENS ───────────────────────────────────────────────────── */
const S = {
  ink: "#0F172A", ink2: "#1E293B", ink3: "#475569", ink4: "#94A3B8", ink5: "#CBD5E1",
  surface: "#FFFFFF", bg: "#F8FAFC", subtle: "#F1F5F9",
  border: "#E2E8F0",
  brand: "#4F46E5", brandDk: "#4338CA", brandLt: "#EEF2FF",
  green: "#059669", greenDk: "#047857", greenLt: "#ECFDF5",
  amber: "#D97706", amberLt: "#FFFBEB",
  red: "#DC2626", redLt: "#FEF2F2",
  blue: "#3B82F6", blueLt: "#EFF6FF",
  purple: "#7C3AED", purpleLt: "#F5F3FF",
  teal: "#0D9488", tealLt: "#F0FDFA",
  font: "'DM Sans', sans-serif",
  shadow: "0 1px 3px rgba(15,23,42,0.04), 0 6px 24px rgba(15,23,42,0.08)",
  r: 12, rSm: 8, rLg: 16,
};

const PER_PAGE = 10;

const INV_CFG = {
  Generated: { color: S.green, bg: S.greenLt },
  Pending:   { color: S.amber, bg: S.amberLt },
};

const PAY_CFG = {
  Paid:    { color: S.green,  bg: S.greenLt },
  Pending: { color: S.amber,  bg: S.amberLt },
  Failed:  { color: S.red,    bg: S.redLt },
};

/* ── card helper ── */
const card = (x = {}) => ({
  background: S.surface, borderRadius: S.r,
  border: `1px solid ${S.border}`, boxShadow: S.shadow, ...x,
});

/* ── Build query string from current filter state ── */
const buildQuery = ({ page, limit, search, invFilter, payFilter, dateFilter, customFrom, customTo }) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (search) params.set("search", search);
  if (invFilter && invFilter !== "All") params.set("invoiceStatus", invFilter);
  if (payFilter && payFilter !== "All") params.set("paymentStatus", payFilter);

  // Compute date range
  const now = new Date();
  let from = null;
  let to = null;

  if (dateFilter === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    from = s;
  } else if (dateFilter === "week") {
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    s.setHours(0, 0, 0, 0);
    from = s;
  } else if (dateFilter === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateFilter === "year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (dateFilter === "custom") {
    if (customFrom) from = new Date(customFrom + "T00:00:00");
    if (customTo) to = new Date(customTo + "T23:59:59");
  }

  if (from) params.set("from", from.toISOString());
  if (to) params.set("to", to.toISOString());

  return params.toString();
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
const BillingInvoiceView = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Debounced search ── */
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [invFilter, setInvFilter] = useState("All");
  const [payFilter, setPayFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const highlightOrderId = location.state?.orderId;

  /* ── Server pagination state ── */
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const t_ = useCallback((m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); }, []);

  /* ── Reset to page 1 when any filter changes ── */
  useEffect(() => { setCurrentPage(1); }, [search, invFilter, payFilter, dateFilter, customFrom, customTo]);

  /* ── Close export dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);





  /* ── Server-side fetch: re-runs when page or any filter changes ── */
  const fetchBilling = useCallback(async () => {
    try {
      setLoading(true);
      const qs = buildQuery({ page: currentPage, limit: PER_PAGE, search, invFilter, payFilter, dateFilter, customFrom, customTo });
    


const res = await API.get(`/orders/billing?${qs}`);
const data = res.data.data || [];

// ✅ only generate if needed
const pending = data.filter(
  o => o.invoiceStatus === "Pending" && o.paymentStatus === "Paid"
);

if (pending.length > 0) {
  await Promise.all(
    pending.map(o => API.patch(`/orders/${o.id}/invoice`))
  );

  // ✅ refetch AFTER generation
  const updatedRes = await API.get(`/orders/billing?${qs}`);
  setOrders(updatedRes.data.data || []);

  const pag = updatedRes.data.pagination || {};
  setTotalRecords(pag.total || 0);
  setTotalPages(pag.totalPages || 0);
} else {
  // ✅ normal case
  setOrders(data);

  const pag = res.data.pagination || {};
  setTotalRecords(pag.total || 0);
  setTotalPages(pag.totalPages || 0);
}
     
    
    } catch (err) {
      console.error("Billing fetch failed", err);
      t_("Failed to load billing data", "err");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, invFilter, payFilter, dateFilter, customFrom, customTo, t_]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  /* ── Scroll to highlighted order when data arrives ── */
  useEffect(() => {
    if (!highlightOrderId || !orders.length) return;
    // Server already returned the correct page; nothing to compute client-side
  }, [orders, highlightOrderId]);



  const markPaid = async (id) => {
    try {
      await API.patch(`/orders/${id}/pay`);
      t_("Payment marked as Paid");
      fetchBilling();
    } catch (err) {
      t_("Payment update failed", "err");
    }
  };

  /* ── Stats (derived from server total + current page data for display) ── */
  const stats = useMemo(() => {

const totalAmt = orders.reduce((s, o) => s + (o.billAmount || 0), 0);

const paidAmt = orders
  .filter(o => o.paymentStatus === "Paid")
  .reduce((s, o) => s + (o.billAmount || 0), 0);


    const pendingAmt = totalAmt - paidAmt;
    return {
      total: totalRecords,
      generated: orders.filter(o => o.invoiceStatus === "Generated").length,
      pending: orders.filter(o => o.invoiceStatus === "Pending").length,
      paid: orders.filter(o => o.paymentStatus === "Paid").length,
      unpaid: orders.filter(o => o.paymentStatus !== "Paid").length,
      totalAmt, paidAmt, pendingAmt,
    };
  }, [orders, totalRecords]);

  const fmtDate = (d) => (!d || d === "-") ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const fmtCur = (v) => `₹${(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const Chip = ({ status, cfg }) => {
    const c = cfg[status] || { color: S.ink4, bg: S.subtle };
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.color, border: `1px solid ${c.color}20`,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
        {status}
      </span>
    );
  };

  /* ── Export helpers: fetch ALL filtered records (limit=0) then format ── */
  const fetchAllForExport = async () => {
    const qs = buildQuery({ page: 1, limit: 0, search, invFilter, payFilter, dateFilter, customFrom, customTo });
    const res = await API.get(`/orders/billing?${qs}`);
    return res.data.data || [];
  };

const makeExportRows = (data) => data.map(o => {
  const total = o.billAmount || 0;

  return {
    "Order ID": o.orderId || "",
    "Invoice No": o.invoiceNumber || "—",
    "Invoice Date": fmtDate(o.invoiceDate),
    "Customer": o.customerName || "",
    "Amount": total,
    "Invoice Status": o.invoiceStatus || "",
    "Payment Status": o.paymentStatus || "",
  };
});

  const exportCSV = async () => {
    try {
      const allData = await fetchAllForExport();
      const rows = makeExportRows(allData);
      if (!rows.length) return t_("No data to export", "warn");
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
      saveAs(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `billing_${new Date().toISOString().slice(0, 10)}.csv`);
      t_("CSV exported"); setExportOpen(false);
    } catch (err) {
      console.error("CSV export failed", err);
      t_("CSV export failed", "err");
    }
  };

  const exportExcel = async () => {
    try {
      const allData = await fetchAllForExport();
      const rows = makeExportRows(allData);
      if (!rows.length) return t_("No data to export", "warn");
      const columns = ["Order ID", "Invoice No", "Invoice Date", "Customer", "Amount", "Invoice Status", "Payment Status"];
      await exportFormattedExcel({
        title: "Billing & Invoice Report",
        sheetName: "Billing",
        columns,
        rows,
        currencyCols: [4],
        statusCols: [5, 6],
        filename: "billing",
        summary: {
          "Total Records": rows.length,
          "Total Billed": `₹${rows.reduce((s, r) => s + (r["Amount"] || 0), 0).toLocaleString("en-IN")}`,
        },
      });
      t_("Excel exported"); setExportOpen(false);
    } catch (err) {
      console.error("Excel export failed", err);
      t_("Excel export failed", "err");
    }
  };

  const exportPDF = async () => {
    try {
      const allData = await fetchAllForExport();
      const rows = makeExportRows(allData);
      if (!rows.length) return t_("No data to export", "warn");
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16); doc.text("Billing & Invoice Report", 14, 18);
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}  |  ${rows.length} records`, 14, 25);
      const headers = ["Order ID", "Invoice No", "Invoice Date", "Customer", "Amount", "Invoice Status", "Payment Status"];
      autoTable(doc, {
        startY: 30, head: [headers],
        body: rows.map(r => headers.map(h => h === "Amount" ? fmtCur(r[h]) : r[h])),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 4: { halign: "right" } },
      });
      doc.save(`billing_${new Date().toISOString().slice(0, 10)}.pdf`);
      t_("PDF exported"); setExportOpen(false);
    } catch (err) {
      console.error("PDF export failed", err);
      t_("PDF export failed", "err");
    }
  };

  const hasFilters = invFilter !== "All" || payFilter !== "All" || dateFilter !== "all" || searchInput;
  const clearAll = () => { setInvFilter("All"); setPayFilter("All"); setDateFilter("all"); setCustomFrom(""); setCustomTo(""); setSearchInput(""); setSearch(""); };

  /* ── RENDER ── */
  return (
    <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: S.font }}>

      {toast && <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />}

      {/* ═══════════════ HEADER ═══════════════ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: S.ink4, fontWeight: 500 }}>Pharmacy</span>
            <span style={{ fontSize: 12, color: S.ink5 }}>/</span>
            <span style={{ fontSize: 12, color: S.brand, fontWeight: 600 }}>Billing</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: S.ink, letterSpacing: "-0.03em", margin: 0 }}>
            Billing & Invoicing
          </h1>
          <p style={{ fontSize: 13, color: S.ink4, marginTop: 3 }}>
            Generate invoices, track payments & export billing records
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn ch="Refresh" v="subtle" icon="refresh" sm onClick={fetchBilling} />
          <div ref={exportRef} style={{ position: "relative" }}>
            <Btn ch="Export" v="subtle" icon="download" sm onClick={() => setExportOpen(v => !v)} />
            {exportOpen && (
              <div className="sc" style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                background: S.surface, borderRadius: S.r, border: `1px solid ${S.border}`,
                boxShadow: "0 12px 36px rgba(15,23,42,0.14)", minWidth: 200, overflow: "hidden",
              }}>
                <div style={{ padding: "10px 14px 6px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Export {totalRecords} records as
                  </span>
                </div>
                {[
                  { l: "CSV (.csv)", desc: "Spreadsheet compatible", fn: exportCSV, color: S.green },
                  { l: "Excel (.xlsx)", desc: "Microsoft Excel format", fn: exportExcel, color: S.blue },
                  { l: "PDF (.pdf)", desc: "Print-ready document", fn: exportPDF, color: S.red },
                ].map(opt => (
                  <button key={opt.l} onClick={opt.fn} style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "10px 14px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: S.font, textAlign: "left", transition: "background .1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = S.subtle}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: S.rSm,
                      background: opt.color + "12", border: `1px solid ${opt.color}20`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Ic d={PATHS.download} s={14} c={opt.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>{opt.l}</div>
                      <div style={{ fontSize: 11, color: S.ink4 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════ KPI STATS ═══════════════ */}
      <div style={{ ...card(), display: "grid", gridTemplateColumns: "repeat(5, 1fr)", overflow: "hidden" }}>
        {[
          { label: "Total Bills",     value: stats.total,     color: S.brand,  icon: PATHS.billing, sub: `${stats.generated} invoiced` },
          { label: "Invoice Pending",  value: stats.pending,   color: S.amber,  icon: PATHS.clock,   sub: "awaiting generation" },
          { label: "Invoice Generated",value: stats.generated, color: S.green,  icon: PATHS.check,   sub: "invoices ready" },
          { label: "Total Revenue",    value: fmtCur(stats.totalAmt), color: S.purple, icon: PATHS.dollar, sub: `${fmtCur(stats.paidAmt)} collected` },
          { label: "Outstanding",      value: fmtCur(stats.pendingAmt), color: S.red, icon: PATHS.alert, sub: `${stats.unpaid} unpaid` },
        ].map((m, i, arr) => (
          <div key={m.label} style={{
            padding: "18px 20px",
            borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                background: m.color + "15", borderRadius: 7, padding: 6, display: "flex",
                border: `1px solid ${m.color}20`,
              }}>
                <Ic d={m.icon} s={13} c={m.color} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.7 }}>
                {m.label}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: S.ink, letterSpacing: -0.8, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: S.ink4, marginTop: 5 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ═══════════════ FILTER BAR ═══════════════ */}
      <div style={card({ padding: 0, overflow: "hidden" })}>

        {/* Top row: Search + Dropdowns + Date pills + Clear */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "12px 18px",
        }}>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: S.bg, border: `1.5px solid ${S.border}`, borderRadius: 8,
            padding: "8px 12px", width: 240, flexShrink: 0,
          }}>
            <Ic d={PATHS.billing} s={14} c={S.ink4} />
            <input
              placeholder="Search ID, invoice, name..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 12.5, color: S.ink, fontFamily: S.font, width: "100%", background: "transparent" }}
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <Ic d={PATHS.x} s={11} c={S.ink4} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: S.border, flexShrink: 0 }} />

          {/* Invoice dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4, letterSpacing: 0.3 }}>Invoice:</span>
            <select value={invFilter} onChange={e => setInvFilter(e.target.value)} style={selectS}>
              <option value="All">All ({stats.total})</option>
              <option value="Pending">Pending ({stats.pending})</option>
              <option value="Generated">Generated ({stats.generated})</option>
            </select>
          </div>

          {/* Payment dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4, letterSpacing: 0.3 }}>Payment:</span>
            <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={selectS}>
              <option value="All">All</option>
              <option value="Paid">Paid ({stats.paid})</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: S.border, flexShrink: 0 }} />

          {/* Date pills */}
          <div style={{ display: "flex", gap: 2, background: S.bg, borderRadius: 7, padding: 2, flexShrink: 0 }}>
            {[
              { id: "all", l: "All" }, { id: "today", l: "Today" },
              { id: "week", l: "Week" }, { id: "month", l: "Month" },
              { id: "year", l: "Year" }, { id: "custom", l: "Custom" },
            ].map(d => (
              <button key={d.id} onClick={() => { setDateFilter(d.id); if (d.id !== "custom") { setCustomFrom(""); setCustomTo(""); } }} style={{
                padding: "5px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: S.font, whiteSpace: "nowrap",
                background: dateFilter === d.id ? S.ink : "transparent",
                color: dateFilter === d.id ? "#fff" : S.ink4, transition: "all .15s",
              }}>{d.l}</button>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Count + Clear */}
          <span style={{ fontSize: 12, color: S.ink4, fontWeight: 500, whiteSpace: "nowrap" }}>
            {totalRecords} record{totalRecords !== 1 ? "s" : ""}
          </span>
          {hasFilters && (
            <button onClick={clearAll} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 6, border: `1px solid ${S.red}20`,
              background: S.redLt, color: S.red, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: S.font, whiteSpace: "nowrap",
            }}>
              <Ic d={PATHS.x} s={10} c={S.red} /> Clear
            </button>
          )}
        </div>

        {/* Custom date row (only when custom is selected) */}
        {dateFilter === "custom" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 18px",
            borderTop: `1px solid ${S.border}`,
            background: S.bg,
          }}>
            <Ic d={PATHS.cal} s={14} c={S.ink4} />
            <span style={{ fontSize: 12, color: S.ink3, fontWeight: 600 }}>From</span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={dateInput} />
            <span style={{ fontSize: 12, color: S.ink3, fontWeight: 600 }}>To</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={dateInput} />
          </div>
        )}
      </div>

      {/* ═══════════════ TABLE ═══════════════ */}
      <div style={card({ overflow: "hidden" })}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
                {["Order ID", "Invoice No", "Invoice Date", "Customer", "Amount", "Invoice Status", "Payment", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "13px 16px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, color: "rgba(255,255,255,0.8)",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 40, color: S.ink4, fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, border: `3px solid ${S.border}`, borderTopColor: S.brand, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Loading billing data...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 48, color: S.ink4 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: S.subtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Ic d={PATHS.billing} s={22} c={S.ink4} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>No billing records found</span>
                      <span style={{ fontSize: 12 }}>Try adjusting your filters or search</span>
                    </div>
                  </td>
                </tr>
              ) : orders.map((o, i) => {

                const total = o.billAmount || o.totalAmount || 0;

                const isHL = o.orderId === highlightOrderId;
                return (
                  <tr key={o.id} style={{
                    background: isHL ? S.brandLt : i % 2 === 0 ? "#fff" : S.bg,
                    borderLeft: isHL ? `3px solid ${S.brand}` : "3px solid transparent",
                    transition: "background .15s",
                  }}>
                    <td style={tdS}>
                      <span
                        style={{ fontSize: 13, fontWeight: 700, color: S.brand, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
                        onClick={() => navigate("/orders", { state: { orderId: o.orderId } })}
                      >
                        {o.orderId}
                      </span>
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: o.invoiceNumber === "-" ? S.ink4 : S.ink, fontFamily: "'DM Mono', monospace" }}>
                        {o.invoiceNumber}
                      </span>
                    </td>
                    <td style={tdS}><span style={{ fontSize: 13, color: S.ink3 }}>{fmtDate(o.invoiceDate)}</span></td>
                    <td style={tdS}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: `linear-gradient(135deg, ${S.brand}20, ${S.brand}10)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, fontSize: 11, fontWeight: 700, color: S.brand,
                        }}>
                          {(o.customerName || "?")[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>{o.customerName}</span>
                      </div>
                    </td>
                    <td style={tdS}>
  <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>
    {fmtCur(total)}
  </span>
</td>
                    <td style={tdS}><Chip status={o.invoiceStatus} cfg={INV_CFG} /></td>
                    <td style={tdS}><Chip status={o.paymentStatus || "Pending"} cfg={PAY_CFG} /></td>
                    <td style={tdS}>
                      <div style={{ display: "flex", gap: 6 }}>
                      
                        {o.paymentStatus !== "Paid" && (
                          <Btn ch="Mark Paid" sm v="ok" onClick={() => markPaid(o.id)} />
                        )}
                        <button
                          title="View Invoice"
                          onClick={() => navigate(`/invoice/${o.id}`)}
                          style={actionBtn}
                        >
                          <Ic d={PATHS.eye} s={14} c={S.brand} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 20px", borderTop: `1px solid ${S.border}`,
          }}>
            <span style={{ fontSize: 12, color: S.ink4 }}>
              Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, totalRecords)} of {totalRecords}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                style={{ ...pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}>← Prev</button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                let pn;
                if (totalPages <= 7) pn = i + 1;
                else if (currentPage <= 4) pn = i + 1;
                else if (currentPage >= totalPages - 3) pn = totalPages - 6 + i;
                else pn = currentPage - 3 + i;
                return (
                  <button key={i} onClick={() => setCurrentPage(pn)} style={{
                    ...pageBtn,
                    background: currentPage === pn ? S.brand : "#fff",
                    color: currentPage === pn ? "#fff" : S.ink3,
                    fontWeight: currentPage === pn ? 700 : 500,
                    boxShadow: currentPage === pn ? `0 2px 8px ${S.brand}40` : "none",
                  }}>{pn}</button>
                );
              })}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                style={{ ...pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Styles ──────────────────────────────────────────────────────── */
const S_ = { ink4: "#94A3B8", border: "#E2E8F0", subtle: "#F1F5F9", brand: "#4F46E5", ink: "#0F172A", ink3: "#475569", surface: "#FFFFFF", red: "#DC2626", font: "'DM Sans', sans-serif" };

const tdS = { padding: "12px 16px", fontSize: 13, borderBottom: `1px solid ${S_.border}` };

const actionBtn = {
  width: 32, height: 32, borderRadius: 8,
  background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.12)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", transition: "all .15s",
};

const pageBtn = {
  padding: "6px 12px", borderRadius: 6,
  border: `1px solid ${S_.border}`, background: "#fff",
  cursor: "pointer", fontSize: 12, fontWeight: 600,
  fontFamily: S_.font, color: S_.ink3, transition: "all .15s",
};

const selectS = {
  padding: "6px 10px", borderRadius: 7,
  border: `1.5px solid ${S_.border}`, background: S_.surface,
  fontSize: 12, fontWeight: 600, color: S_.ink,
  fontFamily: S_.font, outline: "none", cursor: "pointer",
  appearance: "auto",
};

const dateInput = {
  padding: "7px 10px", borderRadius: 8,
  border: `1.5px solid ${S_.border}`, background: S_.surface,
  fontSize: 12, fontWeight: 500, color: S_.ink,
  fontFamily: S_.font, outline: "none", cursor: "pointer",
};

export default BillingInvoiceView;
