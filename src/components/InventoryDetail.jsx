import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api";
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiLock,
  FiUnlock,
  FiX
} from "react-icons/fi";

export default function InventoryDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);


  const [categories, setCategories] = useState([
  "Tablet",
  "Bottle",
  "Strip",
  "Tube",
  "Box"
]);

const [newCategory, setNewCategory] = useState("");
const [showCategoryInput, setShowCategoryInput] = useState(false);


  useEffect(() => {
    API.get(`/medicines/${id}`).then(res => setData(res.data));
  }, [id]);

  const toggleActive = async () => {
    const newStatus = data.status === "Active" ? "Inactive" : "Active";
    await API.put(`/medicines/${data._id}`, { status: newStatus });
    setData({ ...data, status: newStatus });
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this medicine?")) return;
    await API.delete(`/medicines/${data._id}`);
    nav("/inventory");
  };

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  // 🔥 MAIN CALCULATIONS
  const profit = (data.sellingPrice ?? 0) - (data.costPrice ?? 0);
  const margin = data.sellingPrice
    ? Math.round((profit / data.sellingPrice) * 100)
    : 0;

  const pct = Math.min(
    (data.stock / ((data.minStock || 1) * 2)) * 100,
    100
  );

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button onClick={() => nav(-1)} style={backBtn}>
            <FiArrowLeft /> Back
          </button>

          <h2 style={{ margin: 0 }}>{data.name}</h2>
          <p style={{ color: "#64748B" }}>
            {data.category} • {data.unit}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={statusBadge(data)}>{data.status}</span>

          <button
            onClick={() => {
              setEditData(data);
              setEditOpen(true);
            }}
            style={btnStyle}
          >
            <FiEdit2 /> Edit
          </button>

          <button onClick={toggleActive} style={btnStyle}>
            {data.status === "Active" ? <FiLock /> : <FiUnlock />}
          </button>

          <button onClick={handleDelete} style={{ ...btnStyle, color: "#DC2626" }}>
            <FiTrash2 />
          </button>
        </div>
      </div>

      {/* STOCK BAR */}
      <div style={card}>
        <div style={{ marginBottom: 10, fontWeight: 600 }}>
          Stock Health ({data.stock} / {(data.minStock || 0) * 2})
        </div>

        <div style={{ height: 8, background: "#E2E8F0", borderRadius: 20 }}>
          <div style={{
            width: `${pct}%`,
            height: "100%",
            background: "#10B981",
            borderRadius: 20
          }} />
        </div>
      </div>

      {/* GRID */}
      <div style={grid}>
        <Card label="Selling Price" value={`₹${data.sellingPrice ?? 0}`} />
        <Card label="Cost Price" value={`₹${data.costPrice ?? 0}`} />
        <Card label="Profit / Unit" value={`₹${profit}`} />
        <Card label="Margin" value={`${margin}%`} />

        <Card label="Stock" value={data.stock} />
        <Card label="Min Stock" value={data.minStock} />
        <Card label="30d Demand" value={data.demand30 || 0} />
        <Card label="Stockout Days" value={data.daysUntilStockout ?? "—"} />
      </div>

      {/* INVENTORY INSIGHTS */}
      <div style={card}>
        <h4 style={{ marginBottom: 10 }}>Inventory Insights</h4>

        <p>Auto Reorder Qty: <b>{data.autoReorderQty ?? 0}</b></p>
        <p>Days Until Stockout: <b>{data.daysUntilStockout ?? "—"}</b></p>

        {data.stock < data.minStock && (
          <div style={{ color: "#DC2626", fontWeight: 600 }}>
            ⚠ Low stock — reorder required
          </div>
        )}
      </div>

      {/* META */}
      <div style={card}>
        <h4 style={{ marginBottom: 10 }}>Additional Info</h4>

        <p>Created: {new Date(data.createdAt).toLocaleDateString()}</p>
        <p>Updated: {new Date(data.updatedAt).toLocaleDateString()}</p>

        {data.expiry && (
          <p>Expiry: {new Date(data.expiry).toLocaleDateString()}</p>
        )}
      </div>

      {/* EDIT MODAL */}
      {editOpen && (() => {

        // 🔥 LIVE CALCULATIONS
        const costP = parseFloat(editData?.costPrice) || 0;
        const sellP = parseFloat(editData?.sellingPrice) || 0;
        const profitPerUnit = sellP - costP;
        const profitMargin =
          sellP > 0 ? ((profitPerUnit / sellP) * 100).toFixed(1) : 0;

        return (
          <div style={overlay}>
            <div style={{ ...modal, width: 600 }}>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>Edit Medicine</h3>
                <FiX onClick={() => {
                        setEditOpen(false);
                        setShowCategoryInput(false);
                        setNewCategory("");
                    }} style={{ cursor: "pointer" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* BASIC */}
                <div>
                  <h4>Basic Information</h4>

                 <div style={row}>
  <div>
    <label style={label}>Name</label>
    <input
      style={input}
      value={editData.name}
      onChange={(e) =>
        setEditData({ ...editData, name: e.target.value })
      }
    />
  </div>

  <div>
    <label style={label}>Category</label>

    <div style={{ display: "flex", gap: 8 }}>
      <select
        style={{ ...input, flex: 1 }}
        value={editData.category}
        onChange={(e) =>
          setEditData({ ...editData, category: e.target.value })
        }
      >
        {categories.map((cat, i) => (
          <option key={i}>{cat}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setShowCategoryInput(true)}
        style={addBtn}
      >
        +
      </button>
    </div>

    {/* ADD CATEGORY INPUT */}
    {showCategoryInput && (
      <div style={{ marginTop: 10 }}>
        <input
  autoFocus
  style={input}
  placeholder="Enter new category"
  value={newCategory}
  onChange={(e) => setNewCategory(e.target.value)}
/>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            style={saveBtn}
            onClick={() => {
              if (!newCategory.trim()) return;

              setCategories([...categories, newCategory]);
              setEditData({ ...editData, category: newCategory });

              setNewCategory("");
              setShowCategoryInput(false);
            }}
          >
            Add
          </button>

          <button
            style={cancelBtn}
            onClick={() => {
              setShowCategoryInput(false);
              setNewCategory("");
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
</div>

                  <div style={row}>
                    <div>
                      <label style={label}>Unit</label>
                      <select
                        style={input}
                        value={editData.unit}
                        onChange={(e) =>
                          setEditData({ ...editData, unit: e.target.value })
                        }
                      >
                        <option>Tablet</option>
                        <option>Bottle</option>
                        <option>Strip</option>
                        <option>Tube</option>
                        <option>Box</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 🔥 PRICING */}
                <div>
                  <h4>Pricing & Profit</h4>

                  <div style={row}>
                    <div>
                      <label style={label}>Cost Price</label>
                      <input
                        type="number"
                        style={input}
                        value={editData.costPrice}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            costPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div>
                      <label style={label}>Selling Price</label>
                      <input
                        type="number"
                        style={input}
                        value={editData.sellingPrice}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            sellingPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* 🔥 ADVANCED PROFIT CARD */}
                  <div style={{
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: 12,
                    marginTop: 12,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 16px"
                    }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#059669" }}>
                          PROFIT PER UNIT
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>
                          ₹{profitPerUnit.toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 12, color: "#059669" }}>
                          MARGIN
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>
                          {profitMargin}%
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      borderTop: "1px solid #A7F3D0"
                    }}>
                      <div style={profitCell}>
                        <div style={profitLabel}>Cost</div>
                        <div style={profitValue}>₹{costP.toFixed(2)}</div>
                      </div>

                      <div style={profitCell}>
                        <div style={profitLabel}>Selling</div>
                        <div style={profitValue}>₹{sellP.toFixed(2)}</div>
                      </div>

                      <div style={profitCell}>
                        <div style={profitLabel}>GST</div>
                        <div style={profitValue}>₹{(sellP * 0.12).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STOCK */}
                <div>
                  <h4>Stock & Status</h4>

                 <div style={row}>
  <div>
    <label style={label}>Current Stock</label>
    <input
      type="number"
      style={input}
      value={editData.stock}
      onChange={(e) =>
        setEditData({
          ...editData,
          stock: Number(e.target.value),
        })
      }
    />
  </div>

  <div>
    <label style={label}>Min Stock (Reorder Point)</label>
    <input
      type="number"
      style={input}
      value={editData.minStock}
      onChange={(e) =>
        setEditData({
          ...editData,
          minStock: Number(e.target.value),
        })
      }
    />
  </div>
</div>
                      <br />
                  <select
                    style={input}
                    value={editData.status}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>

                <button
                  onClick={async () => {
                    const res = await API.put(`/medicines/${editData._id}`, editData);
                    setData(res.data);
                    setEditOpen(false);
                  }}
                  style={saveBtn}
                >
                  Save Changes
                </button>

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

/* STYLES */

const profitCell = { padding: 10, textAlign: "center" };
const profitLabel = { fontSize: 11, color: "#64748B" };
const profitValue = { fontWeight: 700 };

const statusBadge = (data) => ({
  background: data.status === "Active" ? "#DCFCE7" : "#FEE2E2",
  color: data.status === "Active" ? "#059669" : "#DC2626",
  padding: "6px 12px",
  borderRadius: 20,
  fontWeight: 600
});

const backBtn = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#EEF2FF",
  color: "#4F46E5",
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  marginBottom: 10
};

const btnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  background: "#F1F5F9",
  cursor: "pointer"
};

const card = {
  padding: 20,
  borderRadius: 12,
  background: "#F8FAFC",
  border: "1px solid #E2E8F0"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 10
};

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10
};

const label = {
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #E2E8F0"
};

const saveBtn = {
  padding: 12,
  borderRadius: 10,
  background: "#6366F1",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};

const Card = ({ label, value }) => (
  <div style={{
    padding: 12,
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    background: "#fff"
  }}>
    <div style={{ fontSize: 12, color: "#64748B" }}>{label}</div>
    <div style={{ fontWeight: 700 }}>{value}</div>
  </div>
);

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modal = {
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  width: 420,
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
};

const addBtn = {
  width: 40,
  height: 40,
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  background: "#EEF2FF",
  color: "#4F46E5",
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const cancelBtn = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  background: "#F8FAFC",
  cursor: "pointer"
};