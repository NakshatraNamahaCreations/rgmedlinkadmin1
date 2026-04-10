import React, { useState, useEffect } from "react";
import API from "../api";
import { Card } from "./Styles";

const PatientsView = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  /* FETCH ORDERS */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get("/orders");
      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  };




  /* GROUP BY USER */
  const groupedOrders = orders.reduce((acc, order) => {
    const userId = order.userId || "Unknown User";

    if (!acc[userId]) acc[userId] = [];
    acc[userId].push(order);

    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* HEADER */}
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>
        Patient Details
      </h2>

      <Card
        ch={
          loading ? (
            <div style={{ padding: 20 }}>Loading...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>

                {/* TABLE HEADER */}
                <thead>
                  <tr style={{ background: "#06549d", color: "#fff" }}>
                    <th style={th}>Order ID</th>
                    <th style={th}>Patient Name</th>
                    <th style={th}>Type</th>
                    <th style={th}>Primary Phone</th>
                    <th style={th}>Secondary Phone</th>
                    <th style={th}>Address</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Payment</th>
                    {/* <th style={th}>Order Status</th> */}
                    <th style={th}>Date</th>
                  </tr>
                </thead>

                {/* TABLE BODY */}
                <tbody>
                  {Object.keys(groupedOrders).map((userId) => {
                    const userOrders = groupedOrders[userId];

                    return (
                      <React.Fragment key={userId}>
                        
                        {/* USER HEADER */}
                        <tr style={{ background: "#E0F2FE" }}>
                          <td colSpan="10" style={{ padding: 12, fontWeight: 700 }}>
                            User ID: {userId}
                          </td>
                        </tr>

                        {userOrders.map((o) => {
                          const type = o.patientDetails?.orderingFor || "unknown";

                          return (
                            <tr
                              key={o._id}
                              style={{ borderBottom: "1px solid #E2E8F0" }}
                            >
                              {/* ORDER ID */}
                              <td style={td}>{o.orderId || "-"}</td>

                              {/* NAME */}
                              <td style={td}>
                                {o.patientDetails?.name || "Unknown"}
                              </td>

                              {/* TYPE */}
                              <td style={td}>
                                <span
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 20,
                                    background:
                                      type === "myself"
                                        ? "#DCFCE7"
                                        : type === "someone"
                                        ? "#FEF3C7"
                                        : "#E5E7EB",
                                    color:
                                      type === "myself"
                                        ? "#166534"
                                        : type === "someone"
                                        ? "#92400E"
                                        : "#374151",
                                    fontWeight: 600,
                                    fontSize: 12,
                                  }}
                                >
                                  {type === "myself"
                                    ? "Myself"
                                    : type === "someone"
                                    ? "Someone"
                                    : "Unknown"}
                                </span>
                              </td>

                              {/* PHONES */}
                              <td style={td}>
                                {o.patientDetails?.phone || o.patientDetails?.primaryPhone || "Not Available"}
                              </td>

                              <td style={td}>
                                {o.patientDetails?.secondaryPhone || "-"}
                              </td>

                              {/* ADDRESS */}
                              <td style={td}>
                                {o.addressDetails
                                  ? `${o.addressDetails.fullAddress}, ${o.addressDetails.city}, ${o.addressDetails.state} - ${o.addressDetails.pincode}`
                                  : "-"}
                              </td>

                              {/* AMOUNT */}
                              <td style={td}>₹{o.totalAmount || 0}</td>

                              {/* PAYMENT */}
                              <td style={td}>
                                <span
                                  style={{
                                    color:
                                      o.paymentStatus === "Paid"
                                        ? "green"
                                        : o.paymentStatus === "Pending"
                                        ? "orange"
                                        : "red",
                                    fontWeight: 600,
                                  }}
                                >
                                  {o.paymentStatus}
                                </span>
                              </td>

                              {/* ORDER STATUS */}
                              {/* <td style={td}>{o.orderStatus || "-"}</td> */}

                              {/* DATE */}
                              <td style={td}>
                                {o.createdAt
                                  ? new Date(o.createdAt).toLocaleDateString()
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* EMPTY STATE */}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="10" style={empty}>
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          )
        }
      />
    </div>
  );
};

/* STYLES */
const th = {
  padding: 12,
  textAlign: "left",
};

const td = {
  padding: 12,
  fontSize: 13,
};

const empty = {
  padding: 30,
  textAlign: "center",
  color: "#64748B",
};

export default PatientsView;