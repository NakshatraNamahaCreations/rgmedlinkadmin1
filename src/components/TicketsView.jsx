import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import API from "../api";
import { Modal, Ic, PATHS, Btn, Toast } from "./Styles";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { exportFormattedExcel } from "../utils/excelExport";

/* ── TOKENS ───────────────────────────────────────────────────── */
const S = {
  ink: "#0F172A", ink2: "#1E293B", ink3: "#475569", ink4: "#94A3B8", ink5: "#CBD5E1",
  surface: "#FFFFFF", bg: "#F8FAFC", subtle: "#F1F5F9",
  border: "#E2E8F0", border2: "#CBD5E1",
  brand: "#4F46E5", brandDk: "#4338CA", brandLt: "#EEF2FF",
  green: "#059669", greenDk: "#047857", greenLt: "#ECFDF5",
  amber: "#D97706", amberDk: "#B45309", amberLt: "#FFFBEB",
  red: "#DC2626", redDk: "#B91C1C", redLt: "#FEF2F2",
  blue: "#3B82F6", blueLt: "#EFF6FF",
  purple: "#7C3AED", purpleLt: "#F5F3FF",
  teal: "#0D9488", tealLt: "#F0FDFA",
  orange: "#EA580C", orangeLt: "#FFF7ED",
  font: "'DM Sans', sans-serif",
  shadow: "0 1px 3px rgba(15,23,42,0.04), 0 6px 24px rgba(15,23,42,0.08)",
  r: 12, rSm: 8, rLg: 16,
};

const PER_PAGE = 10;

const STATUS_CFG = {
  Open:          { color: S.blue,   bg: S.blueLt,   icon: PATHS.alert },
  "In Progress": { color: S.amber,  bg: S.amberLt,  icon: PATHS.refresh },
  Resolved:      { color: S.green,  bg: S.greenLt,  icon: PATHS.check },
  Closed:        { color: S.ink4,   bg: S.subtle,    icon: PATHS.lock },
};

const PRIORITY_CFG = {
  Low:    { color: S.green,  bg: S.greenLt },
  Medium: { color: S.amber,  bg: S.amberLt },
  High:   { color: S.orange, bg: S.orangeLt },
  Urgent: { color: S.red,    bg: S.redLt },
};

const CATEGORY_CFG = {
  "Order Issue":    { color: S.blue,   bg: S.blueLt },
  "Payment Issue":  { color: S.red,    bg: S.redLt },
  "Delivery Issue": { color: S.teal,   bg: S.tealLt },
  "Medicine Query": { color: S.purple, bg: S.purpleLt },
  "Account Issue":  { color: S.amber,  bg: S.amberLt },
  General:          { color: S.ink3,   bg: S.subtle },
};

/* ── Confirm Dialog ────────────────────────────────────────────── */
const Confirm = ({ title, msg, label = "Delete", onYes, onNo }) => (
  <div style={overlayCenter}>
    <div style={modalBox}>
      
      {/* Icon */}
      <div style={iconWrap}>
        <Ic d={PATHS.alert} s={20} c={S.red} />
      </div>

      {/* Title */}
      <div style={{ fontSize: 16, fontWeight: 700, color: S.ink }}>
        {title}
      </div>

      {/* Message */}
      <div style={{ fontSize: 13, color: S.ink3, marginTop: 6 }}>
        {msg}
      </div>

      {/* Actions */}
      <div style={actionRow}>
        <Btn ch="Cancel" v="ghost" onClick={onNo} />
        <Btn ch={label} v="danger" onClick={onYes} />
      </div>

    </div>
  </div>
);

/* ── card helper ───────────────────────────────────────────────── */
const card = (x = {}) => ({
  background: S.surface, borderRadius: S.r,
  border: `1px solid ${S.border}`,
  boxShadow: S.shadow, ...x,
});

