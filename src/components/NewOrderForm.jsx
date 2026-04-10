import { useState, useEffect } from "react";
import API from "../api";
import { Ic, PATHS } from "./Styles";
import { today } from "../data/MasterData";

/* ─── TOKENS ───────────────────────────────────────────────────── */
const S = {
  ink: "#0F172A",
  ink2: "#334155",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  brand: "#06549d",
  green: "#059669",
  red: "#DC2626",
  amber: "#D97706",
};

/* ─── MAIN COMPONENT ───────────────────────────────────────────── */
export default function NewOrderForm({ onSave, onClose }) {
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [start, setStart] = useState(today());
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropOpen, setPatientDropOpen] = useState(false);

  const [rows, setRows] = useState([
    { medicine: "", duration: 30, freq: { m: 1, a: 0, n: 1 } },
  ]);

  useEffect(() => {
    API.get("/patients").then((r) => setPatients(r.data.data || [])).catch(() => {});
    API.get("/medicines").then((r) => setMedicines(r.data || [])).catch(() => {});
  }, []);

  /* ── ROW HANDLERS ── */
  const addRow = () =>
    setRows((r) => [...r, { medicine: "", duration: 30, freq: { m: 1, a: 0, n: 1 } }]);

  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  const updateRow = (i, key, val) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));

  const updateFreq = (i, slot, val) =>
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, freq: { ...row.freq, [slot]: Math.max(0, Number(val)) } } : row
      )
    );

  /* ── BILLING ── */
  const lineTotal = (row) => {
    const med = medicines.find((m) => m._id === row.medicine);
    if (!med) return 0;
    const daily = (row.freq.m || 0) + (row.freq.a || 0) + (row.freq.n || 0);
    return daily * row.duration * med.price;
  };

  const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0);
  const gst = subtotal * 0.12;
  const total = subtotal + gst - Number(discount || 0);

  /* ── SUBMIT ── */
  const handlePlaceOrder = async () => {
    if (!patient) { alert("Please select a patient"); return; }
    if (!doctor.trim()) { alert("Please enter doctor name"); return; }
    if (rows.some((r) => !r.medicine)) { alert("Please select a medicine for each row"); return; }

    const payload = {
      patient,
      doctor,
      start,
      discount: Number(discount || 0),
      meds: rows.map((row) => ({
        medicine: row.medicine,
        duration: Number(row.duration),
        freq: {
          m: Number(row.freq.m),
          a: Number(row.freq.a),
          n: Number(row.freq.n),
        },
      })),
    };

    try {
      setSaving(true);
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  /* ── PATIENT SEARCH FILTER ── */
  const filteredPatients = patientSearch
    ? patients.filter((p) =>
        p.name?.toLowerCase().includes(patientSearch.toLowerCase())
      )
    : patients;

  const selectedPatient = patients.find((p) => p._id === patient);

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 520 }}>

      {/* ── LEFT: FORM ── */}
      <div
        style={{
          flex: 1,
          paddingRight: 28,
          borderRight: `1px solid ${S.border}`,
          overflowY: "auto",
          maxHeight: "68vh",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* SECTION: ORDER DETAILS */}
        <SectionHead label="Order Details" icon={PATHS.rx} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* PATIENT SELECTOR */}
          <div style={{ position: "relative", gridColumn: "span 2" }}>
            <Label text="Patient" required />
            <div
              onClick={() => setPatientDropOpen((v) => !v)}
              style={{
                ...inputStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <span style={{ color: selectedPatient ? S.ink : S.muted, fontSize: 13 }}>
                {selectedPatient ? selectedPatient.name : "Search & select patient…"}
              </span>
              <Ic d={PATHS.users} s={14} c={S.muted} />
            </div>

            {patientDropOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: `1px solid ${S.border}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(15,23,42,.12)",
                  zIndex: 50,
                  marginTop: 4,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "8px 10px", borderBottom: `1px solid ${S.border}` }}>
                  <input
                    autoFocus
                    placeholder="Type to search..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      color: S.ink,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {filteredPatients.length === 0 ? (
                    <div style={{ padding: "12px 14px", fontSize: 13, color: S.muted }}>
                      No patients found
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => {
                          setPatient(p._id);
                          setPatientDropOpen(false);
                          setPatientSearch("");
                        }}
                        style={{
                          padding: "10px 14px",
                          fontSize: 13,
                          cursor: "pointer",
                          background: patient === p._id ? S.brand + "10" : "transparent",
                          color: patient === p._id ? S.brand : S.ink2,
                          fontWeight: patient === p._id ? 600 : 400,
                          borderBottom: `1px solid ${S.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            patient === p._id ? S.brand + "10" : "transparent")
                        }
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: S.brand + "15",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 700,
                            color: S.brand,
                          }}
                        >
                          {p.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.phone && (
                            <div style={{ fontSize: 11, color: S.muted }}>{p.phone}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DOCTOR */}
          <div>
            <Label text="Doctor / Referred By" required />
            <input
              placeholder="e.g. Dr. Rajesh Kumar"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* DATE */}
          <div>
            <Label text="Order Date" />
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* SECTION: MEDICINES */}
        <SectionHead label="Medicines" icon={PATHS.box} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row, i) => {
            const med = medicines.find((m) => m._id === row.medicine);
            const daily = (row.freq.m || 0) + (row.freq.a || 0) + (row.freq.n || 0);
            const line = lineTotal(row);

            return (
              <div
                key={i}
                style={{
                  border: `1px solid ${S.border}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  background: S.bg,
                }}
              >
                {/* ROW HEADER */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: S.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Medicine {i + 1}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {med && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: S.brand,
                        }}
                      >
                        ₹{line.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(i)}
                        style={{
                          background: "#FEF2F2",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Ic d={PATHS.trash} s={13} c={S.red} />
                      </button>
                    )}
                  </div>
                </div>

                {/* MEDICINE SELECT + DURATION */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <Label text="Medicine" />
                    <select
                      value={row.medicine}
                      onChange={(e) => updateRow(i, "medicine", e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select medicine…</option>
                      {medicines.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} — ₹{m.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label text="Duration (days)" />
                    <input
                      type="number"
                      min="1"
                      value={row.duration}
                      onChange={(e) => updateRow(i, "duration", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* FREQUENCY */}
                <div>
                  <Label text="Frequency (tablets per dose)" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 }}>
                    {[
                      { key: "m", label: "Morning", color: "#D97706" },
                      { key: "a", label: "Afternoon", color: "#2563EB" },
                      { key: "n", label: "Night", color: "#7C3AED" },
                    ].map((slot) => (
                      <div key={slot.key}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: slot.color,
                            marginBottom: 4,
                          }}
                        >
                          {slot.label}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            border: `1px solid ${S.border}`,
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#fff",
                          }}
                        >
                          <button
                            onClick={() =>
                              updateFreq(i, slot.key, (row.freq[slot.key] || 0) - 1)
                            }
                            style={freqBtn}
                          >
                            −
                          </button>
                          <span
                            style={{
                              flex: 1,
                              textAlign: "center",
                              fontSize: 14,
                              fontWeight: 700,
                              color: S.ink,
                            }}
                          >
                            {row.freq[slot.key] || 0}
                          </span>
                          <button
                            onClick={() =>
                              updateFreq(i, slot.key, (row.freq[slot.key] || 0) + 1)
                            }
                            style={freqBtn}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {daily > 0 && row.duration > 0 && (
                    <p style={{ fontSize: 11, color: S.muted, marginTop: 6 }}>
                      {daily} tablet{daily > 1 ? "s" : ""}/day × {row.duration} days
                      {med ? ` × ₹${med.price} = ₹${line.toLocaleString("en-IN")}` : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ADD MEDICINE BUTTON */}
        <button onClick={addRow} style={addMedBtn}>
          <Ic d={PATHS.plus} s={14} c={S.brand} />
          Add Another Medicine
        </button>
      </div>

      {/* ── RIGHT: ORDER SUMMARY ── */}
      <div
        style={{
          width: 280,
          paddingLeft: 24,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: S.ink,
            letterSpacing: -0.2,
            marginBottom: 16,
          }}
        >
          Order Summary
        </p>

        {/* MEDICINE LINE ITEMS */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: "35vh",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {rows.map((row, i) => {
            const med = medicines.find((m) => m._id === row.medicine);
            if (!med) return null;
            const daily =
              (row.freq.m || 0) + (row.freq.a || 0) + (row.freq.n || 0);
            const qty = daily * row.duration;
            const line = lineTotal(row);
            return (
              <div
                key={i}
                style={{
                  background: S.bg,
                  border: `1px solid ${S.border}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: S.ink2,
                      flex: 1,
                      lineHeight: 1.3,
                    }}
                  >
                    {med.name}
                  </span>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: S.ink, flexShrink: 0 }}
                  >
                    ₹{line.toLocaleString("en-IN")}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: S.muted, marginTop: 3 }}>
                  {qty} qty × ₹{med.price}
                </p>
              </div>
            );
          })}

          {rows.every((r) => !r.medicine) && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 12px",
                color: S.muted,
                fontSize: 12,
              }}
            >
              Add medicines to see summary
            </div>
          )}
        </div>

        {/* BILLING BREAKDOWN */}
        <div
          style={{
            borderTop: `1px solid ${S.border}`,
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <BillingLine label="Subtotal" value={subtotal} />
          <BillingLine label="GST (12%)" value={gst} />

          {/* DISCOUNT */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: S.muted }}>Discount (₹)</span>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              style={{
                width: 80,
                padding: "4px 8px",
                border: `1px solid ${S.border}`,
                borderRadius: 6,
                fontSize: 12,
                textAlign: "right",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                color: S.red,
                fontWeight: 600,
              }}
            />
          </div>

          {/* TOTAL */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 10,
              borderTop: `1px solid ${S.border}`,
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: S.ink }}>
              Total Payable
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: S.brand,
                letterSpacing: -0.5,
              }}
            >
              ₹{Math.max(0, total).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* PATIENT SUMMARY */}
          {selectedPatient && (
            <div
              style={{
                background: S.brand + "0D",
                border: `1px solid ${S.brand}25`,
                borderRadius: 8,
                padding: "8px 12px",
                marginTop: 4,
              }}
            >
              <p style={{ fontSize: 11, color: S.muted, fontWeight: 600 }}>
                ORDERING FOR
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: S.brand,
                  marginTop: 2,
                }}
              >
                {selectedPatient.name}
              </p>
              {selectedPatient.phone && (
                <p style={{ fontSize: 11, color: S.muted, marginTop: 1 }}>
                  {selectedPatient.phone}
                </p>
              )}
            </div>
          )}

          {/* PLACE ORDER BUTTON */}
          <button
            onClick={handlePlaceOrder}
            disabled={saving}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "13px",
              background: saving ? "#93B7D8" : S.brand,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: 0.2,
              boxShadow: saving ? "none" : "0 4px 14px rgba(6,84,157,.35)",
              transition: "all .15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {saving ? (
              "Placing Order…"
            ) : (
              <>
                <Ic d={PATHS.check} s={15} c="#fff" />
                Place Order
              </>
            )}
          </button>

          {/* CANCEL */}
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "9px",
              background: "transparent",
              color: S.muted,
              border: `1px solid ${S.border}`,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SMALL COMPONENTS ─────────────────────────────────────────── */

