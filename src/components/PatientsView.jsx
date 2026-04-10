import { useState, useEffect, useCallback, useRef } from "react";
import API from "../api";
import { Ic, PATHS, Modal, Btn, Inp, Sel, Toast } from "./Styles";
import { fDate, fCur } from "../data/MasterData";

/* ── TOKENS ───────────────────────────────────────────────────── */
const S = {
  bg: "#F0F4F8", card: "#FFFFFF",
  ink: "#0F172A", ink2: "#334155", muted: "#64748B",
  border: "#E2E8F0",
  brand: "#06549d",
  green: "#059669",  greenBg: "#ECFDF5",
  amber: "#D97706",  amberBg: "#FFFBEB",
  red: "#DC2626",    redBg: "#FEF2F2",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  teal: "#0D9488",   tealBg: "#F0FDFA",
};
const card = (x = {}) => ({
  background: S.card, borderRadius: 12,
  border: `1px solid ${S.border}`,
  boxShadow: "0 1px 4px rgba(15,23,42,.05)", ...x,
});

/* ── AVATAR ────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  ["#06549d","#EFF6FF"], ["#059669","#ECFDF5"], ["#7C3AED","#F5F3FF"],
  ["#0D9488","#F0FDFA"], ["#D97706","#FFFBEB"], ["#DC2626","#FEF2F2"],
];
const avatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

/* ── DEFAULT FORM STATE ──────────────────────────────────────── */
const EMPTY_PATIENT = {
  name: "",
  primaryPhone: "",
  secondaryPhone: "",
  age: "",
  gender: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  condition: "",
  since: "",
  adherence: "",
};


const GENDERS = ["Male", "Female", "Other"];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Chandigarh","Puducherry","Jammu and Kashmir",
  "Ladakh","Andaman and Nicobar Islands","Dadra and Nagar Haveli and Daman and Diu","Lakshadweep",
];
const PER_PAGE = 10;

/* ── Confirm Dialog ────────────────────────────────────────────── */
const Confirm = ({ title, msg, label = "Delete", onYes, onNo }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 2000,
    background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <div className="sc" style={{
      background: S.card, borderRadius: 16, width: 400,
      boxShadow: "0 20px 60px rgba(15,23,42,0.15)", overflow: "hidden",
    }}>
      <div style={{ padding: "28px 28px 16px" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 16,
          background: S.redBg, border: `1px solid #FECACA`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Ic d={PATHS.alert} s={20} c={S.red} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: S.ink, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.6 }}>{msg}</div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "12px 28px 24px", justifyContent: "flex-end" }}>
        <Btn ch="Cancel" v="ghost" onClick={onNo} />
        <Btn ch={label} v="danger" onClick={onYes} icon={PATHS.alert} />
      </div>
    </div>
  </div>
);

/* ── Helper: build query string from params ── */
const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  return qs.toString();
};

