import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Camera, ScanLine, CheckCircle, XCircle, Info } from 'lucide-react';
import '../styles/GateScanner.css';

const GateScanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState('');
  const [actualVehicleNumber, setActualVehicleNumber] = useState('');
  const [result, setResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    navigate('/');
    return null;
  }

  const handleVerify = async () => {
    if (!bookingId.trim() || !actualVehicleNumber.trim()) {
      setResult({ success: false, message: 'Please enter both Booking ID and Actual Vehicle Number.' });
      return;
    }
    setVerifyLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId.trim()}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ actualVehicleNumber })
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          message: 'Vehicle exit verified successfully! Gate Opened.',
          cost: data.finalCost,
          penalty: data.penalty,
          overstayHours: data.overstayHours
        });
        setBookingId('');
        setActualVehicleNumber('');
      } else {
        setResult({ success: false, message: data.message || 'Verification failed.' });
      }
    } catch {
      setResult({ success: false, message: 'Cannot connect to server.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleOCRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          },
          body: JSON.stringify({ imageBase64: reader.result })
        });
        const data = await res.json();
        if (res.ok) {
          setActualVehicleNumber(data.text);
          setResult({ success: true, message: `AI detected plate text: "${data.text}".` });
        } else {
          setResult({ success: false, message: data.message || 'OCR failed.' });
        }
      } catch {
        setResult({ success: false, message: 'OCR server error.' });
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="gate-section">
      <div className="container">
        <h2 className="gate-title">
          Gate Scanner
        </h2>
        <p className="gate-subtitle">
          Verify vehicle exit and calculate billing
        </p>

        <div className="gate-container">
          <div className="glass gate-card">
            <div className="gate-info">
              <Info size={18} color="var(--primary)" className="gate-info-icon" />
              <p className="gate-info-text">
                Enter the Booking ID from the customer's QR code, and physically verify the vehicle number (or use OCR).
              </p>
            </div>

            <div className="input-group">
              <label>Booking ID (from QR)</label>
              <input
                type="text"
                placeholder="Paste booking ID here..."
                value={bookingId}
                onChange={e => setBookingId(e.target.value)}
                className="full-width"
              />
            </div>

            <div className="input-group">
              <label>Actual Vehicle Number Plate</label>
              <input
                type="text"
                placeholder="e.g., MH 12 AB 1234"
                value={actualVehicleNumber}
                onChange={e => setActualVehicleNumber(e.target.value)}
                className="full-width"
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
              />
            </div>

            <div className="gate-actions">
              <button
                onClick={handleVerify}
                className="btn btn-primary gate-action-btn"
                disabled={verifyLoading}
              >
                <ScanLine size={18} />
                {verifyLoading ? 'Verifying...' : 'Verify & Open Gate'}
              </button>

              <button
                onClick={() => fileInputRef.current.click()}
                className="btn btn-outline gate-action-btn"
                disabled={ocrLoading}
              >
                <Camera size={18} />
                {ocrLoading ? 'Scanning...' : 'Scan Plate (OCR)'}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleOCRUpload}
                className="hidden"
              />
            </div>

            {/* Result */}
            {result && (
              <div className={`gate-result ${result.success ? 'gate-result-success' : 'gate-result-error'}`}>
                <div className="gate-result-header">
                  {result.success
                    ? <CheckCircle size={20} color="#34d399" />
                    : <XCircle size={20} color="#f87171" />}
                  <span className={result.success ? 'gate-result-status-success' : 'gate-result-status-error'}>
                    {result.success ? 'Success' : 'Gate Closed'}
                  </span>
                </div>
                <p className="gate-result-message" style={result.success && result.cost !== undefined ? { marginBottom: '0.75rem' } : {}}>
                  {result.message}
                </p>
                {result.success && result.cost !== undefined && (
                  <div className="gate-billing">
                    {result.penalty > 0 && (
                      <p className="gate-penalty">
                        ⚠️ Overstay: {result.overstayHours}h — Penalty: ₹{result.penalty}
                      </p>
                    )}
                    <p className="gate-total">
                      Total to Collect: ₹{result.cost}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass gate-log-card">
            <h4 className="gate-log-title">Gate Activity Log</h4>
            <p className="gate-log-text">
              Verification history will appear here during your session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GateScanner;
