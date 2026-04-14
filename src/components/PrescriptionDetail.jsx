import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api";

import {
  FiArrowLeft,
  FiTruck,
  FiPackage,
  FiCheckCircle,
  FiFileText,
} from "react-icons/fi";

/* ───────── DESIGN TOKENS ───────── */
const S = {
  bg: "#F1F5F9",
  card: "#FFFFFF",
  dark: "#0F172A",
  border: "#E2E8F0",
  green: "#059669",
  blue: "#2563EB",
};

/* ───────── TRANSFORM ───────── */
const transformOrder = (o) => {
  const items = o.items || [];

  return {
    id: o._id,
    pName: o.patientDetails?.name,
    doctor: o.prescription?.doctor,
    phone: o.patientDetails?.phone,
    start: o.prescription?.start,
    expiry: o.prescription?.expiry,
    orderId: o.orderId,
    payStatus: o.paymentStatus,
    ordStatus: o.orderStatus,

    subtotal: items.reduce((s, m) => s + (m.subtotal || 0), 0),
    gst: o.prescription?.gst || 0,
    discount: o.prescription?.discount || 0,
    total: o.totalAmount,

    meds: items,
  };
};

/* ───────── MAIN ───────── */
export default function PrescriptionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [rx, setRx] = useState(null);

  useEffect(() => {
    API.get(`/orders/${id}`).then((res) =>
      setRx(transformOrder(res.data.data))
    );
  }, [id]);

  if (!rx) return <div style={{ padding: 30 }}>Loading...</div>;

  const steps = ["Created", "Processing", "Packed", "Shipped", "Delivered"];
  const activeStep = steps.indexOf(rx.ordStatus);


  const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString() : "—";

const getDaysLeft = (expiry) => {
  if (!expiry) return "—";
  return Math.ceil((new Date(expiry) - new Date()) / 86400000);
};


  return (
    <div style={styles.container}>

      {/* BACK */}
      <button style={styles.back} onClick={() => nav(-1)}>
        <FiArrowLeft /> Back
      </button>

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h2>{rx.pName}</h2>
          <p>{rx.phone} • Dr. {rx.doctor}</p>
        </div>

        <div style={styles.statusWrap}>
          <Status label={rx.ordStatus} />
          <Status label={rx.payStatus} green />
        </div>
      </div>

      <div style={styles.infoGrid}>
  <InfoCard label="Order ID" value={rx.orderId} />
  <InfoCard label="Start Date" value={formatDate(rx.start)} />
  <InfoCard label="Expiry" value={formatDate(rx.expiry)} highlight />
  <InfoCard label="Days Left" value={`${getDaysLeft(rx.expiry)} days`} />
</div>

      {/* TRACKING */}
      <div style={styles.card}>
        <h3><FiTruck /> Order Tracking</h3>

      <div style={styles.timeline}>
  <div style={{
    ...styles.timelineLine,
    background: "#E2E8F0"
  }} />

  {/* ACTIVE PROGRESS LINE */}
  <div style={{
    ...styles.timelineLine,
    background: S.blue,
    width: `${(activeStep / (steps.length - 1)) * 100}%`,
    transition: "0.4s"
  }} />

  {steps.map((s, i) => {
    const isActive = i === activeStep;
    const isCompleted = i < activeStep;

    return (
      <div key={i} style={styles.step}>
        
        <div style={{
          ...styles.circle,
          background: isCompleted
            ? "#22C55E"
            : isActive
            ? S.blue
            : "#E2E8F0",
          color: "#fff",
          boxShadow: isActive
            ? "0 0 0 6px rgba(37,99,235,0.15)"
            : "none",
          transform: isActive ? "scale(1.1)" : "scale(1)",
          transition: "0.3s"
        }}>
          {i === steps.length - 1 ? <FiCheckCircle /> : <FiPackage />}
        </div>

        <span style={{
          fontWeight: isActive ? 600 : 400,
          color: isActive ? S.blue : "#64748B"
        }}>
          {s}
        </span>

        {isActive && (
          <div style={styles.currentTag}>CURRENT</div>
        )}
      </div>
    );
  })}
</div>
      </div>

      

      {/* MEDICINES */}
      <div style={styles.card}>
        <div style={styles.medTop}>
  <div style={styles.medTitle}>
    <FiFileText size={16} />
    <span>Prescribed Medicines</span>
  </div>

  <span style={styles.medCount}>
    {rx.meds.length} items
  </span>
</div>

      <div style={styles.medHeader}>
  <span>Medicine</span>
  <span>Duration</span>
  <span>Morning</span>
  <span>Afternoon</span>
  <span>Night</span>
  <span>Daily</span>
  <span>Qty</span>
  <span>Unit Price</span>
  <span>Subtotal</span>
</div>

        {rx.meds.map((m, i) => {
          const daily =
            (m.freq?.m || 0) +
            (m.freq?.a || 0) +
            (m.freq?.n || 0);

          return (
           <div key={i} style={styles.medRow}>

  {/* MEDICINE */}
  <div style={styles.flex}>
    <div style={styles.medIcon}>💊</div>
    <span
  onClick={() =>
    nav("/inventory", {
      state: {
        medicineName: m.name,
        scrollTo: "table",
      },
    })
  }
  style={{
    cursor: "pointer",
    color: "#2563EB",
    fontWeight: 600,
  }}
>
  {m.name}
</span>
  </div>

<span style={{ textAlign: "center", fontWeight: 600 }}>
        {m.dur ? `${m.dur}d` : "—"}</span>

  <Pill value={m.freq?.m} color="#F59E0B" />
  <Pill value={m.freq?.a} color="#3B82F6" />
  <Pill value={m.freq?.n} color="#8B5CF6" />

  <span style={{ textAlign: "center", fontWeight: 600 }}>{daily}</span>
  <span style={{ textAlign: "center", fontWeight: 600 }}>
  {m.qty}
</span>
  <span style={{ textAlign: "center", fontWeight: 600 }}>₹{m.price}</span>
  <span style={{ color: S.green, fontWeight: 600 }}>
    ₹{m.sub || 0}
  </span>

</div>
          );
        })}
      </div>

      {/* BILLING */}
    <div style={styles.billingCard}>

  <h3 style={styles.billingTitle}>Billing Summary</h3>

  <div style={styles.billingGrid}>

    <BillItem title="Subtotal" value={rx.subtotal} />

    <BillItem
      title="GST (18%)"
      value={rx.gst}
      color="#D97706"
    />

  <BillItem
  title="Discount"
  value={rx.discount}
  color="#059669"
/>

    <div style={styles.totalBox}>
      <p>Grand Total</p>
      <h1>₹{rx.total}</h1>
    </div>

  </div>

  {/* OPTIONAL PAYMENT INFO */}
  <div style={styles.paymentInfo}>
    <span>Status: <b>{rx.payStatus}</b></span>
  </div>

</div>
    </div>
  );
}