/* ── date helpers ──────────────────────────────────────────────── */
const fDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
const fDateTime = (d) => d ? `${fDate(d)} ${fTime(d)}` : "—";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/* select dropdown style */
const selectS = {
  padding: "7px 28px 7px 10px", borderRadius: 8,
  border: `1.5px solid ${S.border}`, fontSize: 12.5,
  color: S.ink2, background: S.surface, cursor: "pointer",
  outline: "none", fontWeight: 500, appearance: "auto",
};

/* ── helper: compute "from" date from date-filter key ─────────── */
const getFromDate = (dateFilter) => {
  if (dateFilter === "all") return undefined;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (dateFilter === "today") return today.toISOString();
  if (dateFilter === "7d") return new Date(today.getTime() - 7 * 864e5).toISOString();
  if (dateFilter === "30d") return new Date(today.getTime() - 30 * 864e5).toISOString();
  return undefined;
};

/* ── helper: build query-string params from current filters ───── */
const buildParams = ({ page, limit, search, statusFilter, priorityFilter, categoryFilter, dateFilter }) => {
  const p = new URLSearchParams();
  if (page != null) p.set("page", String(page));
  if (limit != null) p.set("limit", String(limit));
  if (search) p.set("search", search);
  if (statusFilter && statusFilter !== "All") p.set("status", statusFilter);
  if (priorityFilter && priorityFilter !== "All") p.set("priority", priorityFilter);
  if (categoryFilter && categoryFilter !== "All") p.set("category", categoryFilter);
  const from = getFromDate(dateFilter);
  if (from) p.set("from", from);
  return p.toString();
};




  const CreateTicketModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    subject: "",
    category: "General",
    priority: "Medium",
    description: "",
  });

  const handleSubmit = async () => {
    try {
      if (!form.customerName || !form.subject || !form.description) {
  alert("Please fill required fields");
  return;
}

      await API.post("/tickets", form);
      onCreated();
    } catch (err) {
      console.error(err);
      alert("Failed to create ticket");
    }
  };

 return (
  <div style={overlayStyle}>
    <Modal title="Create New Ticket" onClose={onClose} w={520}
      ch={
   <div style={formWrap}>

  <div>
    <label style={labelStyle}>Customer Name</label>
    <input style={inputStyle}
      value={form.customerName}
      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
    />
  </div>

  <div>
    <label style={labelStyle}>Phone</label>
    <input style={inputStyle}
      value={form.customerPhone}
      onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
    />
  </div>

  <div style={fullWidth}>
    <label style={labelStyle}>Subject</label>
    <input style={inputStyle}
      value={form.subject}
      onChange={(e) => setForm({ ...form, subject: e.target.value })}
    />
  </div>

  <div>
    <label style={labelStyle}>Category</label>
    <select style={selectStyle}
      value={form.category}
      onChange={(e) => setForm({ ...form, category: e.target.value })}
    >
      <option>Order Issue</option>
      <option>Payment Issue</option>
      <option>Delivery Issue</option>
      <option>Medicine Query</option>
      <option>Account Issue</option>
      <option>General</option>
    </select>
  </div>

  <div>
    <label style={labelStyle}>Priority</label>
    <select style={selectStyle}
      value={form.priority}
      onChange={(e) => setForm({ ...form, priority: e.target.value })}
    >
      <option>Low</option>
      <option>Medium</option>
      <option>High</option>
      <option>Urgent</option>
    </select>
  </div>

  <div style={fullWidth}>
    <label style={labelStyle}>Description</label>
    <textarea style={textareaStyle}
      value={form.description}
      onChange={(e) => setForm({ ...form, description: e.target.value })}
    />
  </div>

  <div style={fullWidth}>
    <button style={submitBtn} onClick={handleSubmit}>
      Create Ticket
    </button>
  </div>

</div>
  
}

    />
    </div>
  );
};


