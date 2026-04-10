import { useState, useEffect } from "react";
import {
  FaUserInjured,
  FaCapsules,
  FaFileInvoiceDollar,
  FaPlus,
  FaTrash,
} from "react-icons/fa";

import { Btn, Inp, Sel, Field } from "./Styles";
import { today, fCur } from "../data/MasterData";
import API from "../api";

/* ================= FREQUENCY EDITOR ================= */

export const FreqEd = ({ freq, onChange }) => {
  const slots = [
    { key: "m", label: "Morning", color: "#F59E0B" },
    { key: "a", label: "Afternoon", color: "#2563EB" },
    { key: "n", label: "Night", color: "#7C3AED" },
  ];

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {slots.map((slot) => (
        <div key={slot.key} style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
              color: slot.color,
            }}
          >
            {slot.label}
          </div>

          <Inp
            type="number"
            min="0"
            value={freq[slot.key]}
            onChange={(e) =>
              onChange({
                ...freq,
                [slot.key]: Number(e.target.value),
              })
            }
          />
        </div>
      ))}
    </div>
  );
};

/* ================= MAIN COMPONENT ================= */

const RxForm = ({ onSave, onClose }) => {
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [start, setStart] = useState(today());
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState([
    { medicine: "", duration: 30, freq: { m: 1, a: 0, n: 1 } },
  ]);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  try {
    const pRes = await API.get("/patients");
    const mRes = await API.get("/medicines");

    console.log("RAW PATIENT RESPONSE:", pRes);
    console.log("RAW MEDICINE RESPONSE:", mRes);

    console.log("PATIENT DATA:", pRes.data);
    console.log("MEDICINE DATA:", mRes.data);

    setPatients(pRes.data);
    setMedicines(mRes.data);

  } catch (err) {
    console.error("API ERROR:", err);
  }
};
  /* ================= ROW HANDLERS ================= */

  const addRow = () =>
    setRows((r) => [
      ...r,
      { medicine: "", duration: 30, freq: { m: 1, a: 0, n: 1 } },
    ]);

  const removeRow = (index) =>
    setRows((r) => r.filter((_, i) => i !== index));

  const updateRow = (index, key, value) =>
    setRows((r) =>
      r.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      )
    );

  /* ================= BILLING PREVIEW ================= */

  const subtotalPreview = rows.reduce((sum, row) => {
    const med = medicines.find((m) => m._id === row.medicine);
    if (!med) return sum;

    const daily =
      (row.freq.m || 0) +
      (row.freq.a || 0) +
      (row.freq.n || 0);

    return sum + daily * row.duration * med.price;
  }, 0);

  const gstPreview = subtotalPreview * 0.12;
  const totalPreview = subtotalPreview + gstPreview - discount;

  /* ================= SAVE ================= */

const handleSave = async () => {
  if (!patient || !doctor || rows.some((r) => !r.medicine)) {
    alert("Please fill all required fields");
    return;
  }

  const payload = {
    patient,
    doctor,
    start,
    discount: Number(discount),
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

  console.log("SENDING:", payload);

  try {
    setSaving(true);
    await onSave(payload);
  } catch (err) {
    console.error("SAVE ERROR:", err);
  } finally {
    setSaving(false);
  }
};
  /* ================= UI ================= */

  return (
    <div
      style={{
        background: "#ffffff",
        padding: 28,
        borderRadius: 16,
        boxShadow: "0 15px 40px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 30,
      }}
    >
      {/* PATIENT SECTION */}
      <SectionTitle icon={<FaUserInjured />} label="Patient Information" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 18,
        }}
      >
        <Field
          label="Patient"
          required
          ch={
            <Sel value={patient} onChange={(e) => setPatient(e.target.value)}>
              <option value="">Select Patient</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Sel>
          }
        />

        <Field
          label="Doctor"
          required
          ch={
            <Inp
              placeholder="Enter doctor name"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
            />
          }
        />

        <Field
          label="Start Date"
          required
          ch={
            <Inp
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          }
        />
      </div>

      {/* MEDICINES */}
      <SectionTitle icon={<FaCapsules />} label="Medicines Prescribed" />

      {rows.map((row, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: 20,
            background: "#F9FAFB",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <Sel
              value={row.medicine}
              onChange={(e) =>
                updateRow(index, "medicine", e.target.value)
              }
            >
              <option value="">Select Medicine</option>
              {medicines.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} — ₹{m.price}
                </option>
              ))}
            </Sel>

            <Inp
              type="number"
              min="1"
              value={row.duration}
              onChange={(e) =>
                updateRow(index, "duration", Number(e.target.value))
              }
            />

            {rows.length > 1 && (
              <button
                onClick={() => removeRow(index)}
                style={{
                  background: "#FEE2E2",
                  border: "none",
                  borderRadius: 8,
                  padding: 8,
                  cursor: "pointer",
                }}
              >
                <FaTrash color="#DC2626" />
              </button>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <FreqEd
              freq={row.freq}
              onChange={(v) => updateRow(index, "freq", v)}
            />
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#2563EB",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        <FaPlus /> Add Medicine
      </button>

      {/* BILLING */}
      <SectionTitle
        icon={<FaFileInvoiceDollar />}
        label="Billing Summary"
      />

      <div
        style={{
          background: "#F3F4F6",
          padding: 20,
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <BillingBox label="Subtotal" value={fCur(subtotalPreview)} />
        <BillingBox label="GST (12%)" value={fCur(gstPreview)} />

        <div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            Discount
          </div>
          <Inp
            type="number"
            value={discount}
            onChange={(e) =>
              setDiscount(Number(e.target.value))
            }
          />
        </div>

        <BillingBox
          label="Total Payable"
          value={fCur(totalPreview)}
          highlight
        />
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <Btn ch="Cancel" v="ghost" onClick={onClose} />
        <Btn
          ch={saving ? "Creating..." : "Create Prescription"}
          onClick={handleSave}
          disabled={saving}
        />
      </div>
    </div>
  );
};

/* ================= SMALL COMPONENTS ================= */

const SectionTitle = ({ icon, label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 16,
      fontWeight: 700,
      color: "#111827",
    }}
  >
    <span style={{ color: "#2563EB" }}>{icon}</span>
    {label}
  </div>
);

const BillingBox = ({ label, value, highlight }) => (
  <div>
    <div style={{ fontSize: 12, color: "#6B7280" }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 18,
        fontWeight: 700,
        color: highlight ? "#2563EB" : "#111827",
      }}
    >
      {value}
    </div>
  </div>
);

export default RxForm;