/* ───────── SMALL COMPONENTS ───────── */

const Status = ({ label, green }) => (
  <span style={{
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    background: green ? "#6ed090" : "#bfd1ea",
    color: green ? "#fff" : "#334155"
  }}>
    {label}
  </span>
);

const InfoCard = ({ label, value, highlight }) => (
  <div style={{
    ...styles.infoCard,
    border: highlight ? "1px solid #F59E0B" : "1px solid #E2E8F0"
  }}>
    <p style={{ fontSize: 12, color: "#64748B" }}>{label}</p>
    <h3 style={{
      marginTop: 4,
      color: highlight ? "#F59E0B" : "#0F172A"
    }}>
      {value}
    </h3>
  </div>
);


const BillItem = ({ title, value, color, isDiscount }) => (
  <div style={styles.billItem}>
    <p>{title}</p>
    <h3 style={{ color: color || "#0F172A" }}>
      {isDiscount ? "- " : ""}₹{value}
    </h3>
  </div>
);

const Pill = ({ value = 0, color }) => {
  const active = value > 0;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 32,
      height: 32,
      borderRadius: "50%",
      fontWeight: 700,
      fontSize: 13,

      background: active ? `${color}20` : "#F1F5F9",
      color: active ? color : "#94A3B8",

      border: active ? `1px solid ${color}40` : "1px solid #E2E8F0",
    }}>
      {value || 0}
    </span>
  );
};

const Bill = ({ title, value, highlight, green, orange }) => (
  <div style={{
    ...styles.bill,
    background: highlight ? "#DBEAFE" : "#F8FAFC"
  }}>
    <p>{title}</p>
    <h2 style={{
      color: green ? "#059669" : orange ? "#D97706" : "#0F172A"
    }}>
      ₹{value}
    </h2>
  </div>
);

/* ───────── STYLES ───────── */

const styles = {
  container: {
    padding: "30px",
    background: S.bg,
    minHeight: "100vh",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  back: {
    marginBottom: 20,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },

  header: {
    background: S.dark,
    color: "#fff",
    padding: 20,
    borderRadius: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusWrap: {
    display: "flex",
    gap: 10,
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },

  timeline: {
    display: "flex",
    justifyContent: "space-between",
    position: "relative",
    marginTop: 20,
  },

  timelineLine: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    height: 2,
    background: "#E2E8F0",
  },

  step: {
    textAlign: "center",
    flex: 1,
  },

  circle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 6px",
  },

medHeader: {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 0.6fr 0.6fr 0.6fr 0.8fr 0.8fr 1fr 1fr",
  gap: "10px",   // ✅ ADD THIS
  fontSize: 11,
  color: "#64748B",
  marginBottom: 10,
  fontWeight: "700",
  textTransform: "uppercase",
},

medRow: {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 0.6fr 0.6fr 0.6fr 0.8fr 0.8fr 1fr 1fr",
  gap: "10px",
  alignItems: "center",
  padding: "14px",
  borderRadius: 12,
  marginBottom: 12,
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",   // ✅ ADD THIS
},

  flex: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  medIcon: {
  width: 36,
  height: 36,
  background: "#EFF6FF",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
},

  billing: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
    gap: 16,
    marginTop: 20,
  },

  bill: {
    padding: 18,
    borderRadius: 12,
    textAlign: "center",
  },
  medTop: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 15,
},

medTitle: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 700,
  fontSize: 14,
},

medCount: {
  fontSize: 12,
  color: "#64748B",
},
currentTag: {
  marginTop: 4,
  fontSize: 10,
  fontWeight: 700,
  color: "#2563EB",
},
infoGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
  gap: 16,
  marginTop: 20,
},

infoCard: {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
},
billingCard: {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  marginTop: 20,
  boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
},

billingTitle: {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 16,
},

billingGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
  gap: 16,
},

billItem: {
  background: "#F8FAFC",
  padding: 16,
  borderRadius: 12,
  textAlign: "center",
},

totalBox: {
  background: "linear-gradient(135deg,#DBEAFE,#BFDBFE)",
  borderRadius: 16,
  padding: 20,
  textAlign: "center",
},

paymentInfo: {
  marginTop: 12,
  fontSize: 13,
  color: "#64748B",
},
};