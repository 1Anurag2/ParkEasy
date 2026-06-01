import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, QrCode, FileText, HeadphonesIcon, Ticket, Plus, X } from 'lucide-react';
import '../styles/Dashboard.css';
import { toast } from 'react-toastify';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/* ── Live Countdown Timer ── */
const CountdownTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverstay, setIsOverstay] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) {
        setIsOverstay(true);
        setTimeLeft('Expired');
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (isOverstay) {
    return (
      <div className="countdown-danger">
        <AlertTriangle size={16} />
        Parking time exceeded! Extra charges apply on exit.
      </div>
    );
  }

  return (
    <div className="countdown-ok">
      <Clock size={16} />
      {timeLeft} remaining
    </div>
  );
};

/* ── Main Dashboard ── */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');

  // Form states
  const [showSubForm, setShowSubForm] = useState(false);
  const [subData, setSubData] = useState({ planType: 'monthly', vehicleNumber: '', autoRenew: true });
  const [showCompForm, setShowCompForm] = useState(false);
  const [compData, setCompData] = useState({ title: '', description: '' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const headers = { 'x-auth-token': localStorage.getItem('token') };

    Promise.all([
      fetch('/api/bookings', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/subscriptions/my', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/complaints/my', { headers }).then(r => r.ok ? r.json() : [])
    ])
    .then(([bData, sData, cData]) => {
      setBookings(bData);
      setSubscriptions(sData);
      setComplaints(cData);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE',
      headers: { 'x-auth-token': localStorage.getItem('token') }
    });
    if (res.ok) setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
  };

    const handleBuyPass = async (e) => {
      e.preventDefault();
      if (!subData.vehicleNumber) return toast.info('Vehicle number is required');
      
      const amount = subData.planType === 'monthly' ? 999 : 8999;
      
      try {
        // 1. Fetch Razorpay Key
        const keyRes = await fetch('/api/payment/getkey');
        const keyData = await keyRes.json();
        const { key } = keyData;

        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded) {
          toast.info('Razorpay SDK failed to load. Are you online?');
          return;
        }

        // 2. Create Razorpay order on backend
        const res = await fetch('/api/payment/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
          body: JSON.stringify({ amount })
        });
        
        const orderData = await res.json();
        if (!orderData.success) throw new Error(orderData.message || 'Order creation failed');
        const { order } = orderData;

        // 3. Initialize Razorpay UI
        const options = {
          key: key,
          amount: order.amount,
          currency: order.currency,
          name: 'ParkEasy Pass',
          description: `${subData.planType.toUpperCase()} Parking Pass`,
          order_id: order.id,
          handler: async function (response) {
            try {
              // 4. Verify Payment
              const paymentData = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };
              const verifyRes = await fetch('/api/payment/paymentverification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                body: JSON.stringify(paymentData)
              });
              const data = await verifyRes.json();
              
              if (data.success) {
                // Payment Success, create subscription
                const subRes = await fetch('/api/subscriptions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
                  body: JSON.stringify({
                    ...subData,
                    paymentStatus: 'paid',
                    razorpayPaymentId: data.reference,
                    razorpayOrderId: response.razorpay_order_id
                  })
                });
                if (subRes.ok) {
                  const newSub = await subRes.json();
                  setSubscriptions([...subscriptions, newSub]);
                  setShowSubForm(false);
                  setSubData({ planType: 'monthly', vehicleNumber: '', autoRenew: true });
                  toast.info('Subscription active! Payment Reference: ' + data.reference);
                } else {
                  toast.info('Payment was successful but failed to activate subscription. Contact support.');
                }
              } else {
                toast.info("Payment verification failed. Please try again.");
              }
            } catch (err) {
              console.error(err);
              toast.info("Error verifying payment");
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: {
            color: '#10B981'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          toast.info('Payment Failed: ' + response.error.description);
        });
        
        rzp.open();
      } catch (err) {
        console.error(err);
        toast.info(err.message || 'Server error creating payment order');
      }
    };

  const handleRaiseComplaint = async (e) => {
    e.preventDefault();
    if (!compData.title || !compData.description) return toast.info('All fields are required');
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
      body: JSON.stringify(compData)
    });
    if (res.ok) {
      const newComp = await res.json();
      setComplaints([...complaints, newComp]);
      setShowCompForm(false);
      setCompData({ title: '', description: '' });
      toast.info('Complaint raised successfully!');
    }
  };

  if (loading) return (
    <div className="dashboard-loader">
      <div className="spinner"></div>
    </div>
  );

  const tabs = [
    { key: 'bookings', label: 'My Bookings', icon: <Ticket size={16} /> },
    { key: 'subscriptions', label: 'My Passes', icon: <FileText size={16} /> },
    { key: 'support', label: 'Support', icon: <HeadphonesIcon size={16} /> },
  ];

  return (
    <div className="dashboard-section">
      <div className="container">
        <h2 className="dashboard-title">My Dashboard</h2>
        <p className="dashboard-subtitle">Welcome back, {user?.name}</p>

        {/* Tab Bar */}
        <div className="dashboard-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`${activeTab === t.key ? 'btn btn-primary' : 'btn btn-outline'} dashboard-tab-btn`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div>
            {bookings.length === 0 ? (
              <div className="glass empty-bookings">
                <Ticket size={48} className="empty-icon" />
                <p>No bookings yet. <a href="/booking" className="booking-link">Book a spot now!</a></p>
              </div>
            ) : (
              <div className="booking-list">
                {bookings.map(b => (
                  <div key={b._id} className="glass booking-card">
                    <div className="booking-card-inner">
                      {/* Left Info */}
                      <div className="booking-info-left">
                        <div className="booking-header">
                          <h3 className="booking-spot-title">
                            Spot {b.spot?.identifier || 'N/A'}
                          </h3>
                          <span className={`booking-status ${b.status === 'active' ? 'booking-status-active' : 'booking-status-cancelled'}`}>
                            {b.status}
                          </span>
                        </div>

                        <p className="booking-plate">
                          🚗 Plate: {b.vehicleNumber}
                        </p>
                        <p className="booking-detail">
                          📍 Floor {b.spot?.floor || '—'} · {b.spot?.location || '—'}
                        </p>
                        <p className="booking-detail">
                          🕐 {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}
                        </p>
                        <p className="booking-cost">
                          ₹{b.totalCost} base charge
                        </p>

                        {b.status === 'active' && <CountdownTimer endTime={b.endTime} />}

                        {b.status === 'active' && (
                          <div className="info-banner">
                            ℹ️ To exit, show your QR code or vehicle plate to Admin at the gate.
                          </div>
                        )}

                        {b.status === 'active' && (
                          <button
                            onClick={() => handleCancelBooking(b._id)}
                            className="btn btn-danger dashboard-tab-btn"
                            style={{ marginTop: '1rem' }}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>

                      {/* QR Code */}
                      {b.status === 'active' && b.qrCode && (
                        <div className="booking-qr-wrapper">
                          <div className="booking-qr-bg">
                            <img src={b.qrCode} alt="QR Code" className="booking-qr-img" />
                          </div>
                          <span className="booking-qr-text">
                            <QrCode size={12} /> Scan at Gate
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="glass dashboard-panel">
            <div className="panel-header">
              <h3 className="panel-title">Monthly Parking Pass</h3>
              <button onClick={() => setShowSubForm(!showSubForm)} className="btn btn-primary dashboard-tab-btn">
                {showSubForm ? 'Close' : 'Buy Pass'}
              </button>
            </div>

            {showSubForm && (
              <div className="panel-form">
                <h4 className="form-title">Purchase New Pass</h4>
                <form onSubmit={handleBuyPass}>
                  <div className="input-group">
                    <label>Plan Type</label>
                    <select value={subData.planType} onChange={e => setSubData({...subData, planType: e.target.value})}>
                      <option value="monthly">Monthly (₹999/mo)</option>
                      <option value="yearly">Yearly (₹8999/yr)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Vehicle Number</label>
                    <input required type="text" placeholder="MH 12 AB 1234" value={subData.vehicleNumber} onChange={e => setSubData({...subData, vehicleNumber: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Pay & Activate</button>
                </form>
              </div>
            )}

            {subscriptions.length === 0 ? (
              <div className="empty-bookings">
                <FileText size={40} className="empty-icon" />
                <p>No active subscriptions yet.</p>
              </div>
            ) : (
              <div className="grid-cards">
                {subscriptions.map(s => (
                  <div key={s._id} className="pass-card">
                    <div className="pass-title">{s.planType} Pass</div>
                    <div className="pass-vehicle">🚗 {s.vehicleNumber}</div>
                    <div className="pass-date">Valid till: {new Date(s.endDate).toLocaleDateString()}</div>
                    {s.assignedSpot && s.assignedSpot.identifier && (
                      <div className="pass-spot" style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#10B981' }}>
                        📍 Assigned Spot: {s.assignedSpot.identifier}
                      </div>
                    )}
                    <span className={`pass-status ${s.status === 'active' ? 'pass-status-active' : 'pass-status-inactive'}`}>
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="glass dashboard-panel">
            <div className="panel-header">
              <h3 className="panel-title">Support Tickets</h3>
              <button onClick={() => setShowCompForm(!showCompForm)} className="btn btn-secondary dashboard-tab-btn">
                {showCompForm ? 'Close' : 'Raise Complaint'}
              </button>
            </div>

            {showCompForm && (
              <div className="panel-form">
                <h4 className="form-title">New Complaint</h4>
                <form onSubmit={handleRaiseComplaint}>
                  <div className="input-group">
                    <label>Title</label>
                    <input required type="text" placeholder="E.g., Payment deducted twice" value={compData.title} onChange={e => setCompData({...compData, title: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea required placeholder="Describe your issue..." value={compData.description} onChange={e => setCompData({...compData, description: e.target.value})} rows={4} className="full-width" />
                  </div>
                  <button type="submit" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Submit Ticket</button>
                </form>
              </div>
            )}

            {complaints.length === 0 ? (
              <div className="empty-bookings">
                <HeadphonesIcon size={40} className="empty-icon" />
                <p>No open tickets. Need help? Raise a complaint above.</p>
              </div>
            ) : (
              <div className="booking-list">
                {complaints.map(c => (
                  <div key={c._id} className="ticket-card">
                    <div className="ticket-header">
                      <h4 className="ticket-title">{c.title}</h4>
                      <span className={`ticket-status ${c.status === 'open' ? 'ticket-status-open' : 'ticket-status-closed'}`}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="ticket-desc">{c.description}</p>
                    <p className="ticket-date">Submitted: {new Date(c.createdAt).toLocaleDateString()}</p>
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

export default Dashboard;