/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
const TicketsView = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
const [createModal, setCreateModal] = useState(false);
  const t_ = useCallback((m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); }, []);

  /* ── debounced search ── */
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── reset to page 1 when any filter changes ── */
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, priorityFilter, categoryFilter, dateFilter]);

  /* ── fetch tickets whenever page or (debounced) filters change ── */
  useEffect(() => {
    fetchTickets();
  }, [currentPage, search, statusFilter, priorityFilter, categoryFilter, dateFilter]);

  /* ── initial stats fetch ── */
  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);



  const fetchTickets = async () => {
    try {
      setLoading(true);
      const qs = buildParams({ page: currentPage, limit: PER_PAGE, search, statusFilter, priorityFilter, categoryFilter, dateFilter });
      const res = await API.get(`/tickets?${qs}`);
      setTickets(res.data.data || []);
      const pg = res.data.pagination || {};
      setTotalCount(pg.total ?? 0);
      setTotalPages(pg.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
      t_("Failed to load tickets", "err");
    } finally {
      setLoading(false);
    }
  };

  /* ── fetch ALL matching records for exports (limit=0) ── */
  const fetchAllForExport = async () => {
    const qs = buildParams({ limit: 0, search, statusFilter, priorityFilter, categoryFilter, dateFilter });
    const res = await API.get(`/tickets?${qs}`);
    return res.data.data || [];
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/tickets/stats");
      setStats(res.data.data || null);
    } catch (err) {
      console.error("Failed to fetch ticket stats", err);
    }
  };

  const deleteTicket = async (id) => {
    try {
      await API.delete(`/tickets/${id}`);
      t_("Ticket deleted");
      fetchTickets();
      fetchStats();
    } catch (err) {
      t_("Delete failed", "err");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/tickets/${id}/status`, { status });
      t_(`Status → ${status}`);
      fetchTickets();
      fetchStats();
      if (selectedTicket && selectedTicket._id === id) {
        setSelectedTicket((prev) => ({ ...prev, status }));
      }
    } catch (err) {
      t_("Status update failed", "err");
    }
  };

  const updatePriority = async (id, priority) => {
    try {
      await API.patch(`/tickets/${id}/priority`, { priority });
      t_(`Priority → ${priority}`);
      fetchTickets();
      if (selectedTicket && selectedTicket._id === id) {
        setSelectedTicket((prev) => ({ ...prev, priority }));
      }
    } catch (err) {
      t_("Priority update failed", "err");
    }
  };

  const assignTicket = async (id, assignedTo) => {
    try {
      await API.patch(`/tickets/${id}/assign`, { assignedTo });
      t_(`Assigned to ${assignedTo}`);
      fetchTickets();
      if (selectedTicket && selectedTicket._id === id) {
        setSelectedTicket((prev) => ({ ...prev, assignedTo }));
      }
    } catch (err) {
      t_("Assign failed", "err");
    }
  };

  const addReply = async (id, sender, message) => {
    try {
      const res = await API.post(`/tickets/${id}/reply`, { sender, message });
      t_("Reply sent");
      setSelectedTicket(res.data.data);
      fetchTickets();
    } catch (err) {
      t_("Reply failed", "err");
    }
  };

  /* ── KPI data ── */
  const kpis = useMemo(() => {
    const byStatus = stats?.byStatus || {};
    const byPriority = stats?.byPriority || {};
    return [
      { label: "Total Tickets", value: stats?.total || 0, color: S.brand, icon: "tag" },
      { label: "Open", value: byStatus["Open"] || 0, color: S.blue, icon: "alert" },
      { label: "In Progress", value: byStatus["In Progress"] || 0, color: S.amber, icon: "refresh" },
      { label: "Resolved", value: byStatus["Resolved"] || 0, color: S.green, icon: "check" },
      { label: "Urgent", value: byPriority["Urgent"] || 0, color: S.red, icon: "shield" },
    ];
  }, [stats]);

  /* ── exports ── */
  const buildRows = (data) =>
    data.map((t) => ({
      "Ticket ID": t.ticketId,
      Customer: t.customerName,
      Subject: t.subject,
      Category: t.category,
      Priority: t.priority,
      Status: t.status,
      "Assigned To": t.assignedTo || "—",
      Created: fDate(t.createdAt),
    }));

  const exportCSV = async () => {
    try {
      const allData = await fetchAllForExport();
      const cols = ["Ticket ID", "Customer", "Subject", "Category", "Priority", "Status", "Assigned To", "Created"];
      const rows = buildRows(allData);
      const bom = "\uFEFF";
      const csv = bom + [cols.join(","), ...rows.map((r) => cols.map((c) => `"${String(r[c] || "").replace(/"/g, '""')}"`).join(","))].join("\n");
      saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `tickets_${new Date().toISOString().slice(0, 10)}.csv`);
      setExportOpen(false);
      t_("CSV exported");
    } catch (err) {
      t_("CSV export failed", "err");
    }
  };

  const exportExcel = async () => {
    try {
      const allData = await fetchAllForExport();
      const cols = ["Ticket ID", "Customer", "Subject", "Category", "Priority", "Status", "Assigned To", "Created"];
      await exportFormattedExcel({
        title: "Ticket Report",
        sheetName: "Tickets",
        columns: cols,
        rows: buildRows(allData),
        statusCols: [4, 5],
        filename: "tickets_report",
        summary: {
          "Total Tickets": String(allData.length),
          Open: String(allData.filter((t) => t.status === "Open").length),
          "In Progress": String(allData.filter((t) => t.status === "In Progress").length),
          Resolved: String(allData.filter((t) => t.status === "Resolved").length),
          Urgent: String(allData.filter((t) => t.priority === "Urgent").length),
        },
      });
      setExportOpen(false);
      t_("Excel exported");
    } catch (err) {
      t_("Excel export failed", "err");
    }
  };

  const exportPDF = async () => {
    try {
      const allData = await fetchAllForExport();
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("RG Medlink — Ticket Report", 14, 18);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}  ·  ${allData.length} tickets`, 14, 25);

      const cols = ["Ticket ID", "Customer", "Subject", "Category", "Priority", "Status", "Assigned To", "Created"];
      const rows = buildRows(allData).map((r) => cols.map((c) => r[c]));

      autoTable(doc, {
        startY: 30,
        head: [cols],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.25 },
      });

      doc.save(`tickets_${new Date().toISOString().slice(0, 10)}.pdf`);
      setExportOpen(false);
      t_("PDF exported");
    } catch (err) {
      t_("PDF export failed", "err");
    }
  };

  const clearFilters = () => {
    setSearchInput(""); setSearch(""); setStatusFilter("All"); setPriorityFilter("All");
    setCategoryFilter("All"); setDateFilter("all");
  };
  const hasFilters = searchInput || statusFilter !== "All" || priorityFilter !== "All" || categoryFilter !== "All" || dateFilter !== "all";

  /* ── date pills ── */
  const datePills = [
    { k: "all", l: "All Time" },
    { k: "today", l: "Today" },
    { k: "7d", l: "7 Days" },
    { k: "30d", l: "30 Days" },
  ];

  /* ═══════════════ RENDER ═══════════════ */



  if (loading && tickets.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: `3px solid ${S.border}`,
          borderTopColor: S.brand, borderRadius: "50%", animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }} />
        <div style={{ fontSize: 13, color: S.ink3, fontWeight: 500 }}>Loading tickets…</div>
      </div>
    </div>
  );

  return (
    <div className="fu" style={{ fontFamily: S.font }}>
        {createModal && (
  <CreateTicketModal
    onClose={() => setCreateModal(false)}
    onCreated={() => {
      setCreateModal(false);
      fetchTickets();
      fetchStats();
    }}
  />
)}

      {toast && <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />}
      {confirm && <Confirm {...confirm} />}

      {/* ─── HEADER ─── */}
      <div style={{
        ...card({ padding: "22px 28px", marginBottom: 20 }),
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        border: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: S.r,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(79,70,229,0.4)",
            }}>
              <Ic d={PATHS.tag} s={20} c="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                Ticket Management
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>
                Customer support tickets from mobile app
              </p>
            </div>
          </div>

          {/* Export dropdown */}
          <div ref={exportRef} style={{ position: "relative", display: "flex", gap: 8 }}>
            <Btn
  ch="New Ticket"
  icon="plus"
  v="primary"
  sm
  onClick={() => setCreateModal(true)}
/>
            <Btn ch="Export" icon="download" v="ghost" sm
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
              onClick={() => setExportOpen(!exportOpen)}
            />
            {exportOpen && (
              <div className="sc" style={{
                position: "absolute", right: 0, top: "110%", zIndex: 50,
                ...card({ padding: 6, minWidth: 160 }),
              }}>
                {[
                  { l: "CSV", fn: exportCSV },
                  { l: "Excel", fn: exportExcel },
                  { l: "PDF", fn: exportPDF },
                ].map((e) => (
                  <button key={e.l} onClick={e.fn} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 14px", fontSize: 12.5, fontWeight: 500,
                    color: S.ink2, background: "transparent", border: "none",
                    borderRadius: S.rSm, cursor: "pointer",
                  }}
                    onMouseOver={(ev) => ev.currentTarget.style.background = S.subtle}
                    onMouseOut={(ev) => ev.currentTarget.style.background = "transparent"}
                  >
                    {e.l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── KPI CARDS ─── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {kpis.map((k, i) => (
          <div key={i} className={`fu stagger-${i + 1}`} style={{
            ...card({ padding: "18px 20px", borderTop: `3px solid ${k.color}` }),
            flex: 1, minWidth: 140,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{
                background: `linear-gradient(135deg, ${k.color}22, ${k.color}0E)`,
                borderRadius: 10, padding: 9, display: "flex",
                border: `1px solid ${k.color}25`,
              }}>
                <Ic d={PATHS[k.icon]} s={17} c={k.color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: S.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: S.ink3, marginTop: 4, fontWeight: 500 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* ─── FILTER BAR ─── */}
      <div style={{ ...card({ padding: "12px 18px", marginBottom: 20 }), display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* search */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <Ic d={PATHS.eye} s={14} c={S.ink4} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search ID, subject, customer…"
            style={{
              width: "100%", padding: "7px 10px 7px 8px", borderRadius: 8,
              border: `1.5px solid ${S.border}`, fontSize: 12.5, color: S.ink2,
              outline: "none", background: S.surface, fontWeight: 500,
            }}
          />
        </div>

        {/* status */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectS}>
          <option value="All">All Status</option>
          {["Open", "In Progress", "Resolved", "Closed"].map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* priority */}
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={selectS}>
          <option value="All">All Priority</option>
          {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}
        </select>

        {/* category */}
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectS}>
          <option value="All">All Category</option>
          {["Order Issue", "Payment Issue", "Delivery Issue", "Medicine Query", "Account Issue", "General"].map((c) => <option key={c}>{c}</option>)}
        </select>

        {/* date pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {datePills.map((p) => (
            <button key={p.k} onClick={() => setDateFilter(p.k)} style={{
              padding: "6px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              border: dateFilter === p.k ? `1.5px solid ${S.brand}` : `1.5px solid ${S.border}`,
              background: dateFilter === p.k ? S.brandLt : S.surface,
              color: dateFilter === p.k ? S.brand : S.ink3,
              cursor: "pointer",
            }}>
              {p.l}
            </button>
          ))}
        </div>

        {/* count + clear */}
        <span style={{ fontSize: 11.5, color: S.ink4, fontWeight: 600, whiteSpace: "nowrap" }}>
          {totalCount} ticket{totalCount !== 1 ? "s" : ""}
        </span>
        {hasFilters && (
          <button onClick={clearFilters} style={{
            background: "none", border: "none", color: S.red, fontSize: 11.5,
            fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ─── TABLE ─── */}
      <div style={card({ overflow: "hidden", marginBottom: 20 })}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" }}>
              {["Ticket ID", "Customer", "Subject", "Category", "Priority", "Status", "Assigned To", "Created", "Actions"].map((h) => (
                <th key={h} style={{
                  padding: "12px 14px", textAlign: "left", fontSize: 11,
                  fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: 0.4,
                  textTransform: "uppercase", whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 48, color: S.ink4 }}>
                  <Ic d={PATHS.tag} s={32} c={S.ink5} />
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>No tickets found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Adjust your filters or wait for new tickets</div>
                </td>
              </tr>
            ) : tickets.map((t, i) => {
              const sc = STATUS_CFG[t.status] || STATUS_CFG.Open;
              const pc = PRIORITY_CFG[t.priority] || PRIORITY_CFG.Medium;
              const cc = CATEGORY_CFG[t.category] || CATEGORY_CFG.General;
              return (
                <tr key={t._id} className={`fu stagger-${Math.min(i + 1, 5)}`}
                  style={{ borderBottom: `1px solid ${S.border}`, cursor: "pointer" }}
                  onClick={() => setSelectedTicket(t)}
                >
                  <td style={{ padding: "12px 14px", fontWeight: 600, color: S.brand, fontSize: 12.5 }}>
                    {t.ticketId}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: S.ink, fontSize: 13 }}>{t.customerName}</div>
                    {t.customerPhone && (
                      <div style={{ fontSize: 11, color: S.ink4, marginTop: 1 }}>{t.customerPhone}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: S.ink2 }}>
                    {t.subject}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      background: cc.bg, color: cc.color,
                      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${cc.color}20`, whiteSpace: "nowrap",
                    }}>
                      {t.category}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      background: pc.bg, color: pc.color,
                      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${pc.color}20`, whiteSpace: "nowrap",
                    }}>
                      {t.priority === "Urgent" && "🔴 "}{t.priority}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: sc.bg, color: sc.color,
                      padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${sc.color}20`, whiteSpace: "nowrap",
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: sc.color,
                      }} />
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12.5, color: t.assignedTo ? S.ink2 : S.ink4 }}>
                    {t.assignedTo || "Unassigned"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: S.ink3, whiteSpace: "nowrap" }}>
                    <div>{fDate(t.createdAt)}</div>
                    <div style={{ fontSize: 10.5, color: S.ink4 }}>{timeAgo(t.createdAt)}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setSelectedTicket(t)} style={{
                        background: S.brandLt, border: `1px solid ${S.brand}25`, borderRadius: 7,
                        padding: 6, cursor: "pointer", display: "flex",
                      }}>
                        <Ic d={PATHS.eye} s={14} c={S.brand} />
                      </button>
                      <button onClick={() => setConfirm({
                        title: "Delete Ticket",
                        msg: `Are you sure you want to delete ticket ${t.ticketId}?`,
                        onYes: () => { deleteTicket(t._id); setConfirm(null); },
                        onNo: () => setConfirm(null),
                      })} style={{
                        background: S.redLt, border: `1px solid ${S.red}25`, borderRadius: 7,
                        padding: 6, cursor: "pointer", display: "flex",
                      }}>
                        <Ic d={PATHS.trash} s={14} c={S.red} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* pagination */}
        {totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 18px", borderTop: `1px solid ${S.border}`, background: S.bg,
          }}>
            <span style={{ fontSize: 12, color: S.ink4, fontWeight: 500 }}>
              Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, totalCount)} of {totalCount}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${S.border}`, background: S.surface,
                  color: currentPage === 1 ? S.ink5 : S.ink2, cursor: currentPage === 1 ? "default" : "pointer",
                }}>
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span style={{ padding: "5px 4px", color: S.ink4, fontSize: 12 }}>…</span>
                    )}
                    <button onClick={() => setCurrentPage(p)} style={{
                      padding: "5px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                      border: p === currentPage ? `1.5px solid ${S.brand}` : `1px solid ${S.border}`,
                      background: p === currentPage ? S.brandLt : S.surface,
                      color: p === currentPage ? S.brand : S.ink2, cursor: "pointer",
                    }}>
                      {p}
                    </button>
                  </span>
                ))}
              <button disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${S.border}`, background: S.surface,
                  color: currentPage === totalPages ? S.ink5 : S.ink2,
                  cursor: currentPage === totalPages ? "default" : "pointer",
                }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── DETAIL MODAL ─── */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={updateStatus}
          onPriorityChange={updatePriority}
          onAssign={assignTicket}
          onReply={addReply}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   TICKET DETAIL MODAL
   ══════════════════════════════════════════════════════════════════ */
