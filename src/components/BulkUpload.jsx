import React, { useState, useEffect } from "react";
import API from "../api";
import { MdUploadFile } from "react-icons/md";
import "./BulkUpload.css";

const categoryUnitMap = {
  Tablet: ["Tablet", "Strip"],
  Capsule: ["Capsule"],
  Syrup: ["ML"],
  Injection: ["ML"],
  Ointment: ["Grams"],
  "Medical Device": ["Unit"]
};

const BulkUpload = () => {
  const [data, setData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState([]);
  const [existingNames, setExistingNames] = useState([]);


  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/medicines/upload-excel", formData);
      const parsed = res.data.data;

     const updated = parsed.map(item => {
  const normalized = item.name
    ?.toLowerCase()
    .replace(/[^\w\s]/g, "")  
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...item,
        exists: existingNames.length > 0 && existingNames.includes(normalized)
    };
    });


      setData(updated);
validateData(updated); 
      setShowPreview(true);
    } catch (err) {
      alert("Upload failed");
    }
  };

const validateData = (rows) => {
  let err = [];

  rows.forEach((item, i) => {
    if (!item.name) {
      err.push(`Row ${i + 1}: Name is required`);
    }

    const validUnits = categoryUnitMap[item.category] || [];

    if (!validUnits.includes(item.unit)) {
      err.push(`Row ${i + 1}: Invalid unit for ${item.category}`);
    }

    if (item.sellingPrice <= 0) {
      err.push(`Row ${i + 1}: Price must be > 0`);
    }
  });

  setErrors(err);
};

const handleChange = (index, field, value) => {
  const updated = [...data];

  updated[index][field] = value;

  // ✅ Normalize name
  const normalized = updated[index].name
    ?.toLowerCase()
    .replace(/[^\w\s]/g, "")  
    .replace(/\s+/g, " ")
    .trim();

  // ✅ Check existence
  updated[index].exists = existingNames.includes(normalized);

  // ✅ AUTO UNIT CHANGE
  if (field === "category") {
    const units = categoryUnitMap[value] || [];
    updated[index].unit = units[0] || "";
  }

  setData(updated);
  validateData(updated);
};

useEffect(() => {
  const fetchExisting = async () => {
    const res = await API.get("/medicines");

const names = res.data.map(m =>
  m.name
    ?.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
);

    setExistingNames(names);
  };

  fetchExisting();
}, []);

  const handleSave = async () => {
    if (errors.length > 0) {
      alert("Fix errors before saving");
      return;
    }

    try {
      const res = await API.post("/medicines/bulk-save", {
        medicines: data,
      });

      alert(`Created: ${res.data.created} | Updated: ${res.data.updated}`);
      setShowPreview(false);
      setData([]);
    } catch {
      alert("Save failed");
    }
  };

  return (
    <div className="bulk-container">
      <div className="bulk-header">
        <div>
          <h2 style={{paddingBottom:"10px"}}>Bulk Upload Medicines</h2>
          <p>Upload, review and manage inventory efficiently</p>
        </div>

        {/* Upload Button */}
        <label htmlFor="uploadFile" className="upload-btn">
          <MdUploadFile /> Upload Excel
        </label>
        <input
          id="uploadFile"
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={handleUpload}
        />
      </div>

      {showPreview && (
        <div className="bulk-card">
          <div className="bulk-card-header">
            <h3>Preview & Edit</h3>
            <span>{data.length} items</span>
          </div>

          {/* ERRORS */}
          {errors.length > 0 && (
            <div className="error-box">
              <b>Fix these issues:</b>
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="table-wrapper">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Type</th>
                </tr>
              </thead>

              <tbody>
                {data.map((m, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="input"
                        value={m.name}
                        onChange={(e) =>
                          handleChange(i, "name", e.target.value)
                        }
                      />
                    </td>

                    <td>
                   <select
                    className="input"
                    value={m.category}
                    onChange={(e) =>
                        handleChange(i, "category", e.target.value)
                    }
                    >
                    {Object.keys(categoryUnitMap).map(cat => (
                        <option key={cat}>{cat}</option>
                    ))}
                    </select>
                    </td>

                    <td>
                      <select
                        className="input"
                        value={m.unit}
                        onChange={(e) =>
                          handleChange(i, "unit", e.target.value)
                        }
                      >
                        {(categoryUnitMap[m.category] || []).map((u) => (
                        <option key={u}>{u}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        className="input"
                        type="number"
                        value={m.costPrice}
                        onChange={(e) =>
                          handleChange(i, "costPrice", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="input"
                        type="number"
                        value={m.sellingPrice}
                        onChange={(e) =>
                          handleChange(i, "sellingPrice", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        className="input"
                        type="number"
                        value={m.stock}
                        onChange={(e) =>
                          handleChange(i, "stock", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <select
  className="input"
  value={m.status || "Active"}
  onChange={(e) =>
    handleChange(i, "status", e.target.value)
  }
>
  <option value="Active">Active</option>
  <option value="Inactive">Inactive</option>
</select>
                    </td>

                    <td>
                      <span
                        className={m.exists ? "type update" : "type new"}
                      >
                        {m.exists ? "Update" : "New"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="actions">
            <button className="btn primary" onClick={handleSave}>
              Save All
            </button>
            <button
              className="btn danger"
              onClick={() => {
                setShowPreview(false);
                setData([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;