const SectionHead = ({ label, icon }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      paddingBottom: 10,
      borderBottom: "1px solid #E2E8F0",
    }}
  >
    <div
      style={{
        background: "#06549d18",
        borderRadius: 7,
        padding: 6,
        display: "flex",
      }}
    >
      <Ic d={icon} s={14} c="#06549d" />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{label}</span>
  </div>
);

const Label = ({ text, required }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      color: "#64748B",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 5,
    }}
  >
    {text}
    {required && <span style={{ color: "#DC2626" }}> *</span>}
  </div>
);

const BillingLine = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span style={{ fontSize: 12, color: "#64748B" }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
      ₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
    </span>
  </div>
);

/* ─── SHARED STYLES ────────────────────────────────────────────── */
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1.5px solid #E2E8F0",
  borderRadius: 8,
  fontSize: 13,
  color: "#0F172A",
  background: "#fff",
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box",
};

const freqBtn = {
  width: 32,
  height: 32,
  border: "none",
  background: "#F8FAFC",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  color: "#64748B",
  flexShrink: 0,
  fontFamily: "'DM Sans', sans-serif",
};

const addMedBtn = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 14px",
  border: "1.5px dashed #CBD5E1",
  borderRadius: 8,
  background: "transparent",
  color: "#06549d",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  width: "fit-content",
};
