import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  UserPlus,
  KeyRound,
  Camera,
} from "lucide-react";
import "../styles/Auth.css";

const Register = () => {
  const [step, setStep] = useState(1); // 1 = Details, 2 = Camera, 3 = OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [photo, setPhoto] = useState(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle camera start
  useEffect(() => {
    if (step === 2) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(
        "Camera access denied or unavailable. You must allow camera access to register.",
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      const dataUrl = canvasRef.current.toDataURL("image/jpeg");
      setPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera();
  };

  const handleNextToCamera = (e) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 3)
      return setError("Full name must be at least 3 characters.");
    if (!email.includes("@") || !email.includes("."))
      return setError("Please enter a valid email address.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setStep(2); // Move to camera step
  };

  const handleRegister = async () => {
    if (!photo) return setError("Please capture a photo for identification.");

    setError("");
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, photo }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      setMsg(data.message || "OTP sent to your email.");
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.length < 6) return setError("Please enter a valid 6-digit OTP.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");

      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className="glass auth-card"
        style={{ maxWidth: step === 2 ? 500 : 420 }}
      >
        <div className="auth-header">
          <h2 className="auth-title">
            {step === 1 && "Create Account"}
            {step === 2 && "Identity Verification"}
            {step === 3 && "Verify Email"}
          </h2>
          <p className="auth-subtitle">
            {step === 1 && "Start parking smarter today"}
            {step === 2 && "Capture a live photo for security"}
            {step === 3 && `Enter the OTP sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="alert alert-success">
            <AlertCircle size={18} className="alert-icon" />
            <span>{msg}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleNextToCamera}>
            <div className="input-group">
              <label>Full Name</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-with-icon"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-with-icon"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-with-icon"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-with-icon"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary auth-btn">
              Continue <UserPlus size={18} style={{ marginLeft: 6 }} />
            </button>

            <p className="auth-footer">
              Already have an account?{" "}
              <Link to="/login" className="auth-link-bold">
                Sign in
              </Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            {!photo ? (
              <>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "2px solid var(--border)",
                    background: "black",
                    position: "relative",
                    aspectRatio: "4/3",
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <button
                  onClick={capturePhoto}
                  className="btn btn-secondary auth-btn"
                  style={{ width: "100%" }}
                  disabled={!stream}
                >
                  <Camera size={18} /> Capture Photo
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "2px solid var(--primary)",
                  }}
                >
                  <img
                    src={photo}
                    alt="Captured identity"
                    style={{ width: "100%", display: "block" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
                  <button
                    onClick={handleRetake}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleRegister}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={loading}
                  >
                    {loading ? "Sending OTP..." : "Register"}
                  </button>
                </div>
              </>
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <button
              onClick={() => setStep(1)}
              className="auth-btn-link"
              style={{ marginTop: "1rem" }}
            >
              Back to Details
            </button>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group">
              <label>6-Digit OTP</label>
              <div className="input-icon-wrapper">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength="6"
                  className="input-with-icon-otp"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-btn"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <p className="auth-footer">
              Didn't receive email?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPhoto(null);
                }}
                className="auth-btn-link"
              >
                Change Email
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
