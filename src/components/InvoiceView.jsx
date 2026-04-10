import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import html2pdf from "html2pdf.js";
import { Ic, PATHS } from "./Styles";

/* ── TOKENS ───────────────────────────────────────────────────── */
const S = {
  ink: "#0F172A", ink2: "#1E293B", ink3: "#475569", ink4: "#94A3B8",
  surface: "#FFFFFF", bg: "#F8FAFC", subtle: "#F1F5F9",
  border: "#E2E8F0",
  brand: "#4F46E5", brandDk: "#4338CA", brandLt: "#EEF2FF",
  green: "#059669", greenLt: "#ECFDF5",
  amber: "#D97706", amberLt: "#FFFBEB",
  red: "#DC2626", redLt: "#FEF2F2",
  blue: "#3B82F6",
  font: "'DM Sans', sans-serif",
};

const STATUS_CFG = {
  Paid:       { color: S.green, bg: S.greenLt },
  Pending:    { color: S.amber, bg: S.amberLt },
  Failed:     { color: S.red,   bg: S.redLt },
  Generated:  { color: S.green, bg: S.greenLt },
  Created:    { color: S.ink4,  bg: S.subtle },
  Processing: { color: S.blue,  bg: "#EFF6FF" },
  Packed:     { color: "#0D9488", bg: "#F0FDFA" },
  Shipped:    { color: "#7C3AED", bg: "#F5F3FF" },
  Delivered:  { color: S.green, bg: S.greenLt },
};

const InvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => { fetchInvoice(); }, []);

  const fetchInvoice = async () => {
    try {
      const res = await API.get(`/orders/${id}`);
      setInvoice(res.data.data);
    } catch (err) { console.error("Failed to load invoice", err); }
  };

  const numberToWords = (num) => {
    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
      "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const inWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
      if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
      return String(n);
    };
    const whole = Math.floor(num);
    const paise = Math.round((num - whole) * 100);
    let result = inWords(whole) + " Rupees";
    if (paise > 0) result += " and " + inWords(paise) + " Paise";
    return result + " Only";
  };

  const generateInvoice = async () => {
    try {
      await API.patch(`/orders/${invoice._id}/invoice`);
      const res = await API.get(`/orders/${invoice._id}`);
      setInvoice(res.data.data);
    } catch (err) { console.error("Invoice generation failed", err); }
  };

  const downloadPDF = () => {
    const element = document.getElementById("invoicePDF");
    html2pdf().set({
      margin: [8, 8, 8, 8],
      filename: `Invoice-${invoice.invoiceNumber || invoice.orderId}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(element).save();
  };

  /* ── LOADING STATE ── */
  if (!invoice) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", fontFamily: S.font }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${S.border}`, borderTopColor: S.brand, borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: S.ink4 }}>Loading invoice...</p>
      </div>
    </div>
  );

 const meds = invoice.items || [];

const items = invoice.items || [];

const sub = items.reduce(
  (sum, item) => sum + (item.subtotal || (item.qty * item.price)),
  0
);

