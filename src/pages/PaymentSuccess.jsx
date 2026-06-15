import React from "react";
import { useSearchParams, Link } from "react-router-dom";
// import '../styles/PaymentSuccess.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const referenceNum = searchParams.get("reference");

  return (
    <div
      className="container payment-success-container"
      style={{ textAlign: "center", padding: "5rem 2rem" }}
    >
      <div
        className="glass"
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "3rem",
          borderRadius: "1rem",
        }}
      >
        <h1
          style={{ color: "#4CAF50", marginBottom: "1rem", fontSize: "2.5rem" }}
        >
          Payment Successful! 
        </h1>
        <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
          Your booking has been confirmed and your payment was successful.
        </p>
        <p
          style={{
            fontSize: "1rem",
            marginBottom: "2rem",
            background: "rgba(255,255,255,0.1)",
            padding: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <strong>Reference No:</strong> <br />
          {referenceNum}
        </p>
        <Link
          to="/dashboard"
          className="btn btn-primary"
          style={{ display: "inline-block", textDecoration: "none" }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
