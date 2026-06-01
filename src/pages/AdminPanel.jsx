import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart2,
  MapPin,
  ScanLine,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle,
  FileText,
  Zap,
} from "lucide-react";
import "../styles/AdminPanel.css";

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");
  const [spots, setSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [floorSearch, setFloorSearch] = useState("");
  const [newSpot, setNewSpot] = useState({
    identifier: "",
    location: "Zone A",
    floor: "Floor 1",
    vehicleType: "car",
    isEVChargingStation: false,
    evChargePerHour: 0,
    pricePerHour: 50,
  });
  const [msg, setMsg] = useState("");

  // Forms
  const [replyText, setReplyText] = useState({});
  const [assignSpotId, setAssignSpotId] = useState({});

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    const headers = { "x-auth-token": localStorage.getItem("token") };
    Promise.all([
      fetch("/api/spots", { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/bookings", { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/complaints/all", { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
      fetch("/api/subscriptions/all", { headers }).then((r) =>
        r.ok ? r.json() : [],
      ),
    ]).then(([sData, bData, cData, subData]) => {
      setSpots(sData);
      setBookings(bData);
      setComplaints(cData);
      setSubscriptions(subData);
    });
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/spots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify(newSpot),
    });
    if (res.ok) {
      setNewSpot({
        identifier: "",
        location: "Zone A",
        floor: "Floor 1",
        vehicleType: "car",
        isEVChargingStation: false,
        evChargePerHour: 0,
        pricePerHour: 50,
      });
      fetchData();
      setMsg("Spot added successfully!");
    } else {
      const d = await res.json();
      setMsg(d.message || "Failed to add spot.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this spot?")) return;
    const res = await fetch(`/api/spots/${id}`, {
      method: "DELETE",
      headers: { "x-auth-token": localStorage.getItem("token") },
    });
    if (res.ok) fetchData();
  };

  const handleVerifyExit = async (id) => {
    if (!window.confirm("Confirm exit verification?")) return;
    const res = await fetch(`/api/bookings/${id}/checkout`, {
      method: "POST",
      headers: { "x-auth-token": localStorage.getItem("token") },
    });
    const data = await res.json();
    if (res.ok) {
      const msg =
        data.penalty > 0
          ? `✅ Exit verified! Overstay: ${data.overstayHours}h. Penalty: ₹${data.penalty}. Total: ₹${data.finalCost}`
          : "✅ Exit verified. Spot is now available.";
      toast.info(msg);
      fetchData();
    } else {
      toast.info(data.message || "Verification failed.");
    }
  };

  const handleVerifyExitSubscription = async (id) => {
    if (!window.confirm("Confirm exit and free spot for this Pass?")) return;
    const res = await fetch(`/api/subscriptions/${id}/checkout`, {
      method: "POST",
      headers: { "x-auth-token": localStorage.getItem("token") },
    });
    const data = await res.json();
    if (res.ok) {
      toast.info(data.message || "✅ Exit verified. Spot is now available.");
      fetchData();
    } else {
      toast.info(data.message || "Verification failed.");
    }
  };

  const handleResolveComplaint = async (id) => {
    const text = replyText[id] || "";
    if (!text.trim())
      return toast.info("Please enter a reply to resolve the complaint.");
    const res = await fetch(`/api/complaints/${id}/resolve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ adminReply: text }),
    });
    if (res.ok) {
      toast.info("Complaint resolved successfully!");
      fetchData();
    }
  };

  const handleAssignSpot = async (id) => {
    const spotId = assignSpotId[id];
    if (!spotId) return toast.info("Please select a spot to assign.");
    const res = await fetch(`/api/subscriptions/${id}/assign`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({ spotId }),
    });
    if (res.ok) {
      toast.info("Spot assigned successfully!");
      fetchData();
    }
  };

  const filteredSpots = spots.filter(
    (s) =>
      !floorSearch ||
      String(s.floor).toLowerCase().includes(floorSearch.toLowerCase()),
  );
  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((acc, b) => acc + (b.totalCost || 0) + (b.penalty || 0), 0);
  const activeBookings = bookings.filter((b) => b.status === "active");

  const getWeeklyData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const data = days.map((d) => ({ day: d, revenue: 0, bookings: 0 }));
    bookings.forEach((b) => {
      const date = new Date(b.createdAt || b.startTime);
      const dayName = days[date.getDay()];
      const d = data.find((x) => x.day === dayName);
      if (d) {
        d.bookings += 1;
        if (b.status === "completed")
          d.revenue += (b.totalCost || 0) + (b.penalty || 0);
      }
    });
    return data;
  };

  const weekData = getWeeklyData();

  const tabs = [
    { key: "analytics", label: "Analytics", icon: <BarChart2 size={16} /> },
    { key: "spots", label: "Manage Spots", icon: <MapPin size={16} /> },
    { key: "bookings", label: "Gate & Bookings", icon: <ScanLine size={16} /> },
    { key: "subscriptions", label: "Passes", icon: <FileText size={16} /> },
    {
      key: "complaints",
      label: "Complaints",
      icon: <MessageSquare size={16} />,
    },
  ];

  return (
    <div className="admin-section">
      <div className="container">
        <h2 className="admin-title">Admin Dashboard</h2>
        <p className="admin-subtitle">Manage your parking facility</p>

        {/* Tabs */}
        <div className="admin-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`${activeTab === t.key ? "btn btn-primary" : "btn btn-outline"} admin-tab-btn`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div>
            <div className="stats-grid">
              {[
                { label: "Total Spots", value: spots.length, color: "#4F46E5" },
                {
                  label: "Available",
                  value: spots.filter((s) => !s.isBooked).length,
                  color: "#10B981",
                },
                {
                  label: "Active Bookings",
                  value: activeBookings.length,
                  color: "#f59e0b",
                },
                {
                  label: "Revenue",
                  value: `₹${totalRevenue}`,
                  color: "#8b5cf6",
                },
              ].map((k) => (
                <div key={k.label} className="glass stat-card">
                  <div className="stat-val" style={{ color: k.color }}>
                    {k.value}
                  </div>
                  <div className="stat-label">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="glass chart-card">
                <h4 className="chart-title">Weekly Revenue (₹)</h4>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <LineChart data={weekData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#1e293b",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4F46E5"
                        strokeWidth={3}
                        dot={{ fill: "#4F46E5", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass chart-card">
                <h4 className="chart-title">Daily Bookings</h4>
                <div className="chart-container">
                  <ResponsiveContainer>
                    <BarChart data={weekData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#1e293b",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                        }}
                      />
                      <Bar
                        dataKey="bookings"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Earning per booking table */}
            <div className="glass earnings-card">
              <h4 className="earnings-title">Earnings Breakdown</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr className="tr-border">
                      <th>Booking ID</th>
                      <th>User</th>
                      <th>Spot</th>
                      <th>Status</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings
                      .slice()
                      .reverse()
                      .map((b) => (
                        <tr key={b._id} className="tr-border">
                          <td className="td-id">{b._id.slice(-6)}</td>
                          <td className="td-white">
                            {b.user?.name || "Unknown"}
                          </td>
                          <td className="td-white">
                            {b.spot?.identifier || "N/A"}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${b.status === "completed" ? "status-completed" : b.status === "active" ? "status-active" : "status-cancelled"}`}
                            >
                              {b.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="td-rev">
                            {b.status === "completed"
                              ? `₹${(b.totalCost || 0) + (b.penalty || 0)}`
                              : "Pending"}
                          </td>
                        </tr>
                      ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan="5" className="td-empty">
                          No bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Spots Tab */}
        {activeTab === "spots" && (
          <div>
            <div className="glass panel-section">
              <h3 className="panel-header-flex">
                <Plus size={20} color="var(--primary)" /> Add New Parking Spot
              </h3>
              {msg && (
                <div
                  className={`alert ${msg.includes("success") ? "alert-success" : "alert-error"}`}
                  style={{ marginBottom: "1rem" }}
                >
                  {msg}
                </div>
              )}
              <form onSubmit={handleAddSpot}>
                <div className="add-spot-form-grid">
                  <div className="input-group input-mb0">
                    <label>Spot ID (e.g., A1)</label>
                    <input
                      required
                      placeholder="A1"
                      value={newSpot.identifier}
                      onChange={(e) =>
                        setNewSpot({ ...newSpot, identifier: e.target.value })
                      }
                    />
                  </div>
                  <div className="input-group input-mb0">
                    <label>Location (Zone)</label>
                    <select
                      value={newSpot.location}
                      onChange={(e) =>
                        setNewSpot({ ...newSpot, location: e.target.value })
                      }
                    >
                      <option value="Zone A">Zone A</option>
                      <option value="Zone B">Zone B</option>
                      <option value="Zone C">Zone C</option>
                      <option value="Zone D">Zone D</option>
                    </select>
                  </div>
                  <div className="input-group input-mb0">
                    <label>Floor</label>
                    <select
                      value={newSpot.floor}
                      onChange={(e) =>
                        setNewSpot({ ...newSpot, floor: e.target.value })
                      }
                    >
                      <option value="Floor 1">Floor 1</option>
                      <option value="Floor 2">Floor 2</option>
                      <option value="Floor 3">Floor 3</option>
                      <option value="Floor 4">Floor 4</option>
                      <option value="Floor 5">Floor 5</option>
                    </select>
                  </div>
                  <div className="input-group input-mb0">
                    <label>Vehicle Type</label>
                    <select
                      value={newSpot.vehicleType}
                      onChange={(e) =>
                        setNewSpot({ ...newSpot, vehicleType: e.target.value })
                      }
                    >
                      <option value="car">Car</option>
                      <option value="bike">Bike</option>
                      <option value="ev">EV</option>
                    </select>
                  </div>
                  <div className="input-group input-mb0">
                    <label>Price/Hour (₹)</label>
                    <input
                      type="number"
                      required
                      value={newSpot.pricePerHour}
                      onChange={(e) =>
                        setNewSpot({
                          ...newSpot,
                          pricePerHour: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="ev-check">
                    <label className="ev-check-label">
                      <input
                        type="checkbox"
                        checked={newSpot.isEVChargingStation}
                        onChange={(e) =>
                          setNewSpot({
                            ...newSpot,
                            isEVChargingStation: e.target.checked,
                          })
                        }
                        className="ev-checkbox"
                      />
                      Has EV Charging
                    </label>
                    {newSpot.isEVChargingStation && (
                      <div className="input-group input-mb0">
                        <label>EV Charge/Hour (₹)</label>
                        <input
                          type="number"
                          required
                          value={newSpot.evChargePerHour}
                          onChange={(e) =>
                            setNewSpot({
                              ...newSpot,
                              evChargePerHour: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary add-btn">
                  <Plus size={18} /> Add Spot
                </button>
              </form>
            </div>

            <div className="glass spots-list-card">
              <h3 className="spots-list-title">All Spots</h3>
              <div className="spot-grid spots-grid-np">
                {filteredSpots.map((spot) => (
                  <div
                    key={spot._id}
                    className={`glass spot-card ${spot.isBooked ? "spot-card-border-booked" : "spot-card-border-free"}`}
                  >
                    <div className="spot-header">
                      <span
                        className={`spot-status ${spot.isBooked ? "status-maintenance" : "status-available"}`}
                      >
                        {spot.isBooked ? "Booked" : "Free"}
                      </span>
                      <span className="spot-price">
                        ₹{spot.pricePerHour}
                        <span>/hr</span>
                      </span>
                    </div>
                    <h3 className="spot-card-title">{spot.identifier}</h3>
                    <p className="spot-card-loc">
                      {spot.location} - {spot.floor}
                    </p>

                    {spot.isEVChargingStation && (
                      <p className="spot-card-ev">
                        <Zap size={14} /> EV Charge: ₹{spot.evChargePerHour}/hr
                      </p>
                    )}

                    <button
                      onClick={() => handleDelete(spot._id)}
                      className="btn btn-danger spot-card-btn"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div>
            <div className="glass panel-section">
              <h3 className="spots-list-title">Active Bookings — Gate Exit</h3>
              {activeBookings.length === 0 ? (
                <p className="empty-msg">No active bookings.</p>
              ) : (
                <div className="bookings-list">
                  {activeBookings.map((b) => (
                    <div key={b._id} className="booking-item">
                      <div>
                        <h4 className="bk-user">
                          {b.user?.name || "Customer"}
                        </h4>
                        <p className="bk-plate">🚗 {b.vehicleNumber}</p>
                        <p className="bk-detail">
                          Spot {b.spot?.identifier} (Ends:{" "}
                          {new Date(b.endTime).toLocaleString()})
                        </p>
                      </div>
                      <button
                        onClick={() => handleVerifyExit(b._id)}
                        className="btn btn-secondary bk-btn"
                      >
                        <CheckCircle size={16} /> Verify Exit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="glass panel-section">
            <h3 className="spots-list-title">Manage Passes (Monthly/Yearly)</h3>
            {subscriptions.length === 0 ? (
              <p className="empty-msg">No active subscriptions.</p>
            ) : (
              <div className="subs-list">
                {subscriptions.map((s) => (
                  <div key={s._id} className="sub-item">
                    <div>
                      <h4 className="sub-user">
                        {s.user?.name || "User"}{" "}
                        <span className="sub-email">({s.user?.email})</span>
                      </h4>
                      <p className="sub-plan">
                        {s.planType.toUpperCase()} PASS - 🚗 {s.vehicleNumber}
                      </p>
                      <p className="sub-assign">
                      Assigned Spot:{" "}
                      <strong
                        className={
                          s.assignedSpot ? "sub-assign-ok" : "sub-assign-none"
                        }
                      >
                        {s.assignedSpot ? s.assignedSpot.identifier : "None"}
                      </strong>
                    </p>
                    <p className="sub-assign">
                      Payment:{" "}
                      <span className={s.paymentStatus === 'paid' ? 'status-completed' : 'status-active'} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', background: s.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: s.paymentStatus === 'paid' ? '#10B981' : '#f59e0b' }}>
                        {s.paymentStatus.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div className="sub-actions">
                    {s.status === 'active' && (
                      <button
                        onClick={() => handleVerifyExitSubscription(s._id)}
                        className="btn btn-secondary bk-btn"
                        style={{ marginBottom: '0.5rem', width: '100%' }}
                      >
                        <CheckCircle size={16} /> Verify & Exit
                      </button>
                    )}
                    <select
                        className="input-group sub-select"
                        value={assignSpotId[s._id] || ""}
                        onChange={(e) =>
                          setAssignSpotId({
                            ...assignSpotId,
                            [s._id]: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Spot</option>
                        {spots
                          .filter((sp) => !sp.isBooked)
                          .map((sp) => (
                            <option key={sp._id} value={sp._id}>
                              {sp.identifier} ({sp.vehicleType})
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAssignSpot(s._id)}
                        className="btn btn-primary sub-btn"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Complaints Tab */}
        {activeTab === "complaints" && (
          <div className="glass panel-section">
            <h3 className="panel-header-flex">
              <MessageSquare size={20} /> Support Tickets
            </h3>
            {complaints.length === 0 ? (
              <p className="empty-msg">No open tickets.</p>
            ) : (
              <div className="comp-list">
                {complaints.map((c) => (
                  <div key={c._id} className="comp-item">
                    <div className="comp-header">
                      <h4 className="comp-title">
                        {c.title}{" "}
                        <span className="comp-user">by {c.user?.name}</span>
                      </h4>
                      <span
                        className={`comp-status ${c.status === "open" ? "comp-open" : "comp-closed"}`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="comp-desc">{c.description}</p>

                    {c.status === "open" ? (
                      <div className="comp-actions">
                        <input
                          type="text"
                          placeholder="Write a reply to resolve..."
                          className="input-group comp-input"
                          value={replyText[c._id] || ""}
                          onChange={(e) =>
                            setReplyText({
                              ...replyText,
                              [c._id]: e.target.value,
                            })
                          }
                        />
                        <button
                          onClick={() => handleResolveComplaint(c._id)}
                          className="btn btn-secondary comp-btn"
                        >
                          Resolve
                        </button>
                      </div>
                    ) : (
                      <div className="comp-reply-box">
                        <strong className="comp-reply-title">
                          Admin Reply:
                        </strong>
                        <p className="comp-reply-text">{c.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