const gst = invoice.gstAmount || sub * 0.18;
const disc = 0; // or dynamic later


  const total = invoice.totalAmount || 0;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const Chip = ({ label }) => {
    const c = STATUS_CFG[label] || { color: S.ink4, bg: S.subtle };
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: c.bg, color: c.color }}>{label}</span>;
  };

  return (
    <div style={{ fontFamily: S.font, padding: "0 10px" }}>

      {/* Print styles — hide sidebar, action bar, make invoice full-width */}
      <style>{`
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          div[style*="width: 224"] { display: none !important; }
          div[style*="marginLeft"] { margin-left: 0 !important; }
          [data-print-hide] { display: none !important; }
          #invoicePDF { max-width: 100% !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; }
        }
      `}</style>

      {/* ── ACTION BAR ── */}
      <div data-print-hide style={{
        maxWidth: 860, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={ghostBtn}>
          <Ic d={PATHS.x} s={12} c={S.ink4} /> Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {invoice.invoiceStatus === "Pending" ? (
            <button onClick={generateInvoice} style={primaryBtn}>
              <Ic d={PATHS.billing} s={14} c="#fff" /> Generate Invoice
            </button>
          ) : (
            <>
              <button onClick={downloadPDF} style={primaryBtn}>
                <Ic d={PATHS.trending} s={14} c="#fff" /> Download PDF
              </button>
              <button onClick={() => window.print()} style={ghostBtn}>
                <Ic d={PATHS.billing} s={13} c={S.ink4} /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         INVOICE DOCUMENT
         ══════════════════════════════════════════════════════════ */}
      <div id="invoicePDF" style={{
        background: S.surface, maxWidth: 860, margin: "0 auto",
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04), 0 12px 40px rgba(15,23,42,0.1)",
        border: `1px solid ${S.border}`,
      }}>

        {/* ── HEADER BAND ── */}
        <div style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "28px 36px", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          {/* Company */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "rgba(255,255,255,0.95)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.25)", overflow: "hidden", flexShrink: 0,
              }}>
                <img src="/images/logoimage.png" alt="RG Medlink" style={{ width: 36, height: 36, objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>RG Medlink Pharmacy</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Medicines Made Easy & Accessible</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
              Vijayanagar, Mysore, Karnataka<br />
              Phone: +91 9911344536 · GSTIN: 29ABCDE1234F1Z5
            </div>
          </div>

          {/* Invoice meta */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5, marginBottom: 10 }}>INVOICE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "Invoice No", value: invoice.invoiceNumber || "Pending" },
                { label: "Invoice Date", value: fmtDate(invoice.invoiceDate) },
                { label: "Order ID", value: invoice.orderId },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.5 }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'DM Mono',monospace", minWidth: 130, textAlign: "right" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 10 }}>
              <Chip label={invoice.orderStatus} />
              <Chip label={invoice.paymentStatus} />
            </div>
          </div>
        </div>

        {/* ── BILL TO + DELIVERY ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${S.border}` }}>
          {/* Bill To */}
          <div style={{ padding: "22px 36px", borderRight: `1px solid ${S.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Bill To</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: S.ink, marginBottom: 8 }}>{invoice.patientDetails?.name || "—"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { icon: PATHS.users, text: invoice.patientDetails?.phone || "—" },
                { icon: PATHS.billing, text: invoice.patientDetails?.email || "—" },
                { icon: PATHS.dash, text: invoice.addressDetails?.fullAddress || invoice.patientDetails?.address || "Not Provided" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Ic d={r.icon} s={12} c={S.ink4} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: S.ink3, lineHeight: 1.5 }}>{r.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Info */}
          <div style={{ padding: "22px 36px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Delivery Info</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Order Date",      value: fmtDate(invoice.createdAt) },
                { label: "Courier Partner",  value: invoice.courierPartner || "Awaiting Assignment" },
                { label: "Tracking Number",  value: invoice.trackingNumber || "—" },
                { label: "Payment Method",   value: invoice.paymentMethod || "UPI" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: S.ink4 }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: S.ink2 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MEDICINES TABLE ── */}
        <div style={{ padding: "0 36px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 30 }}>#</th>
                <th style={{ ...thS, textAlign: "left" }}>Medicine</th>
                <th style={thS}>Duration</th>
                <th style={thS}>Dosage</th>
                <th style={thS}>Qty</th>
                <th style={thS}>Unit Price</th>
                <th style={{ ...thS, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {meds.map((m, i) => {
                const dosage = `${m.freq?.m || 0}-${m.freq?.a || 0}-${m.freq?.n || 0}`;
                return (
                  <tr key={m._id || i}>
                    <td style={{ ...tdS, textAlign: "center", color: S.ink4, fontSize: 11 }}>{i + 1}</td>
                    <td style={{ ...tdS, fontWeight: 600, color: S.ink2 }}>{m.name || "—"}</td>
                    <td style={{ ...tdS, textAlign: "center", color: S.ink3 }}>{m.duration}d</td>
                    <td style={{ ...tdS, textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, background: S.brandLt, color: S.brand, padding: "2px 8px", borderRadius: 99 }}>
                        {dosage}
                      </span>
                    </td>
                    <td style={{ ...tdS, textAlign: "center", fontWeight: 600 }}>{m.qty}</td>
                    <td style={{ ...tdS, textAlign: "center" }}>₹{m.price}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: S.ink }}>₹{(m.subtotal || 0).toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── TOTALS SECTION ── */}
        <div style={{ padding: "20px 36px 28px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 36, alignItems: "start" }}>
          {/* Left: Amount in words + tax info */}
          <div>
            <div style={{
              background: S.subtle, borderRadius: 10, padding: "14px 16px",
              border: `1px solid ${S.border}`, marginBottom: 16,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: S.ink4, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Amount in Words</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.ink2, lineHeight: 1.5, fontStyle: "italic" }}>
                {numberToWords(total)}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
              {[
                { label: "HSN Code", value: "3004" },
                { label: "Place of Supply", value: "Karnataka" },
                { label: "Transaction ID", value: invoice.paymentReference || "—" },
                { label: "Payment Time", value: invoice.paymentTime ? new Date(invoice.paymentTime).toLocaleString("en-IN") : "—" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ color: S.ink4, fontWeight: 600 }}>{r.label}</span>
                  <span style={{ color: S.ink3, fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Summary box */}
          <div style={{
            border: `1.5px solid ${S.border}`, borderRadius: 12,
            overflow: "hidden",
          }}>
            {[
              { label: "Subtotal", value: `₹${sub.toLocaleString("en-IN")}` },
              { label: "GST (18%)", value: `₹${gst.toLocaleString("en-IN")}` },
              { label: "Discount", value: `−₹${disc.toLocaleString("en-IN")}` },
            ].map(r => (
              <div key={r.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "11px 18px", borderBottom: `1px solid ${S.border}`,
                fontSize: 13, color: S.ink3,
              }}>
                <span style={{ fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: S.ink2 }}>{r.value}</span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px",
              background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Total Amount</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          borderTop: `1px solid ${S.border}`, padding: "16px 36px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: S.subtle,
        }}>
          <div style={{ fontSize: 11, color: S.ink4 }}>
            Thank you for choosing <span style={{ fontWeight: 700, color: S.ink3 }}>RG Medlink Pharmacy</span>
          </div>
          <div style={{ fontSize: 10, color: S.ink4 }}>
            support@rgmedlink.com · +91 9911344536
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── STYLES ───────────────────────────────────────────────────── */
const thS = {
  padding: "10px 12px", textAlign: "center",
  fontSize: 9, fontWeight: 700, color: S.ink4,
  textTransform: "uppercase", letterSpacing: 0.8,
  borderBottom: `2px solid ${S.ink}`,
  background: S.subtle,
};

const tdS = {
  padding: "12px 12px", fontSize: 13, color: S.ink3,
  borderBottom: `1px solid ${S.border}`,
};

const ghostBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 16px", border: `1px solid ${S.border}`, borderRadius: 8,
  background: S.surface, color: S.ink4, fontSize: 12.5, fontWeight: 600,
  cursor: "pointer", fontFamily: S.font, transition: "all .15s",
};

const primaryBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 18px", border: "none", borderRadius: 8,
  background: S.brand, color: "#fff", fontSize: 12.5, fontWeight: 600,
  cursor: "pointer", fontFamily: S.font,
  boxShadow: "0 2px 10px rgba(79,70,229,0.3)", transition: "all .15s",
};

export default InvoiceView;
