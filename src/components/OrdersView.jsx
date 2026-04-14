  import { useEffect, useState, useMemo, useCallback, useRef } from "react";
  import API from "../api";
  import { useNavigate, useLocation } from "react-router-dom";
  import { Modal, Ic, PATHS, Btn, Toast } from "./Styles";
  import NewOrderForm from "./NewOrderForm";
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import * as XLSX from "xlsx";
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
    font: "'DM Sans', sans-serif",
    shadow: "0 1px 3px rgba(15,23,42,0.04), 0 6px 24px rgba(15,23,42,0.08)",
    r: 12, rSm: 8, rLg: 16,
  };

  const PER_PAGE = 7;

  const STATUS_CFG = {
    Created:    { color: S.amber,  bg: S.amberLt, icon: PATHS.clock },
    Processing: { color: S.blue,   bg: S.blueLt,  icon: PATHS.refresh },
    Packed:     { color: S.purple, bg: S.purpleLt, icon: PATHS.box },
    Shipped:    { color: S.teal,   bg: S.tealLt,  icon: PATHS.truck },
    Delivered:  { color: S.green,  bg: S.greenLt, icon: PATHS.check },
  };

  const PAY_CFG = {
    Paid:    { color: S.green,  bg: S.greenLt },
    Pending: { color: S.amber,  bg: S.amberLt },
    Unpaid:  { color: S.red,    bg: S.redLt },
    COD:     { color: S.purple, bg: S.purpleLt },
  };

  /* ── Confirm Dialog ────────────────────────────────────────────── */
  const Confirm = ({ title, msg, label = "Delete", onYes, onNo }) => (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div className="sc" style={{
        background: S.surface, borderRadius: S.rLg, width: 400,
        boxShadow: "0 20px 60px rgba(15,23,42,0.15)", overflow: "hidden",
      }}>
        <div style={{ padding: "28px 28px 16px" }}>
          <div style={{
            width: 44, height: 44, borderRadius: S.r, marginBottom: 16,
            background: S.redLt, border: "1px solid #FECACA",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Ic d={PATHS.alert} s={20} c={S.red} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: S.ink, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13, color: S.ink3, lineHeight: 1.6 }}>{msg}</div>
        </div>
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          padding: "16px 28px", background: S.subtle, borderTop: `1px solid ${S.border}`,
        }}>
          <Btn ch="Cancel" v="ghost" onClick={onNo} />
          <Btn ch={label} v="danger" onClick={onYes} />
        </div>
      </div>
    </div>
  );

  /* ── card helper ────────────────────────────────────────────────── */
  const card = (x = {}) => ({
    background: S.surface, borderRadius: S.r,
    border: `1px solid ${S.border}`,
    boxShadow: S.shadow, ...x,
  });

  /* ── Build query-string params from current filters ── */
  const buildFilterParams = (filters) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.statusFilter && filters.statusFilter !== "All") params.set("orderStatus", filters.statusFilter);
    if (filters.payFilter && filters.payFilter !== "All") params.set("paymentStatus", filters.payFilter);

    // Date computation
    const now = new Date();
    if (filters.dateFilter === "today") {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      params.set("from", s.toISOString());
    } else if (filters.dateFilter === "week") {
      const s = new Date(now); s.setDate(s.getDate() - 7); s.setHours(0, 0, 0, 0);
      params.set("from", s.toISOString());
    } else if (filters.dateFilter === "month") {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      params.set("from", s.toISOString());
    } else if (filters.dateFilter === "year") {
      const s = new Date(now.getFullYear(), 0, 1);
      params.set("from", s.toISOString());
    } else if (filters.dateFilter === "custom") {
      if (filters.customFrom) params.set("from", new Date(filters.customFrom + "T00:00:00").toISOString());
      if (filters.customTo) params.set("to", new Date(filters.customTo + "T23:59:59").toISOString());
    }
    // "all" → don't send from/to

    return params;
  };

  /* ══════════════════════════════════════════════════════════════════
    MAIN COMPONENT
    ══════════════════════════════════════════════════════════════════ */
  const OrdersView = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [payFilter, setPayFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    
    const highlightOrderId = location.state?.orderId;
    
  const subtotal = (selectedOrder?.items || []).reduce(
    (sum, m) => sum + ((m.qty || 0) * (m.price || 0)),
    0
  );
    const t_ = useCallback((m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3500); }, []);

    /* ── Debounce search input ── */
    useEffect(() => {
      const t = setTimeout(() => setSearch(searchInput), 400);
      return () => clearTimeout(t);
    }, [searchInput]);


    useEffect(() => {
    if (location.state?.statusFilter) {
      setStatusFilter(location.state.statusFilter);
    }
  }, [location.state]);

    /* ── Reset page to 1 when any filter changes ── */
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter, payFilter, dateFilter, customFrom, customTo]);

    /* ── Fetch orders from server with pagination + filters ── */
    const fetchOrders = useCallback(async (page, filters) => {
      try {
        setLoading(true);
        const params = buildFilterParams(filters);
        params.set("page", String(page));
        params.set("limit", String(PER_PAGE));
        const res = await API.get(`/orders?${params.toString()}`);
        setOrders(res.data.data || []);
        if (res.data.pagination) {
          setTotalRecords(res.data.pagination.total || 0);
          setTotalPages(res.data.pagination.totalPages || 0);
        }
      } catch (err) {
        console.error("Failed to fetch orders", err);
        t_("Failed to load orders", "err");
      } finally {
        setLoading(false);
      }
    }, [t_]);



    /* ── Re-fetch when page or filters change ── */
    useEffect(() => {
      fetchOrders(currentPage, { search, statusFilter, payFilter, dateFilter, customFrom, customTo });
    }, [currentPage, search, statusFilter, payFilter, dateFilter, customFrom, customTo, fetchOrders]);

    /* Close export dropdown on outside click */
    useEffect(() => {
      const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
      if (!highlightOrderId) return;
      setTimeout(() => {
        const row = document.getElementById(`order-${highlightOrderId}`);
        if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }, [orders, highlightOrderId]);

    useEffect(() => {
    if (!highlightOrderId || orders.length === 0) return;

    const foundOrder = orders.find(
      (o) => o.orderId === highlightOrderId
    );

    if (foundOrder) {
      setSelectedOrder(foundOrder); // ✅ OPEN MODAL
    }
  }, [orders, highlightOrderId]);

    /* ── Convenience: re-fetch current page with current filters ── */
    const refetch = useCallback(() => {
      fetchOrders(currentPage, { search, statusFilter, payFilter, dateFilter, customFrom, customTo });
    }, [fetchOrders, currentPage, search, statusFilter, payFilter, dateFilter, customFrom, customTo]);

    const updateStatus = async (id, status) => {
      try {
        await API.patch(`/orders/${id}/status`, { status });
        t_(`Order status → ${status}`);
        refetch();
      } catch (err) {
        console.error("Status update failed", err);
        t_("Status update failed", "err");
      }
    };

    const markPaid = async (id) => {
      try {
        await API.patch(`/orders/${id}/pay`);
        t_("Payment marked as Paid");
        refetch();
        if (selectedOrder?._id === id) {
          setSelectedOrder(prev => ({ ...prev, paymentStatus: "Paid" }));
        }
      } catch (err) {
        t_("Payment update failed", "err");
      }
    };

    const deleteOrder = (o) => setConfirm({
      title: "Delete Order",
      msg: `Permanently delete order "${o.orderId}"? This action cannot be undone.`,
      onYes: async () => {
        setConfirm(null);
        try {
          await API.delete(`/orders/${o._id}`);
          t_(`Order ${o.orderId} deleted`, "warn");
          refetch();
        } catch (err) {
          t_(err.response?.data?.message || "Delete failed", "err");
        }
      },
    });

    const handleSaveOrder = async (data) => {
      await API.post("/prescriptions", data);
      t_("Order created successfully");
      setShowNewOrder(false);
      refetch();
    };

    /* ── Stats (computed from current page data — for KPI cards we use totalRecords) ── */
    const stats = useMemo(() => {
      // Note: With server-side pagination, per-status counts are not available from the
      // paginated response alone. We show totalRecords for "total" and keep the rest
      // computed from the current page data as approximate indicators.
      // For accurate stats, the backend should provide aggregate counts.
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);
      const totalRevenue = orders
        .filter(o => o.paymentStatus === "Paid")
        .reduce((s, o) => s + (o.totalAmount || 0), 0);
      return {
        total: totalRecords,
        today: todayOrders.length,
        created: orders.filter(o => o.orderStatus === "Created").length,
        processing: orders.filter(o => o.orderStatus === "Processing").length,
        packed: orders.filter(o => o.orderStatus === "Packed").length,
        shipped: orders.filter(o => o.orderStatus === "Shipped").length,
        delivered: orders.filter(o => o.orderStatus === "Delivered").length,
        paid: orders.filter(o => o.paymentStatus === "Paid").length,
        revenue: totalRevenue,
      };
    }, [orders, totalRecords]);

    /* ── Status chip ── */
    const StatusChip = ({ status }) => {
      const cfg = STATUS_CFG[status] || { color: S.ink4, bg: S.subtle };
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />
          {status}
        </span>
      );
    };

    const PayChip = ({ status }) => {
      const cfg = PAY_CFG[status] || { color: S.ink4, bg: S.subtle };
      return (
        <span style={{
          padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20`,
        }}>
          {status || "Pending"}
        </span>
      );
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
    const fmtCur = (v) => `₹${(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    /* ── Export helpers (fetch ALL filtered data with limit=0) ── */
    const fetchAllFiltered = async () => {
      const params = buildFilterParams({ search, statusFilter, payFilter, dateFilter, customFrom, customTo });
      params.set("limit", "0");
      const res = await API.get(`/orders?${params.toString()}`);
      return res.data.data || [];
    };

    const exportRows = (allOrders) => allOrders.map(o => ({
      "Order ID": o.orderId || "",
      "Customer": o.patientDetails?.name || "Unknown",
      "Phone": o.patientDetails?.phone || o.patientDetails?.primaryPhone || "",
      "Date": fmtDate(o.createdAt),
      "Amount": o.totalAmount || 0,
      "Status": o.orderStatus || "Created",
      "Payment": o.paymentStatus || "Pending",
      "Address": o.addressDetails?.fullAddress || "",
      "City": o.addressDetails?.city || "",
    }));

    const exportCSV = async () => {
      try {
        const allOrders = await fetchAllFiltered();
        const rows = exportRows(allOrders);
        if (!rows.length) return t_("No data to export", "warn");
        const headers = Object.keys(rows[0]);
        const csv = [
          headers.join(","),
          ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))
        ].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        saveAs(blob, `orders_${new Date().toISOString().slice(0, 10)}.csv`);
        t_("CSV exported successfully");
        setExportOpen(false);
      } catch (err) {
        console.error("CSV export failed", err);
        t_("CSV export failed", "err");
      }
    };

    const exportExcel = async () => {
      try {
        const allOrders = await fetchAllFiltered();
        const rows = exportRows(allOrders);
        if (!rows.length) return t_("No data to export", "warn");
        const columns = ["Order ID", "Customer", "Phone", "Date", "Amount", "Status", "Payment", "Address", "City"];
        await exportFormattedExcel({
          title: "Order Report",
          sheetName: "Orders",
          columns,
          rows,
          currencyCols: [4],
          statusCols: [5, 6],
          filename: "orders",
          summary: {
            "Total Orders": rows.length,
            "Total Revenue": `₹${rows.reduce((s, r) => s + (r["Amount"] || 0), 0).toLocaleString("en-IN")}`,
            "Report Period": `${statusFilter} / ${payFilter} / ${dateFilter}`,
          },
        });
        t_("Excel exported successfully");
        setExportOpen(false);
      } catch (err) {
        console.error("Excel export failed", err);
        t_("Excel export failed", "err");
      }
    };

    const exportPDF = async () => {
      try {
        const allOrders = await fetchAllFiltered();
        const rows = exportRows(allOrders);
        if (!rows.length) return t_("No data to export", "warn");
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(16);
        doc.text("Order Report", 14, 18);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString("en-IN")}  |  ${rows.length} orders  |  Filters: ${statusFilter}, ${payFilter}, ${dateFilter}`, 14, 25);
        const headers = ["Order ID", "Customer", "Phone", "Date", "Amount", "Status", "Payment"];
        autoTable(doc, {
          startY: 30,
          head: [headers],
          body: rows.map(r => headers.map(h => h === "Amount" ? fmtCur(r[h]) : r[h])),
          styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 4: { halign: "right" } },
        });
        doc.save(`orders_${new Date().toISOString().slice(0, 10)}.pdf`);
        t_("PDF exported successfully");
        setExportOpen(false);
      } catch (err) {
        console.error("PDF export failed", err);
        t_("PDF export failed", "err");
      }
    };

    /* ── RENDER ── */
    return (
      <div className="fu" style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: S.font }}>

        {toast && <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />}
        {confirm && <Confirm {...confirm} onNo={() => setConfirm(null)} />}

        {/* ═══════════════ HEADER ═══════════════ */}
        <div style={{
          background: `linear-gradient(135deg, ${S.brand} 0%, #6D28D9 60%, #7C3AED 100%)`,
          borderRadius: S.rLg, padding: "22px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: `0 8px 32px ${S.brand}40, 0 2px 8px rgba(0,0,0,0.1)`,
          position: "relative", overflow: "visible",
        }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 80, bottom: -60, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Pharmacy</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>/</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>Orders</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
              Order & Delivery Management
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              Track orders, manage deliveries &amp; update payment status
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative", zIndex: 1 }}>
            <button onClick={refetch} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: S.font, backdropFilter: "blur(4px)", transition: "all .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            >
              <Ic d={PATHS.refresh} s={13} c="#fff" /> Refresh
            </button>

            {/* Export Dropdown */}
            <div ref={exportRef} style={{ position: "relative" }}>
              <button onClick={() => setExportOpen(v => !v)} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: S.font, backdropFilter: "blur(4px)", transition: "all .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              >
                <Ic d={PATHS.download} s={13} c="#fff" /> Export
              </button>
              {exportOpen && (
                <div className="sc" style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                  background: S.surface, borderRadius: S.r, border: `1px solid ${S.border}`,
                  boxShadow: "0 16px 48px rgba(15,23,42,0.18)", minWidth: 210, overflow: "hidden",
                }}>
                  <div style={{ padding: "12px 16px 8px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.7 }}>
                      Export {totalRecords} orders as
                    </span>
                  </div>
                  {[
                    { l: "CSV (.csv)", desc: "Spreadsheet compatible", icon: PATHS.download, fn: exportCSV, color: S.green },
                    { l: "Excel (.xlsx)", desc: "Microsoft Excel format", icon: PATHS.download, fn: exportExcel, color: S.blue },
                    { l: "PDF (.pdf)", desc: "Print-ready document", icon: PATHS.download, fn: exportPDF, color: S.red },
                  ].map(opt => (
                    <button key={opt.l} onClick={opt.fn} style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%",
                      padding: "10px 16px", border: "none", background: "transparent",
                      cursor: "pointer", fontFamily: S.font, textAlign: "left", transition: "background .1s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = S.subtle}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: S.rSm,
                        background: opt.color + "15", border: `1px solid ${opt.color}25`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Ic d={opt.icon} s={15} c={opt.color} />
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

            <button onClick={() => setShowNewOrder(true)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.4)",
              background: "#fff", color: S.brand, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: S.font, boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              transition: "all .15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)"; }}
            >
              <Ic d={PATHS.plus} s={13} c={S.brand} /> New Order
            </button>
          </div>
        </div>

        {/* ═══════════════ KPI STATS ═══════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {[
            { label: "Total Orders",  value: stats.total,           color: S.brand,  icon: PATHS.orders,  sub: `${stats.today} today` },
            { label: "Pending",       value: stats.created,         color: S.amber,  icon: PATHS.clock,   sub: "awaiting action", tab: "Created" },
            { label: "Processing",    value: stats.processing,      color: S.blue,   icon: PATHS.refresh, sub: "in progress", tab: "Processing" },
            { label: "Shipped",       value: stats.shipped,         color: S.teal,   icon: PATHS.truck,   sub: "in transit", tab: "Shipped" },
            { label: "Delivered",     value: stats.delivered,       color: S.green,  icon: PATHS.check,   sub: "completed", tab: "Delivered" },
            { label: "Revenue",       value: fmtCur(stats.revenue), color: S.purple, icon: PATHS.dollar,  sub: `${stats.paid} paid orders` },
          ].map((m) => {
            const isActive = m.tab && statusFilter === m.tab;
            return (
              <div key={m.label}
                className="card-hover"
                onClick={m.tab ? () => setStatusFilter(m.tab) : undefined}
                style={{
                  background: S.surface,
                  borderRadius: S.rLg,
                  padding: "20px 18px",
                  border: `1px solid ${isActive ? m.color + "55" : S.border}`,
                  boxShadow: isActive
                    ? `0 6px 24px ${m.color}28, 0 1px 4px rgba(15,23,42,0.06)`
                    : S.shadow,
                  cursor: m.tab ? "pointer" : "default",
                  transition: "all .2s",
                  borderTop: `3px solid ${m.color}`,
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute", right: -14, top: -14,
                  width: 70, height: 70, borderRadius: "50%",
                  background: m.color + "0a", pointerEvents: "none",
                }} />
                <div style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: `linear-gradient(135deg, ${m.color}25, ${m.color}10)`,
                  border: `1.5px solid ${m.color}28`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Ic d={m.icon} s={18} c={m.color} />
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: isActive ? m.color : S.ink, letterSpacing: -1.2, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.ink3, marginTop: 7 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: S.ink4, marginTop: 2 }}>{m.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ═══════════════ FILTER BAR ═══════════════ */}
        <div style={card()}>
          {/* Main row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}>

            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: S.bg, border: `1.5px solid ${S.border}`, borderRadius: 8,
              padding: "8px 12px", width: 240, flexShrink: 0,
            }}>
              <Ic d={PATHS.orders} s={14} c={S.ink4} />
              <input
                placeholder="Search ID, customer, invoice..."
                value={searchInput} onChange={e => setSearchInput(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: 12.5, color: S.ink, fontFamily: S.font, width: "100%", background: "transparent" }}
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                  <Ic d={PATHS.x} s={11} c={S.ink4} />
                </button>
              )}
            </div>

            <div style={{ width: 1, height: 28, background: S.border, flexShrink: 0 }} />

            {/* Status pills */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, flexWrap: "nowrap" }}>
              {[
                { label: "All",        value: "All",         count: stats.total,      color: S.ink },
                { label: "Pending",    value: "Created",     count: stats.created,    color: S.amber },
                { label: "Processing", value: "Processing",  count: stats.processing, color: S.blue },
                { label: "Packed",     value: "Packed",      count: stats.packed,     color: S.purple },
                { label: "Shipped",    value: "Shipped",     count: stats.shipped,    color: S.teal },
                { label: "Delivered",  value: "Delivered",   count: stats.delivered,  color: S.green },
              ].map(tab => {
                const active = statusFilter === tab.value;
                return (
                  <button key={tab.value} onClick={() => setStatusFilter(tab.value)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", borderRadius: 99,
                    border: `1.5px solid ${active ? tab.color : S.border}`,
                    background: active ? tab.color + "14" : "transparent",
                    color: active ? tab.color : S.ink4,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: S.font,
                    whiteSpace: "nowrap", transition: "all .15s",
                  }}>
                    {tab.label}
                    <span style={{
                      background: active ? tab.color : S.subtle,
                      color: active ? "#fff" : S.ink4,
                      borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700,
                    }}>{tab.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Payment dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4, letterSpacing: 0.3 }}>Payment:</span>
              <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={selectS}>
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unpaid">Unpaid</option>
                <option value="COD">COD</option>
              </select>
            </div>

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

            <div style={{ flex: 1 }} />

            {/* Count + Clear */}
            <span style={{ fontSize: 12, color: S.ink4, fontWeight: 500, whiteSpace: "nowrap" }}>
              {totalRecords} order{totalRecords !== 1 ? "s" : ""}
            </span>
            {(statusFilter !== "All" || payFilter !== "All" || dateFilter !== "all" || searchInput) && (
              <button onClick={() => { setStatusFilter("All"); setPayFilter("All"); setDateFilter("all"); setCustomFrom(""); setCustomTo(""); setSearchInput(""); setSearch(""); }} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "5px 10px", borderRadius: 6, border: `1px solid ${S.red}20`,
                background: S.redLt, color: S.red, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: S.font, whiteSpace: "nowrap",
              }}>
                <Ic d={PATHS.x} s={10} c={S.red} /> Clear
              </button>
            )}
          </div>

          {/* Custom date row */}
          {dateFilter === "custom" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "0 18px 12px", borderTop: `1px solid ${S.border}`, paddingTop: 10, marginTop: -2,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4 }}>FROM</span>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={dateInput} />
              <span style={{ fontSize: 11, fontWeight: 700, color: S.ink4 }}>TO</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={dateInput} />
            </div>
          )}
        </div>

        {/* ═══════════════ TABLE ═══════════════ */}
        <div style={card({ overflow: "hidden" })}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: `linear-gradient(90deg, ${S.brand}07 0%, ${S.brandLt}80 100%)`, borderBottom: `2px solid ${S.brand}18` }}>
                  {["Order ID", "Customer", "Date", "Amount", "Status", "Payment", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "13px 16px", textAlign: "left", fontSize: 11,
                      fontWeight: 700, color: S.ink3,
                      textTransform: "uppercase", letterSpacing: 0.7,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: 40, color: S.ink4, fontSize: 13 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, border: `3px solid ${S.border}`,
                          borderTopColor: S.brand, borderRadius: "50%", animation: "spin 0.8s linear infinite",
                        }} />
                        Loading orders...
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: 64, color: S.ink4 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: 18,
                          background: `linear-gradient(135deg, ${S.brand}18, ${S.brand}08)`,
                          border: `1.5px solid ${S.brand}22`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Ic d={PATHS.orders} s={28} c={S.brand} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: S.ink }}>No orders found</span>
                        <span style={{ fontSize: 13, color: S.ink4 }}>Try adjusting your filters or search</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.map((o, i) => {
                  const isHighlighted = o.orderId === highlightOrderId;
                  return (
                    <tr
                      key={o._id}
                      id={`order-${o.orderId}`}
                      style={{
                        background: isHighlighted ? S.brandLt : i % 2 === 0 ? "#fff" : S.bg,
                        transition: "background .15s",
                        borderLeft: isHighlighted
                          ? `4px solid ${S.brand}`
                          : `4px solid ${(STATUS_CFG[o.orderStatus || "Created"] || {}).color || S.border}`,
                      }}
                    >
                      <td style={tdS}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: S.brand, fontFamily: "'DM Mono', monospace",
                          background: S.brandLt, padding: "3px 8px", borderRadius: 6,
                          border: `1px solid ${S.brand}20`, whiteSpace: "nowrap",
                        }}>
                          {o.orderId}
                        </span>
                      </td>

                      <td style={tdS}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `linear-gradient(135deg, ${S.brand}20, ${S.brand}10)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, fontSize: 12, fontWeight: 700, color: S.brand,
                          }}>
                            {(o.patientDetails?.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>
                              {o.patientDetails?.name || "Unknown"}
                            </div>
                            <div style={{ fontSize: 11, color: S.ink4 }}>
                              {o.patientDetails?.phone || o.patientDetails?.primaryPhone || ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tdS}>
                        <span style={{ fontSize: 13, color: S.ink3 }}>{fmtDate(o.createdAt)}</span>
                      </td>

                      <td style={tdS}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: S.ink }}>{fmtCur(o.totalAmount)}</span>
                      </td>

                      <td style={tdS}><StatusChip status={o.orderStatus || "Created"} /></td>

                      <td style={tdS}><PayChip status={o.paymentStatus} /></td>

                      <td style={tdS}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            title="View Details"
                            onClick={() => setSelectedOrder(o)}
                            style={actionBtn}
                          >
                            <Ic d={PATHS.eye} s={14} c={S.brand} />
                          </button>
                          <button
                            title="Delete Order"
                            onClick={() => deleteOrder(o)}
                            style={{ ...actionBtn, background: S.redLt, border: `1px solid ${S.red}20` }}
                          >
                            <Ic d={PATHS.trash} s={14} c={S.red} />
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
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{ ...pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <button key={i} onClick={() => setCurrentPage(pageNum)} style={{
                      ...pageBtn,
                      background: currentPage === pageNum ? S.brand : "#fff",
                      color: currentPage === pageNum ? "#fff" : S.ink3,
                      fontWeight: currentPage === pageNum ? 700 : 500,
                      boxShadow: currentPage === pageNum ? `0 2px 8px ${S.brand}40` : "none",
                    }}>
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{ ...pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════ ORDER DETAIL MODAL ═══════════════ */}
        {selectedOrder && (
          <Modal
            title={`Order ${selectedOrder.orderId}`}
            sub={`Placed on ${fmtDate(selectedOrder.createdAt)}`}
            w={980}
            onClose={() => setSelectedOrder(null)}
            ch={
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Status + Payment row */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    flex: 1, ...card({ padding: "16px 20px" }),
                    borderTop: `3px solid ${(STATUS_CFG[selectedOrder.orderStatus] || {}).color || S.ink4}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                      Order Status
                    </div>
                    <select
                      value={selectedOrder.orderStatus}
                      onChange={(e) => {
                        const ns = e.target.value;
                        setSelectedOrder(prev => ({ ...prev, orderStatus: ns }));
                        updateStatus(selectedOrder._id, ns);
                      }}
                      style={{
                        width: "100%", padding: "10px 12px", borderRadius: S.rSm,
                        border: `1.5px solid ${S.border}`, fontSize: 13, fontWeight: 600,
                        color: S.ink, background: S.bg, outline: "none", cursor: "pointer",
                        fontFamily: S.font,
                      }}
                    >
                      {["Created", "Processing", "Packed", "Shipped", "Delivered"].map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>

                    {/* Status timeline */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 16 }}>
                      {["Created", "Processing", "Packed", "Shipped", "Delivered"].map((step, i, arr) => {
                        const steps = arr;
                        const currentIdx = steps.indexOf(selectedOrder.orderStatus);
                        const isComplete = i <= currentIdx;
                        const isCurrent = i === currentIdx;
                        return (
                          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : 0 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                              background: isComplete ? (STATUS_CFG[step]?.color || S.brand) : S.subtle,
                              border: isCurrent ? `2px solid ${STATUS_CFG[step]?.color || S.brand}` : `2px solid ${isComplete ? "transparent" : S.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all .2s",
                            }}>
                              {isComplete && <Ic d={PATHS.check} s={12} c="#fff" />}
                            </div>
                            {i < arr.length - 1 && (
                              <div style={{
                                flex: 1, height: 2, marginLeft: 2, marginRight: 2,
                                background: i < currentIdx ? (STATUS_CFG[steps[i + 1]]?.color || S.brand) : S.border,
                                transition: "background .2s",
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      {["Created", "Processing", "Packed", "Shipped", "Delivered"].map(s => (
                        <span key={s} style={{ fontSize: 9, color: S.ink4, fontWeight: 600, textAlign: "center", width: 52 }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    width: 240, ...card({ padding: "16px 20px" }),
                    borderTop: `3px solid ${(PAY_CFG[selectedOrder.paymentStatus] || {}).color || S.amber}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                      Payment
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <PayChip status={selectedOrder.paymentStatus} />
                      <span style={{ fontSize: 18, fontWeight: 700, color: S.ink }}>{fmtCur(selectedOrder.totalAmount)}</span>
                    </div>
                    {selectedOrder.paymentStatus !== "Paid" && (
                      <Btn ch="Mark as Paid" v="ok" sm onClick={() => markPaid(selectedOrder._id)} />
                    )}
                  </div>
                </div>

                {/* Customer & Address */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={card({ padding: "18px 20px" })}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                      Customer Details
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <InfoField label="Name" value={selectedOrder.patientDetails?.name} />
                      <InfoField label="Phone" value={selectedOrder.patientDetails?.primaryPhone || selectedOrder.patientDetails?.phone} />
                      <InfoField label="Secondary Phone" value={selectedOrder.patientDetails?.secondaryPhone} />
                      <InfoField label="Ordering For" value={
                        selectedOrder.patientDetails?.orderingFor === "myself" ? "Self" :
                        selectedOrder.patientDetails?.orderingFor === "admin" ? "Admin Order" : "Someone Else"
                      } />
                    </div>
                  </div>
                  <div style={card({ padding: "18px 20px" })}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                      Delivery Address
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <InfoField label="Address" value={selectedOrder.addressDetails?.fullAddress} span />
                      <InfoField label="City" value={selectedOrder.addressDetails?.city} />
                      <InfoField label="State" value={selectedOrder.addressDetails?.state} />
                      <InfoField label="Pincode" value={selectedOrder.addressDetails?.pincode} />
                    </div>
                  </div>
                </div>

                {/* Linked Prescription */}
                {selectedOrder.prescription && (
                  <div style={card({ padding: "18px 20px" })}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Ordered Medicines
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: S.brand }}>
                        Rx: {selectedOrder.prescription.rxId} &nbsp;|&nbsp; Dr. {selectedOrder.prescription.doctor}
                      </span>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: S.subtle }}>
                          {["Medicine", "Days", "M", "A", "N", "Daily", "Qty", "Price", "Subtotal"].map(h => (
                            <th key={h} style={{
                              padding: "10px 12px", textAlign: "left", fontSize: 11,
                              fontWeight: 700, color: S.ink4, textTransform: "uppercase",
                              letterSpacing: 0.4, borderBottom: `1px solid ${S.border}`,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                      {selectedOrder.items?.length ? (
    selectedOrder.items.map((m, i) => {
      return (
    <tr key={m.medicineId || i} style={{ background: i % 2 === 0 ? "#fff" : S.bg }}>
    
    {/* Medicine */}
    <td style={medTd}>
      <span style={{ fontWeight: 600 }}>
        {m.name || "—"}
      </span>
    </td>

    {/* Days */}
    <td style={medTd}>{m.duration || "-"}</td>

    {/* M */}
    <td style={medTd}>{m.freq?.m ?? "-"}</td>

    {/* A */}
    <td style={medTd}>{m.freq?.a ?? "-"}</td>

    {/* N */}
    <td style={medTd}>{m.freq?.n ?? "-"}</td>

    {/* Daily */}
    <td style={medTd}>
      {(m.freq?.m || 0) + (m.freq?.a || 0) + (m.freq?.n || 0)}
    </td>

    {/* Qty */}
    <td style={medTd}>{m.qty}</td>

    {/* Price */}
    <td style={medTd}>{fmtCur(m.price)}</td>

    {/* Subtotal */}
    <td style={medTd}>
      <span style={{ fontWeight: 700 }}>
        {fmtCur((m.qty || 0) * (m.price || 0))}
      </span>
    </td>

  </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan="9" style={{ textAlign: "center", padding: 20, color: S.ink4 }}>
        No medicines found
      </td>
    </tr>
  )}
                      </tbody>
                    </table>

                    {/* Billing summary */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 16,
                    }}>
                      {[
                      { l: "Subtotal", v: subtotal },
    { l: "GST", v: selectedOrder.gstAmount || 0 },
  { l: "Discount", v: selectedOrder.discount || 0 },
    { l: "Total", v: selectedOrder.totalAmount, hl: true },
                      ].map(b => (
                        <div key={b.l} style={{
                          background: b.hl ? S.brandLt : S.bg, padding: "12px 16px", borderRadius: S.rSm,
                          border: `1px solid ${b.hl ? S.brand + "30" : S.border}`,
                        }}>
                          <div style={{ fontSize: 11, color: S.ink4, fontWeight: 600, marginBottom: 4 }}>{b.l}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: b.hl ? S.brand : b.neg ? S.red : S.ink }}>
                            {b.neg ? "-" : ""}{fmtCur(b.v)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        )}

        {/* ═══════════════ NEW ORDER MODAL ═══════════════ */}
        {showNewOrder && (
          <Modal
            title="Create New Order"
            sub="Select patient, add medicines, and place the order"
            w={980}
            onClose={() => setShowNewOrder(false)}
            ch={
              <NewOrderForm
                onSave={handleSaveOrder}
                onClose={() => setShowNewOrder(false)}
              />
            }
          />
        )}
      </div>
    );
  };

  /* ── Small Components ──────────────────────────────────────────── */
  const InfoField = ({ label, value, span }) => (
    <div style={{ gridColumn: span ? "span 2" : undefined }}>
      <div style={{ fontSize: 11, color: S.ink4, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: S.ink }}>{value || "—"}</div>
    </div>
  );

  /* ── Styles ──────────────────────────────────────────────────────── */
  const tdS = {
    padding: "12px 16px",
    fontSize: 13,
    borderBottom: `1px solid ${S.border}`,
  };

  const medTd = {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: `1px solid ${S.border}`,
  };

  const actionBtn = {
    width: 32, height: 32, borderRadius: S.rSm,
    background: S.brandLt, border: `1px solid ${S.brand}20`,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all .15s",
  };

  const pageBtn = {
    padding: "6px 12px", borderRadius: 6,
    border: `1px solid ${S.border}`, background: "#fff",
    cursor: "pointer", fontSize: 12, fontWeight: 600,
    fontFamily: S.font, color: S.ink3,
    transition: "all .15s",
  };

  const selectS = {
    padding: "6px 10px", borderRadius: 7,
    border: `1.5px solid ${S.border}`, background: S.surface,
    fontSize: 12, fontWeight: 600, color: S.ink,
    fontFamily: S.font, outline: "none", cursor: "pointer",
    appearance: "auto",
  };

  const dateInput = {
    padding: "7px 10px", borderRadius: 8,
    border: `1.5px solid ${S.border}`, background: S.surface,
    fontSize: 12, fontWeight: 500, color: S.ink,
    fontFamily: S.font, outline: "none", cursor: "pointer",
  };

  export default OrdersView;
