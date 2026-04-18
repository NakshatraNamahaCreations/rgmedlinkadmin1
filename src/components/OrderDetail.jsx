import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api";
import {
  FaArrowLeft,
  FaUser,
  FaMapMarkerAlt,
  FaSync,
  FaMoneyBillWave,
  FaCheckCircle,
  FaBox,
  FaReceipt,
  FaPercentage,
  FaTag,
  FaWallet
} from "react-icons/fa";
import "./orderDetail.css";


export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, []);


  const fetchOrder = async () => {
    try {
      const res = await API.get(`/orders/${id}`);
      setOrder(res.data.data || res.data);
    } catch (err) {
      console.error(err);
    }
  };

 if (!order) return <div className="loader">Loading...</div>;


  const fmt = (v) => `₹${(v || 0).toFixed(2)}`;

const formatDate = (d) => {
  if (!d) return "—";

  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

  const getDaysLeft = (d) => {
    if (!d) return "-";
    const diff = new Date(d) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const getExpiryDate = () => {
  if (!order.items || order.items.length === 0) return null;

  const maxDays = Math.max(
    ...order.items.map((item) => item.duration || 0)
  );

  if (!maxDays) return null;

  const expiry = new Date(order.createdAt);
  expiry.setDate(expiry.getDate() + maxDays);

  return expiry;
};

  const getStepIndex = (status) => {
    const map = {
      Created: 0,
      Processing: 1,
      Packed: 2,
      Shipped: 3,
      Delivered: 4,
    };
    return map[status] ?? 0;
  };



  const subtotal = (order?.items || []).reduce(
  (sum, item) => sum + ((item.qty || 0) * (item.price || 0)),
  0
);

const gst = subtotal * 0.18;
const discount = order?.discount || 0;
const total = subtotal + gst - discount;


  return (
    <div className="order-container">

      {/* BACK */}
      <button className="back-btn" onClick={() => nav(-1)}>
        <FaArrowLeft /> Back
      </button>

      {/* HEADER */}
      <div className="order-header">
        <div>
          <h2>Order #{order.orderId}</h2>
          <p className="subtext">
            {order.patientDetails?.name} • {order.patientDetails?.phone}
          </p>
        </div>

        <div className="status-badge">
          <FaCheckCircle /> {order.orderStatus}
        </div>
      </div>

      {/* TOP INFO */}
      <div className="top-info">
        <InfoCard label="Order ID" value={order.orderId} />
        <InfoCard label="Start Date" value={formatDate(order.createdAt)} />
        <InfoCard 
        label="Expiry" 
        value={formatDate(getExpiryDate())} 
        highlight 
        />

        <InfoCard 
        label="Days Left" 
        value={
            getExpiryDate()
            ? `${getDaysLeft(getExpiryDate())} days`
            : "-"
        }
        />
      </div>

      {/* TRACKING */}
     <div className="tracking">
  <h3>Order Tracking</h3>

  <div className="steps">
    {["Created", "Processing", "Packed", "Shipped", "Delivered"].map((step, i) => {
      const current = getStepIndex(order.orderStatus);

      const icons = [
        <FaCheckCircle />,
        <FaSync />,
        <FaBox />,
        <FaMapMarkerAlt />,
        <FaCheckCircle />
      ];

      return (
        <div
          key={i}
          className={`step ${
            i < current ? "completed" : i === current ? "current" : ""
          }`}
        >
          <div className="circle-step">
            {i < current ? "✓" : icons[i]}
          </div>

          <p>{step}</p>
          {i === current && <span className="current-label">CURRENT</span>}
        </div>
      );
    })}
  </div>
</div>

      {/* RX INFO */}
        <div className="rx-info premium glow">
        <div>
            <span className="rx-label">Prescription ID</span>
            <span className="rx-value">
            {order.prescription?.rxId || "—"}
            </span>
        </div>

        <div>
            <span className="rx-label">Doctor</span>
            <span className="rx-value">
            {order.prescription?.doctor || "—"}
            </span>
        </div>
        </div>

      {/* INFO GRID */}
      <div className="info-grid">
        <Card label="Payment" value={order.paymentStatus} icon={<FaMoneyBillWave />} />
        <Card label="Total Amount" value={fmt(order.totalAmount)} icon={<FaMoneyBillWave />} />
        <Card label="Items" value={order.items?.length || 0} icon={<FaBox />} />
        <Card label="Order Status" value={order.orderStatus} highlight icon={<FaCheckCircle />} />
      </div>

      {/* CUSTOMER */}
<Section title="Customer Details" icon={<FaUser />}>

<div className="customer-card-premium">

  {/* LEFT PROFILE */}
  <div className="customer-profile-premium">
    <div className="avatar big">
      {order.patientDetails?.name?.charAt(0) || "U"}
    </div>

    <div>
      <div className="cust-name">
        {order.patientDetails?.name || "-"}
      </div>
      <div className="cust-sub">
        {order.patientDetails?.orderingFor || "-"}
      </div>
    </div>
  </div>

  {/* RIGHT DETAILS */}
  <div className="customer-info-premium">

    <div className="info-pill">
      <span>📞 Phone</span>
      <strong>{order.patientDetails?.phone || "-"}</strong>
    </div>

    <div className="info-pill">
      <span>📱 Secondary</span>
      <strong>{order.patientDetails?.secondaryPhone || "-"}</strong>
    </div>

    <div className="info-pill full">
      <span>✉ Email</span>
      <strong>{order.patientDetails?.email || "-"}</strong>
    </div>

  </div>

</div>

</Section>

      {/* ADDRESS */}
      <Section title="Delivery Address" icon={<FaMapMarkerAlt />}>
       <div className="address-card">

  <div className="address-main">
    <FaMapMarkerAlt className="address-icon" />
    <div>
      <div className="address-title">Delivery Address</div>
      <div className="address-text">
        {order.addressDetails?.fullAddress || "-"}
      </div>
    </div>
  </div>

  <div className="address-meta">
    <div className="meta-box">
      <span>City</span>
      <strong>{order.addressDetails?.city || "-"}</strong>
    </div>

    <div className="meta-box">
      <span>State</span>
      <strong>{order.addressDetails?.state || "-"}</strong>
    </div>

    <div className="meta-box">
      <span>Pincode</span>
      <strong>{order.addressDetails?.pincode || "-"}</strong>
    </div>
  </div>

</div>
      </Section>

      {/* MEDICINES */}
      <Section title="Ordered Medicines" icon={<FaSync />}>
        <table className="med-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Days</th>
              <th>M</th>
              <th>A</th>
              <th>N</th>
              <th>Daily</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {(order.items || []).map((m, i) => {
              const daily =
                (m.freq?.m || 0) +
                (m.freq?.a || 0) +
                (m.freq?.n || 0);

              return (
                <tr key={i}>
                  <td className="med-name">{m.name}</td>
                  <td>{m.duration || "-"}</td>

                  <td><Circle value={m.freq?.m} type="morning" /></td>
                  <td><Circle value={m.freq?.a} type="afternoon" /></td>
                  <td><Circle value={m.freq?.n} type="night" /></td>

                  <td className="daily">{daily}</td>
                  <td>{m.qty}</td>
               <td>{fmt(m.price || m.unitPrice)}</td>
                <td className="subtotal">
                {fmt((m.qty || 0) * (m.price || m.unitPrice || 0))}
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* BILLING */}
<Section title="Billing Summary" icon={<FaMoneyBillWave />}>

  <div className="billing-grid">

    <Card 
      icon={<FaReceipt />} 
      label="Subtotal" 
      value={fmt(subtotal)} 
    />

    <Card 
      icon={<FaPercentage />} 
      label="GST (18%)" 
      value={fmt(gst)} 
    />

    <Card 
      icon={<FaTag />} 
      label="Discount" 
      value={`- ${fmt(discount)}`} 
    />

    <Card 
      icon={<FaWallet />} 
      label="Grand Total" 
      value={fmt(total)} 
      highlight 
    />

  </div>

</Section>

    </div>
  );
}

/* COMPONENTS */

const Section = ({ title, icon, children }) => (
  <div className="section">
    <h3 className="section-title">{icon} {title}</h3>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div className="grid">{children}</div>
);

const Field = ({ label, value }) => (
  <div>
    <div className="label">{label}</div>
    <div className="value">{value || "-"}</div>
  </div>
);

const Card = ({ label, value, highlight, icon }) => (
  <div className={`card premium ${highlight ? "highlight" : ""}`}>
  <div className="card-row">
  <div className="card-left">
    <div className="card-icon">{icon}</div>
    <div className="card-label">{label}</div>
  </div>

  <div className="card-value">{value}</div>
</div>

  
  </div>
);

const InfoCard = ({ label, value, highlight }) => (
  <div className={`info-card ${highlight ? "highlight" : ""}`}>
    <div className="label">{label}</div>
    <div className="value">{value}</div>
  </div>
);

const Circle = ({ value, type }) => {
  if (!value) return <div className="circle empty">0</div>;
  return <div className={`circle ${type}`}>{value}</div>;
};