/* ── Helper: enrich patients with order data ── */
const enrichWithOrders = (patients, orders) => {
  const orderMap = {};

  orders.forEach(o => {
    const key = o.patient;
    if (!orderMap[key]) orderMap[key] = [];
    orderMap[key].push(o);
  });

  return patients.map(p => {
    const pOrders = orderMap[p._id] || orderMap[p.name] || [];
    const sorted = [...pOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalSpend = pOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const outstanding = pOrders.filter(o => o.paymentStatus !== "Paid").reduce((s, o) => s + (o.totalAmount || 0), 0);
    const lastOrder = sorted[0]?.createdAt;
    const daysSinceLast = lastOrder ? Math.floor((new Date() - new Date(lastOrder)) / 86400000) : null;
    const isActive = p.isActive ?? true;
    const rxCount = pOrders.filter(o => o.prescription?.rxId).length;
    const doctors = [...new Set(pOrders.map(o => o.prescription?.doctor).filter(Boolean))];
    return { ...p, orders: sorted, totalSpend, outstanding, lastOrder, daysSinceLast, isActive, rxCount, doctors };
  });
};

/* ── MAIN COMPONENT ────────────────────────────────────────────── */
const PatientsView = () => {
  const [patients, setPatients] = useState([]);       // current page enriched
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, newThisMonth: 0, growthPct: 0, withPrescriptions: 0, gender: { male: 0, female: 0, other: 0 } });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(""); // raw input (immediate)
  const [search, setSearch] = useState("");            // debounced value
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [editPat, setEditPat] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchIdRef = useRef(0); // guard stale responses

  const t_ = useCallback((m, t = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 3000); }, []);

  /* ── Debounce search input by 400ms ── */
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ── Reset to page 1 when filters change ── */
  useEffect(() => { setCurrentPage(1); }, [search, filter]);

  /* ── Fetch stats once on mount ── */
  useEffect(() => {
    API.get("/patient-details/stats")
      .then(res => setStats(res.data.data || stats))
      .catch(() => {});
  }, []);

  /* ── Server-side paginated fetch on page / filter / search change ── */
  useEffect(() => {
    fetchPage();
  }, [currentPage, search, filter]);


  useEffect(() => {
  const editHandler = (e) => {
    const p = e.detail;

    setEditPat({
      ...p,
      age: p.age || "",
      since: p.since ? p.since.slice(0, 10) : "",
      adherence: p.adherence || "",
      addressId: p.addressId,
      address: p.address || "",
      city: p.city || "",
      state: p.state || "",
      pincode: p.pincode || "",
    });
  };

  const inactiveHandler = async (e) => {
    const p = e.detail;

    try {
      await API.put(`/patient-details/${p._id}`, {
        isActive: false, // ✅ IMPORTANT
      });

      t_(`${p.name} marked as inactive`);
      fetchPage();
      setSelected(null);
    } catch (err) {
      t_("Failed to update status", "err");
    }
  };

  window.addEventListener("editPatient", editHandler);
  window.addEventListener("inactivePatient", inactiveHandler);

  return () => {
    window.removeEventListener("editPatient", editHandler);
    window.removeEventListener("inactivePatient", inactiveHandler);
  };
}, []);

const fetchPage = async () => {
  setLoading(true);
  const id = ++fetchIdRef.current;

  try {
    const pRes = await API.get(`/patient-details/all`);
    if (id !== fetchIdRef.current) return;

    const raw = pRes.data.data || [];

    // ✅ format patients directly (no extra API)
const formatted = raw
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // ⭐ ADD THIS
  .map(p => {
  const orders = p.orders || [];

  // ✅ CALCULATE TOTAL SPEND
  const totalSpend = orders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0
  );

  // ✅ ACTIVE STATUS
  const latestOrder = [...orders].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  const daysSinceLast = latestOrder
    ? Math.floor((new Date() - new Date(latestOrder.createdAt)) / 86400000)
    : null;

  const isActive = p.isActive ?? true;

  return {
    ...p,

address: p.address?.fullAddress || latestOrder?.addressDetails?.fullAddress || "--",
city: p.address?.city || latestOrder?.addressDetails?.city || "--",
state: p.address?.state || latestOrder?.addressDetails?.state || "--",
pincode: p.address?.pincode || latestOrder?.addressDetails?.pincode || "--",

    secondaryPhone:
      p.secondaryPhone ||
      latestOrder?.patientDetails?.secondaryPhone,

    // ✅ ADD THESE
    orders,
    totalSpend,
    isActive,
  };
});

    setPatients(formatted);

    // ✅ since no backend pagination
    setTotalPatients(formatted.length);
    setTotalPages(1);

  } catch (err) {
    if (id !== fetchIdRef.current) return;
    console.error(err);
    t_("Failed to load patients", "err");
  } finally {
    if (id === fetchIdRef.current) setLoading(false);
  }
};

