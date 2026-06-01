import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Zap, Car, Bike } from "lucide-react";
import "../styles/LiveMap.css";

const LiveMap = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0 });

  const fetchSpots = async () => {
    try {
      const res = await fetch("/api/spots");
      if (res.ok) {
        const data = await res.json();
        setSpots(data);
        setStats({
          total: data.length,
          available: data.filter((s) => !s.isBooked).length,
          occupied: data.filter((s) => s.isBooked).length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
    const socket = io("http://localhost:5001", { transports: ["websocket"] });
    socket.on("spots_updated", fetchSpots);
    return () => socket.disconnect();
  }, []);

  const floors = [...new Set(spots.map((s) => s.floor || "1"))].sort();

  const vehicleIcon = (type) => {
    if (type === "bike") return "🏍️";
    if (type === "ev") return "⚡";
    return (
      <img
  src="/car_svg.svg"
  alt="Car"
  style={{
    width: "28px",
    height: "28px",
    objectFit: "contain"
  }}
/>
    );
  };

  return (
    <div className="live-map-section">
      <div className="container">
        <h2 className="live-map-title">Live Parking Map</h2>
        <p className="live-map-subtitle">
          Real-time slot availability — updates automatically
        </p>

        {/* Stats */}
        <div className="glass stats-card">
          <div className="stat-block">
            <div className="stat-total">{stats.total}</div>
            <div className="stat-label-small">Total Slots</div>
          </div>
          <div className="stat-block">
            <div className="stat-available">{stats.available}</div>
            <div className="stat-label-small">Available</div>
          </div>
          <div className="stat-block">
            <div className="stat-occupied">{stats.occupied}</div>
            <div className="stat-label-small">Occupied</div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend-container">
          <div className="legend-item">
            <div className="legend-box-available"></div>
            Available
          </div>
          <div className="legend-item">
            <div className="legend-box-occupied"></div>
            Occupied
          </div>
          <div className="legend-item">
            <img src="/car_svg.svg" alt="" /> Car &nbsp;|&nbsp; <span>🏍️</span>{" "}
            Bike &nbsp;|&nbsp; <span>⚡</span> EV
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-centered"></div>
            Loading live map...
          </div>
        ) : spots.length === 0 ? (
          <div className="glass empty-state">
            No spots found. Admin needs to add parking spots first.
          </div>
        ) : (
          floors.map((floor) => {
            const floorSpots = spots.filter((s) => (s.floor || "1") === floor);
            return (
              <div key={floor} className="glass floor-card">
                <h3 className="floor-header">
                  Floor {floor}
                  <span className="floor-availability">
                    {floorSpots.filter((s) => !s.isBooked).length}/
                    {floorSpots.length} available
                  </span>
                </h3>
                <div className="floor-grid">
                  {floorSpots.map((spot) => (
                    <div
                      key={spot._id}
                      title={`${spot.identifier} - ${spot.isBooked ? "Occupied" : "Available"} - ${spot.vehicleType || "car"}`}
                      className={`spot-box ${spot.isBooked ? "spot-box-occupied" : "spot-box-available"}`}
                    >
                      <span className="spot-icon">
                        {vehicleIcon(spot.vehicleType)}
                      </span>
                      <span
                        className={
                          spot.isBooked
                            ? "spot-id-occupied"
                            : "spot-id-available"
                        }
                      >
                        {spot.identifier}
                      </span>
                      <span className="spot-status">
                        {spot.isBooked ? "Busy" : "Free"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveMap;