const TicketDetailModal = ({ ticket, onClose, onStatusChange, onPriorityChange, onAssign, onReply }) => {
  const [replyText, setReplyText] = useState("");
  const [assignInput, setAssignInput] = useState(ticket.assignedTo || "");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages]);

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(ticket._id, "Admin", replyText.trim());
    setReplyText("");
  };

  const sc = STATUS_CFG[ticket.status] || STATUS_CFG.Open;
  const pc = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.Medium;

  return (
    <Modal title={ticket.ticketId} sub={ticket.subject} onClose={onClose} w={820}
      ch={
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Customer info + controls row ── */}
          <div style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            borderRadius: S.r, padding: "18px 22px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              {/* Customer info */}
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, color: "#fff",
                  boxShadow: "0 4px 12px rgba(79,70,229,0.4)",
                }}>
                  {(ticket.customerName || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{ticket.customerName}</div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    {ticket.customerPhone && (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 4 }}>
                        📞 {ticket.customerPhone}
                      </span>
                    )}
                    {ticket.customerEmail && (
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", gap: 4 }}>
                        ✉ {ticket.customerEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chips */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: sc.bg, color: sc.color,
                  padding: "4px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${sc.color}30`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.color }} />
                  {ticket.status}
                </span>
                <span style={{
                  background: pc.bg, color: pc.color,
                  padding: "4px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${pc.color}30`,
                }}>
                  {ticket.priority}
                </span>
              </div>
            </div>
          </div>

          {/* ── Info Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { l: "Category", v: ticket.category || "General" },
              { l: "Order ID", v: ticket.orderId || "—" },
              { l: "Created", v: fDateTime(ticket.createdAt) },
              { l: "Last Updated", v: fDateTime(ticket.updatedAt) },
              { l: "Resolved At", v: ticket.resolvedAt ? fDateTime(ticket.resolvedAt) : "—" },
              { l: "Messages", v: `${(ticket.messages || []).length} replies` },
            ].map((item, i) => (
              <div key={i} style={{
                background: S.bg, borderRadius: S.rSm, padding: "10px 14px",
                border: `1px solid ${S.border}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {item.l}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: S.ink, marginTop: 3 }}>
                  {item.v}
                </div>
              </div>
            ))}
          </div>

          {/* ── Description ── */}
          <div style={{
            background: S.bg, borderRadius: S.r, padding: "16px 20px",
            border: `1px solid ${S.border}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Description
            </div>
            <div style={{ fontSize: 13, color: S.ink2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </div>
          </div>

          {/* ── Controls row ── */}
          <div style={{
            display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            background: S.bg, borderRadius: S.r, padding: "14px 18px",
            border: `1px solid ${S.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4, textTransform: "uppercase" }}>Status:</span>
              <select value={ticket.status}
                onChange={(e) => onStatusChange(ticket._id, e.target.value)}
                style={{ ...selectS, fontWeight: 600, color: sc.color }}>
                {["Open", "In Progress", "Resolved", "Closed"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4, textTransform: "uppercase" }}>Priority:</span>
              <select value={ticket.priority}
                onChange={(e) => onPriorityChange(ticket._id, e.target.value)}
                style={{ ...selectS, fontWeight: 600, color: pc.color }}>
                {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 160 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4, textTransform: "uppercase", whiteSpace: "nowrap" }}>Assign:</span>
              <input value={assignInput}
                onChange={(e) => setAssignInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && assignInput.trim()) onAssign(ticket._id, assignInput.trim()); }}
                placeholder="Agent name"
                style={{
                  ...selectS, flex: 1, appearance: "none",
                }}
              />
              <button onClick={() => { if (assignInput.trim()) onAssign(ticket._id, assignInput.trim()); }}
                style={{
                  background: S.brand, color: "#fff", border: "none", borderRadius: 7,
                  padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}>
                Assign
              </button>
            </div>
          </div>

          {/* ── Conversation Thread ── */}
          <div style={{
            border: `1px solid ${S.border}`, borderRadius: S.r, overflow: "hidden",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
              padding: "12px 18px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Conversation ({(ticket.messages || []).length})
              </span>
            </div>

            <div style={{
              maxHeight: 320, overflowY: "auto", padding: "16px 18px",
              background: S.bg, display: "flex", flexDirection: "column", gap: 12,
            }}>
              {(!ticket.messages || ticket.messages.length === 0) ? (
                <div style={{ textAlign: "center", padding: 24, color: S.ink4, fontSize: 13 }}>
                  No messages yet
                </div>
              ) : ticket.messages.map((msg, i) => {
                const isAdmin = msg.sender === "Admin";
                return (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: isAdmin ? "flex-end" : "flex-start",
                  }}>
                    <div style={{
                      maxWidth: "75%",
                      background: isAdmin
                        ? "linear-gradient(135deg, #4F46E5, #6D28D9)"
                        : S.surface,
                      color: isAdmin ? "#fff" : S.ink2,
                      borderRadius: 14,
                      borderTopRightRadius: isAdmin ? 4 : 14,
                      borderTopLeftRadius: isAdmin ? 14 : 4,
                      padding: "10px 16px",
                      boxShadow: isAdmin
                        ? "0 2px 8px rgba(79,70,229,0.25)"
                        : `0 1px 4px rgba(15,23,42,0.06)`,
                      border: isAdmin ? "none" : `1px solid ${S.border}`,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>
                        {msg.sender}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {msg.message}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6, textAlign: "right" }}>
                        {fDateTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div style={{
              padding: "12px 18px", borderTop: `1px solid ${S.border}`, background: S.surface,
              display: "flex", gap: 10,
            }}>
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleReply(); }}
                placeholder="Type your reply…"
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${S.border}`, fontSize: 13, color: S.ink,
                  outline: "none", background: S.bg,
                }}
              />
              <button onClick={handleReply} disabled={!replyText.trim()} style={{
                background: replyText.trim() ? "linear-gradient(135deg, #4F46E5, #6D28D9)" : S.border,
                color: replyText.trim() ? "#fff" : S.ink4,
                border: "none", borderRadius: 10, padding: "10px 20px",
                fontSize: 13, fontWeight: 600, cursor: replyText.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: replyText.trim() ? "0 2px 8px rgba(79,70,229,0.3)" : "none",
                transition: "all .15s",
              }}>
                <Ic d={PATHS.send} s={14} c="currentColor" />
                Send
              </button>
            </div>
          </div>

        </div>
      }
    />
  );
};

/* ─── CREATE TICKET MODAL STYLES ───────────────────────── */
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "85vw",
  height: "100vh",
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 0, // ✅ IMPORTANT (remove white gap)
   
};


const formWrap = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
  marginTop: 10,
};

const fullWidth = {
  gridColumn: "1 / -1",
};

const labelStyle = {
  fontSize: 11.5,
  fontWeight: 700,
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  marginBottom: 4,
  display: "block",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid #E2E8F0",
  fontSize: 13,
  outline: "none",
  background: "#F8FAFC",
  color: "#1E293B",
  fontWeight: 500,
};


const textareaStyle = {
  ...inputStyle,
  minHeight: 90,
  resize: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

// const labelStyle = {
//   fontSize: 11.5,
//   fontWeight: 700,
//   color: S.ink4,
//   marginBottom: -6,
//   textTransform: "uppercase",
//   letterSpacing: 0.4,
// };

const submitBtn = {
  marginTop: 6,
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #4F46E5, #6D28D9)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const overlayCenter = {
  position: "fixed",
  top: -10,
  right: -150,
  width: "100vw",
  height: "100vh",
  background: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
};

const modalBox = {
  width: 380,
  background: "#fff",
  borderRadius: 16,
  padding: "24px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  textAlign: "center",
};

const iconWrap = {
  width: 50,
  height: 50,
  borderRadius: 12,
  background: "#FEF2F2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 16px",
};

const actionRow = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
  marginTop: 20,
};


export default TicketsView;