const save = async () => {
  if (!editPat.name?.trim()) return t_("Patient name is required", "err");

  if (!editPat.primaryPhone || !/^[0-9]{10}$/.test(editPat.primaryPhone)) {
    return t_("Valid primary phone required", "err");
  }

  try {
    let patientId;

    // =========================
    // ✅ CREATE / UPDATE PATIENT
    // =========================
    if (editPat._id) {
      await API.put(`/patient-details/${editPat._id}`, {
        name: editPat.name,
        primaryPhone: editPat.primaryPhone,
        secondaryPhone: editPat.secondaryPhone,
        age: editPat.age,
        gender: editPat.gender,
        email: editPat.email,
      });

      patientId = editPat._id;

    } else {
     const res = await API.post("/patient-details/create", {
  name: editPat.name,
  primaryPhone: editPat.primaryPhone,
  secondaryPhone: editPat.secondaryPhone,
  age: editPat.age,
  gender: editPat.gender,
  email: editPat.email,
  userId: "9876543210",
});

// ✅ ADD THIS CHECK
if (!res.data.success) {
  return t_(res.data.message || "Patient creation failed", "err");
}

      patientId = res.data?.data?._id;
    }

    // =========================
    // ✅ ADDRESS SAVE / UPDATE
    // =========================
    if (editPat.address || editPat.city || editPat.state || editPat.pincode) {

     if (editPat.addressId) {
  await API.put(`/address/update/${editPat.addressId}`, {
    fullAddress: editPat.address,
    city: editPat.city,
    state: editPat.state,
    pincode: editPat.pincode,
  });

  // ✅ ADD THIS (VERY IMPORTANT)
  if (patientId) {
    await API.put(`/patient-details/${patientId}`, {
      addressId: editPat.addressId,
    });
  }
} else {
        // CREATE
        const addressRes = await API.post("/address/save", {
          userId: "9876543210",
          fullAddress: editPat.address,
          city: editPat.city,
          state: editPat.state,
          pincode: editPat.pincode,
          isDefault: false,
        });

        const addressId = addressRes.data?.data?._id;

        // LINK
        if (patientId && addressId) {
          await API.put(`/patient-details/${patientId}`, {
            addressId,
          });
        }
      }
    }

    // ✅ SUCCESS MESSAGE (FINAL)
    t_(`${editPat.name} ${editPat._id ? "updated" : "added"}`);

    setEditPat(null);
    await fetchPage();

  } catch (err) {
    console.error(err);
    t_(err.response?.data?.message || "Save failed", "err");
  }
};

  /* ── Delete ── */
  const del = (p) => setConfirm({
    title: "Delete Patient",
    msg: `Permanently delete "${p.name}" (${p.patientId})? This cannot be undone.`,
    onYes: async () => {
      setConfirm(null);
      try {
      await API.delete(`/patient-details/${p._id}`, {
  headers: {
    userRole: "admin"
  }
});
        t_(`${p.name} deleted`, "warn");
        fetchPage(); 
      } catch (err) {
        t_(err.response?.data?.message || "Delete failed", "err");
      }
    },
  });

  /* ── Field helper ── */
  const f = (key, val) => setEditPat(p => ({ ...p, [key]: val }));

  const filteredPatients = patients.filter(p => {
if (filter === "Male") return p.gender === "Male";
if (filter === "Female") return p.gender === "Female";
if (filter === "Active") return p.isActive;
if (filter === "Inactive") return !p.isActive;
if (filter === "WithRx") return p.orders && p.orders.length > 0;
return true;
});

  /* ── RENDER ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: "'DM Sans',sans-serif" }}>

      {toast && <Toast msg={toast.m} type={toast.t} onClose={() => setToast(null)} />}
      {confirm && <Confirm {...confirm} onNo={() => setConfirm(null)} />}

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: S.ink, letterSpacing: -0.4 }}>Patient Management</h1>
          <p style={{ fontSize: 13, color: S.muted, marginTop: 3 }}>
            Register, manage, and track all patient records
          </p>
        </div>
        <Btn ch="Add Patient" icon={PATHS.plus} onClick={() => setEditPat({ ...EMPTY_PATIENT })} />
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{ ...card(), display: "grid", gridTemplateColumns: "repeat(5,1fr)", overflow: "hidden" }}>
        {[
          { label: "Total Patients",    value: stats.total,              color: S.brand,  icon: PATHS.users,   sub: "registered" },
          { label: "New This Month",    value: stats.newThisMonth,       color: S.green,  icon: PATHS.plus,    sub: `${stats.growthPct >= 0 ? "+" : ""}${stats.growthPct}% growth` },
          { label: "With Prescriptions",value: stats.withPrescriptions,  color: S.purple, icon: PATHS.rx,      sub: "have Rx records" },
          { label: "Male",              value: stats.gender?.male || 0,  color: S.teal,   icon: PATHS.users,   sub: "patients" },
          { label: "Female",            value: stats.gender?.female || 0,color: S.amber,  icon: PATHS.users,   sub: "patients" },
        ].map((m, i, arr) => (
          <div key={m.label}
          onClick={() => {
  if (m.label === "Male") setFilter("Male");
  else if (m.label === "Female") setFilter("Female");
  else if (m.label === "With Prescriptions") setFilter("WithRx");
  else setFilter("All");
}}
            style={{ padding: "18px 22px", borderRight: i < arr.length - 1 ? `1px solid ${S.border}` : "none", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ background: m.color + "15", borderRadius: 7, padding: 6, display: "flex" }}>
                <Ic d={m.icon} s={13} c={m.color} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: S.ink, letterSpacing: -0.8, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 5 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS + SEARCH ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 4, background: "#fff", border: `1px solid ${S.border}`, borderRadius: 9, padding: 4 }}>
          {["All", "Active", "Inactive", "Male", "Female"].map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} style={{
              padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
              background: filter === tab ? S.brand : "transparent",
              color: filter === tab ? "#fff" : S.muted, transition: "all .15s",
            }}>{tab}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${S.border}`, borderRadius: 9, padding: "8px 14px", width: 300 }}>
          <Ic d={PATHS.users} s={14} c={S.muted} />
          <input
            placeholder="Search name, phone, ID, email, city..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, color: S.ink, fontFamily: "'DM Sans',sans-serif", width: "100%", background: "transparent" }}
          />
        </div>
      </div>

      {/* ── PATIENT TABLE ── */}
      <div style={card({ overflow: "hidden" })}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: S.muted }}>Loading patients...</div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: `1px solid ${S.border}` }}>
              <Ic d={PATHS.users} s={24} c={S.muted} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: S.ink }}>No patients found</p>
            <p style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>Try adjusting your search or add a new patient</p>
            <div style={{ marginTop: 16 }}>
              <Btn ch="Add Patient" icon={PATHS.plus} onClick={() => setEditPat({ ...EMPTY_PATIENT })} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: S.bg, borderBottom: `2px solid ${S.border}` }}>
                    {["Patient ID", "Patient", "Contact", "Gender / Age", "City", "Condition", "Orders", "Total Spend", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  
                 {filteredPatients.map(p => {
      
                    const [fg, bg] = avatarColor(p.name || "U");
                    return (
                      <tr key={p._id}
                        style={{ borderBottom: `1px solid ${S.border}`, transition: "background .1s", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* ID */}
                        <td style={{ padding: "12px 14px" }}>
                          <span    onClick={() => setSelected(p)} style={{ fontWeight: 700, color: S.brand, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{p.patientId}</span>
                        </td>

                        {/* PATIENT */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: fg, flexShrink: 0 }}>
                              {(p.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: S.ink }}>{p.name}</div>
                              {p.email && <div style={{ fontSize: 11, color: S.muted, marginTop: 1 }}>{p.email}</div>}
                            </div>
                          </div>
                        </td>

                        {/* CONTACT */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 500, color: S.ink2 }}>{p.primaryPhone}</div>
                          {p.secondaryPhone && <div style={{ fontSize: 11, color: S.red, marginTop: 1 }}>EC: {p.secondaryPhone}</div>}
                        </td>

                        {/* GENDER / AGE */}
                        <td style={{ padding: "12px 14px", color: S.ink2 }}>
                          {p.gender || "--"}{p.age ? `, ${p.age}y` : ""}
                        </td>

                        {/* CITY */}
                        <td style={{ padding: "12px 14px", color: S.muted }}>{p.city || "--"}</td>

                        {/* CONDITION */}
                        <td style={{ padding: "12px 14px" }}>
                          {p.condition ? (
                            <span style={{ fontSize: 11, fontWeight: 600, background: S.purpleBg, color: S.purple, padding: "3px 8px", borderRadius: 99 }}>{p.condition}</span>
                          ) : <span style={{ color: S.muted }}>--</span>}
                        </td>

                        {/* ORDERS */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 700, color: S.ink }}>{p.orders?.length || 0}</div>
                        </td>

                        {/* TOTAL SPEND */}
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: S.green }}>{fCur(p.totalSpend || 0)}</td>

                        {/* STATUS */}
                        <td style={{ padding: "12px 14px" }}>
                         <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 99,
                          background: p.isActive ? S.greenBg : S.redBg,
                          color: p.isActive ? S.green : S.red,
                        }}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                        </td>

                        {/* ACTIONS */}
                     <td style={{ padding: "12px 14px" }}>
  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>

    {/* VIEW BUTTON */}
    <button
      onClick={() => setSelected(p)}
      style={ghostBtn}
      title="View Details"
    >
      <Ic d={PATHS.chart} s={14} c={S.brand} />
    </button>

    {/* EDIT BUTTON */}
    <button
      onClick={() =>
        setEditPat({
          ...p,
          age: p.age || "",
          since: p.since ? p.since.slice(0, 10) : "",
          adherence: p.adherence || "",
          addressId: p.addressId,
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          pincode: p.pincode || "",
        })
      }
      style={ghostBtn}
      title="Edit Patient"
    >
      <Ic d={PATHS.edit} s={14} c={S.amber} />
    </button>

    {/* OPTIONAL DELETE (REMOVE IF NOT NEEDED) */}
    {/* 
    <button onClick={() => del(p)} style={ghostBtn} title="Delete">
      <Ic d={PATHS.alert} s={14} c={S.red} />
    </button>
    */}

  </div>
</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${S.border}` }}>
                <span style={{ fontSize: 13, color: S.muted }}>
                  Showing {(currentPage - 1) * PER_PAGE + 1}--{Math.min(currentPage * PER_PAGE, totalPatients)} of {totalPatients} patients
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={pageBtn(false)}>Prev</button>
                  {[...Array(Math.min(totalPages, 10))].map((_, i) => {
                    // Show pages around current page when there are many pages
                    let pageNum;
                    if (totalPages <= 10) {
                      pageNum = i + 1;
                    } else {
                      // Show window of pages around current
                      let start = Math.max(1, currentPage - 4);
                      const end = Math.min(totalPages, start + 9);
                      start = Math.max(1, end - 9);
                      pageNum = start + i;
                    }
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)} style={pageBtn(currentPage === pageNum)}>{pageNum}</button>
                    );
                  })}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={pageBtn(false)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {editPat && (
        <Modal
          title={editPat._id ? "Edit Patient" : "Add New Patient"}
          sub={editPat._id ? `${editPat.patientId} - ${editPat.name}` : "Fill in patient details to register"}
          w={720}
          onClose={() => setEditPat(null)}
          ch={
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Section: Basic Info */}
              <SectionLabel label="Personal Information" icon={PATHS.users} color={S.brand} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Full Name *" value={editPat.name} onChange={v => f("name", v)} placeholder="Enter full name" />
              <Field
  label="Primary Phone *"
  value={editPat.primaryPhone}
  onChange={v => f("primaryPhone", v)}
  placeholder="9876543210"
/>

<Field
  label="Secondary Phone"
  value={editPat.secondaryPhone}
  onChange={v => f("secondaryPhone", v)}
  placeholder="Optional"
/>
                <Field label="Email" value={editPat.email} onChange={v => f("email", v)} placeholder="patient@email.com" type="email" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Age" value={editPat.age} onChange={v => f("age", v)} placeholder="Age" type="number" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.ink2, marginBottom: 6 }}>Gender</div>
                    <Sel value={editPat.gender} onChange={e => f("gender", e.target.value)}>
                      <option value="">Select</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </Sel>
                  </div>
                </div>
              </div>

              {/* Section: Address */}
              <SectionLabel label="Address Details" icon={PATHS.truck} color={S.teal} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <Field label="Full Address" value={editPat.address} onChange={v => f("address", v)} placeholder="House/Street/Locality" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <Field label="City" value={editPat.city} onChange={v => f("city", v)} placeholder="City" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: S.ink2, marginBottom: 6 }}>State</div>
                    <Sel value={editPat.state} onChange={e => f("state", e.target.value)}>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Sel>
                  </div>
                  <Field label="Pincode" value={editPat.pincode} onChange={v => f("pincode", v)} placeholder="560001" maxLength={6} />
                </div>
              </div>

              {/* Section: Medical */}
              <SectionLabel label="Medical Information" icon={PATHS.rx} color={S.purple} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Condition / Diagnosis" value={editPat.condition} onChange={v => f("condition", v)} placeholder="e.g. Diabetes, Hypertension" />
                <Field label="Patient Since" value={editPat.since} onChange={v => f("since", v)} type="date" />
                <Field label="Adherence Score (%)" value={editPat.adherence} onChange={v => f("adherence", v)} placeholder="0-100" type="number" />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
                <Btn ch="Cancel" v="ghost" onClick={() => setEditPat(null)} />
                <Btn ch={editPat._id ? "Update Patient" : "Register Patient"} onClick={save} icon={PATHS.check} />
              </div>
            </div>
          }
        />
      )}

      {/* ── PATIENT DETAIL MODAL ── */}
      {selected && (
        <Modal
          title={selected.name}
          sub={`${selected.patientId} | ${selected.phone} | ${selected.orders?.length || 0} orders`}
          w={1020}
          onClose={() => setSelected(null)}
          ch={<PatientProfile patient={selected} onClose={() => setSelected(null)} />}
        />
      )}
    </div>
  );
};

/* ── SECTION LABEL ────────────────────────────────────────────── */
const SectionLabel = ({ label, icon, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4, borderBottom: `1px solid ${S.border}` }}>
    <div style={{ background: color + "15", borderRadius: 6, padding: 5, display: "flex" }}>
      <Ic d={icon} s={14} c={color} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: S.ink, letterSpacing: -0.2 }}>{label}</span>
  </div>
);

/* ── FIELD ────────────────────────────────────────────────────── */
const Field = ({ label, value, onChange, placeholder, type = "text", maxLength }) => (
  <div>
    <div style={{ fontSize: 12, fontWeight: 600, color: S.ink2, marginBottom: 6 }}>{label}</div>
    <Inp
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      sx={maxLength ? { maxLength } : {}}
    />
  </div>
);

/* ── PATIENT PROFILE MODAL ─────────────────────────────────────── */
const PatientProfile = ({ patient: p, onClose }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [fg, bg] = avatarColor(p.name || "U");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* PROFILE HEADER */}
      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>

        {/* LEFT SIDE (NAME + DETAILS) */}
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: S.ink }}>{p.name}</h3>

          <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
            <Detail icon={PATHS.users} text={`${p.patientId} | ${p.gender || "--"}, ${p.age ? p.age + "y" : "--"}`} />
            <Detail icon={PATHS.bell} text={p.primaryPhone} />
            {p.email && <Detail icon={PATHS.rx} text={p.email} />}
            {p.city && <Detail icon={PATHS.truck} text={[p.city, p.state].filter(Boolean).join(", ")} />}
          </div>
        </div>

        {/* RIGHT SIDE BUTTONS */}
        <div style={{ display: "flex", gap: 10 }}>

          {/* EDIT BUTTON */}
          <button
            onClick={() => {
  onClose(); // ✅ CLOSE VIEW MODAL FIRST
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("editPatient", { detail: p }));
  }, 200); // small delay for smooth UX
}}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${S.border}`,
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600
            }}
          >
            Edit
          </button>

          {/* INACTIVE BUTTON */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("inactivePatient", { detail: p }))}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${S.red}`,
              background: S.redBg,
              color: S.red,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600
            }}
          >
            Inactive
          </button>

        </div>
      </div>

      {/* STAT BOXES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatBox icon={PATHS.orders}  color={S.brand}  label="Total Orders"    value={p.orders?.length || 0} />
        <StatBox icon={PATHS.dollar}  color={S.green}  label="Total Spend"     value={fCur(p.totalSpend || 0)} />
        <StatBox icon={PATHS.clock}   color={S.red}    label="Outstanding"     value={p.outstanding > 0 ? fCur(p.outstanding) : "Cleared"} />
        <StatBox icon={PATHS.rx}      color={S.purple} label="Prescriptions"   value={p.rxCount || 0} />
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 4, background: S.bg, borderRadius: 9, padding: 4, width: "fit-content" }}>
        {[["details", "Patient Details"], ["orders", "Order History"], ["prescriptions", "Prescription History"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: "7px 20px", borderRadius: 7, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
            background: activeTab === key ? S.card : "transparent",
            color: activeTab === key ? S.ink : S.muted,
            boxShadow: activeTab === key ? "0 1px 3px rgba(15,23,42,.08)" : "none",
            transition: "all .15s",
          }}>{label}</button>
        ))}
      </div>

      {/* PATIENT DETAILS TAB */}
      {activeTab === "details" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <DetailCard label="Full Name" value={p.name} />
          <DetailCard label="Patient ID" value={p.patientId} />
          <DetailCard label="Phone" value={p.primaryPhone} />
          <DetailCard label="Email" value={p.email || "--"} />
          <DetailCard label="Gender" value={p.gender || "--"} />
          <DetailCard label="Age" value={p.age ? `${p.age} years` : "--"} />
          <DetailCard label="Address" value={p.address || "--"} />
          <DetailCard label="City" value={p.city || "--"} />
          <DetailCard label="State" value={p.state || "--"} />
          <DetailCard label="Pincode" value={p.pincode || "--"} />
          <DetailCard label="Condition" value={p.condition || "--"} />
          <DetailCard label="Emergency Contact" value={p.secondaryPhone || "--"} />
          <DetailCard label="Patient Since" value={p.since ? fDate(p.since) : "--"} />
          <DetailCard label="Adherence" value={p.adherence ? `${p.adherence}%` : "--"} />
        </div>
      )}

      {/* ORDER HISTORY */}
      {activeTab === "orders" && (
        <div style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
          {(!p.orders || p.orders.length === 0) ? (
            <div style={{ padding: 36, textAlign: "center", color: S.muted }}>No orders found for this patient</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: S.brand }}>
                  {["Order ID", "Date", "Doctor", "Medicines", "Amount", "Order Status", "Payment"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.orders.map((o, i) => (
                  <tr key={o._id} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? "#fff" : S.bg }}>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: S.brand, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{o.orderId}</td>
                    <td style={{ padding: "11px 14px", color: S.muted, whiteSpace: "nowrap" }}>{fDate(o.createdAt)}</td>
                    <td style={{ padding: "11px 14px", color: S.ink2 }}>{o.prescription?.doctor || "--"}</td>
                    <td style={{ padding: "11px 14px", color: S.ink2 }}>{o.prescription?.meds?.length || 0} items</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: S.ink }}>{fCur(o.totalAmount)}</td>
                    <td style={{ padding: "11px 14px" }}><StatusChip label={o.orderStatus} /></td>
                    <td style={{ padding: "11px 14px" }}><StatusChip label={o.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* PRESCRIPTION HISTORY */}
      {activeTab === "prescriptions" && (
        <div style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: "hidden" }}>
          {p.orders?.filter(o => o.prescription?.rxId).length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: S.muted }}>No prescriptions found</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: S.brand }}>
                  {["Rx ID", "Doctor", "Start", "Expiry", "Status", "Medicines", "Total"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.orders.filter(o => o.prescription?.rxId).map((o, i) => {
                  const expiry = o.prescription.expiry;
                  const expired = expiry && new Date(expiry) <= new Date();
                  const expiring = expiry && !expired && Math.ceil((new Date(expiry) - new Date()) / 86400000) <= 7;
                  const expiryColor = expired ? S.red : expiring ? S.amber : S.green;
                  const expiryBg    = expired ? S.redBg : expiring ? S.amberBg : S.greenBg;
                  return (
                    <tr key={o._id} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? "#fff" : S.bg }}>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: S.purple, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{o.prescription.rxId}</td>
                      <td style={{ padding: "11px 14px", color: S.ink2 }}>{o.prescription.doctor || "--"}</td>
                      <td style={{ padding: "11px 14px", color: S.muted, whiteSpace: "nowrap" }}>{fDate(o.prescription.start)}</td>
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: expiryColor, background: expiryBg, padding: "3px 8px", borderRadius: 99 }}>
                          {expiry ? fDate(expiry) : "--"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: expiryColor }}>
                          {expired ? "Expired" : expiring ? `Expires in ${Math.ceil((new Date(expiry) - new Date()) / 86400000)}d` : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(o.prescription.meds || []).slice(0, 3).map((m, mi) => (
                            <span key={mi} style={{ fontSize: 10, background: S.bg, border: `1px solid ${S.border}`, padding: "2px 7px", borderRadius: 99, color: S.ink2, fontWeight: 600 }}>
                              {m.medicine?.name || "--"}
                            </span>
                          ))}
                          {(o.prescription.meds?.length || 0) > 3 && (
                            <span style={{ fontSize: 10, color: S.muted }}>+{o.prescription.meds.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: S.ink }}>{fCur(o.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

/* ── SMALL COMPONENTS ──────────────────────────────────────────── */
const Detail = ({ icon, text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    <Ic d={icon} s={12} c={S.muted} />
    <span style={{ fontSize: 12, color: S.muted }}>{text}</span>
  </div>
);

const DetailCard = ({ label, value }) => (
  <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 16px" }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: S.ink }}>{value}</div>
  </div>
);

const StatBox = ({ icon, color, label, value }) => (
  <div style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <div style={{ background: color + "15", borderRadius: 6, padding: 5, display: "flex" }}>
        <Ic d={icon} s={13} c={color} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color: S.ink }}>{value}</div>
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
const StatusChip = ({ label }) => {
  const s = STATUS_COLORS[label] || { bg: "#F1F5F9", color: "#64748B" };
  return <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>{label}</span>;
};

/* ── STYLES ────────────────────────────────────────────────────── */
const ghostBtn = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 30, border: `1px solid ${S.border}`, borderRadius: 7,
  background: "#fff", cursor: "pointer",
};
const pageBtn = (active) => ({
  padding: "6px 11px", borderRadius: 6, border: `1px solid ${S.border}`,
  background: active ? S.brand : "#fff", color: active ? "#fff" : S.ink2,
  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
});

export default PatientsView;
