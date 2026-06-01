import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/BookingPage.css';
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

const BookingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  
  // Custom Date States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(0);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/spots').then(res => res.json()).then(data => setSpots(data.filter(s => s.status !== 'maintenance')));
    
    // Set default dates
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    
    // Format to datetime-local friendly format (YYYY-MM-DDThh:mm)
    const pad = (num) => num.toString().padStart(2, '0');
    const formatDt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    setStartDate(formatDt(now));
    setEndDate(formatDt(later));
    calculateDuration(now, later);
  }, []);

  const calculateDuration = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    if (s && e && e > s) {
      const diffMs = e - s;
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      setDuration(hours);
    } else {
      setDuration(0);
    }
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    calculateDuration(e.target.value, endDate);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    calculateDuration(startDate, e.target.value);
  };

  const handleBookInitiate = (spot) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedSpot(spot);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!vehicleNumber.trim()) {
      toast.info("Vehicle number is required");
      return;
    }
    if (duration <= 0) {
      toast.info("End date must be after start date.");
      return;
    }

    setProcessing(true);
    
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      toast.info('Razorpay SDK failed to load. Are you online?');
      setProcessing(false);
      return;
    }

    const totalCost = (selectedSpot.pricePerHour + (selectedSpot.isEVChargingStation ? selectedSpot.evChargePerHour || 0 : 0)) * duration;

    try {
      // 1. Fetch Razorpay Key
      const keyRes = await fetch('/api/payment/getkey');
      const keyData = await keyRes.json();
      const { key } = keyData;

      // 2. Create Razorpay order on backend
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ amount: totalCost })
      });
      
      const orderData = await res.json();
      if (!orderData.success) throw new Error(orderData.message || 'Order creation failed');
      const { order } = orderData;

      // 3. Initialize Razorpay UI
      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: 'ParkEasy',
        description: `Booking for Spot ${selectedSpot.identifier}`,
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
              // Payment Success, proceed to create booking
              await finalizeBooking(totalCost, data.reference);
            } else {
              toast.info("Payment verification failed. Please try again.");
              setProcessing(false);
            }
          } catch (err) {
            console.error(err);
            toast.info("Error verifying payment");
            setProcessing(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#4F46E5'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.info('Payment Failed: ' + response.error.description);
        setProcessing(false);
      });
      
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.info(err.message || 'Server error creating payment order');
      setProcessing(false);
    }
  };

  const finalizeBooking = async (totalCost, referenceId) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token') 
        },
        body: JSON.stringify({
          spotId: selectedSpot._id,
          vehicleNumber,
          startTime: new Date(startDate),
          endTime: new Date(endDate),
          totalCost
        })
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/payment-success?reference=${referenceId}`);
      } else {
        toast.info(data.message || 'Booking failed');
        setProcessing(false);
      }
    } catch (err) {
      toast.info('Network error or server down');
      setProcessing(false);
    }
  };

  const filteredSpots = spots.filter(s => vehicleFilter === 'all' || s.vehicleType === vehicleFilter);

  const handleRecommendSlot = () => {
    const recommended = filteredSpots.find(s => !s.isBooked && s.status !== 'maintenance');
    if (recommended) {
      handleBookInitiate(recommended);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.info("No available slots match your criteria right now.");
    }
  };

  return (
    <div className="container booking-section">
      <h2 className="booking-title">Available Parking Spots</h2>
      
      <div className="filter-group">
        <button onClick={() => setVehicleFilter('all')} className={`btn ${vehicleFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}>All Vehicles</button>
        <button onClick={() => setVehicleFilter('car')} className={`btn ${vehicleFilter === 'car' ? 'btn-primary' : 'btn-outline'}`}>Cars Only</button>
        <button onClick={() => setVehicleFilter('bike')} className={`btn ${vehicleFilter === 'bike' ? 'btn-primary' : 'btn-outline'}`}>Bikes Only</button>
      </div>

      <div className="suggest-container">
        <button onClick={handleRecommendSlot} className="btn bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
          ✨ Smart Suggest Best Slot
        </button>
      </div>

      <div className="spot-grid">
        {filteredSpots.map(spot => (
          <div key={spot._id} className={`spot-card glass ${spot.isBooked ? 'booked spot-booked-opacity' : ''}`}>
            <div className="spot-header">
              <span className={`spot-status ${spot.isBooked ? 'status-maintenance' : 'status-available'}`}>
                {spot.isBooked ? 'Booked' : 'Available'}
              </span>
              <span className="spot-price">₹{spot.pricePerHour}<span>/hr</span></span>
            </div>
            <h3 className="spot-title-row">
              {spot.identifier}
              <span className="spot-type">{spot.vehicleType || 'car'}</span>
            </h3>
            <p className="spot-location">{spot.location}</p>
            {spot.isEVChargingStation && (
              <p className="spot-ev-charge">
                ⚡ EV Charging: +₹{spot.evChargePerHour}/hr
              </p>
            )}
            
            {showPayment && selectedSpot?._id === spot._id ? (
              <div className="payment-section">
                <div className="input-group">
                  <label>Vehicle Number Plate</label>
                  <input type="text" placeholder="e.g., MH 12 AB 1234" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Start Date & Time</label>
                  <input type="datetime-local" value={startDate} onChange={handleStartDateChange} />
                </div>
                <div className="input-group">
                  <label>End Date & Time</label>
                  <input type="datetime-local" value={endDate} onChange={handleEndDateChange} />
                </div>
                
                <div className="checkout-actions" style={{ marginTop: '1rem' }}>
                  <button onClick={handlePayment} disabled={processing || duration <= 0} className="btn btn-primary flex-1">
                    {processing ? 'Processing...' : (duration > 0 ? `Pay ₹${(spot.pricePerHour + (spot.isEVChargingStation ? spot.evChargePerHour || 0 : 0)) * duration} via Razorpay` : 'Invalid Dates')}
                  </button>
                  <button onClick={() => setShowPayment(false)} className="btn btn-outline flex-1">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => handleBookInitiate(spot)} className="btn btn-primary mt-auto" disabled={spot.isBooked}>
                {spot.isBooked ? 'Unavailable' : 'Book Now'}
              </button>
            )}
          </div>
        ))}
      </div>
      
      {filteredSpots.length === 0 && (
        <div className="empty-state">
          No parking spots match your criteria right now.
        </div>
      )}
    </div>
  );
};

export default BookingPage;
