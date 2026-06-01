import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = Email, 2 = Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!email.includes('@')) return setError('Please enter a valid email.');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP.');

      setMsg(data.message || 'OTP sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (otp.length < 6) return setError('Please enter a valid 6-digit OTP.');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password reset failed.');

      toast.info('Password reset successfully! You can now login.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem' }}>
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {step === 1 ? 'Enter your email to receive an OTP' : `Enter OTP sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
        
        {msg && (
          <div className="alert alert-success">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{msg}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP}>
            <div className="input-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%' }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Remember your password? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="input-group">
              <label>6-Digit OTP</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" required placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} maxLength="6" style={{ paddingLeft: '2.5rem', width: '100%', letterSpacing: '0.5rem', fontSize: '1.2rem', textAlign: 'center' }} />
              </div>
            </div>

            <div className="input-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="password" required placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ paddingLeft: '2.5rem', width: '100%' }} />
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
