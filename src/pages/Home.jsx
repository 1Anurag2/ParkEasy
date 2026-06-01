import { Link } from 'react-router-dom';
import { Car, ShieldCheck, Clock, Zap, Map, QrCode } from 'lucide-react';
import '../styles/Home.css';

const features = [
  {
    icon: <Car size={40} color="#4F46E5" />,
    title: 'Prime Locations',
    desc: 'Access the best parking spots across floors with real-time availability tracking.'
  },
  {
    icon: <ShieldCheck size={40} color="#10B981" />,
    title: 'Secure & Verified',
    desc: 'Vehicle number verification and admin exit checks ensure your vehicle stays safe.'
  },
  {
    icon: <Clock size={40} color="#f59e0b" />,
    title: 'Flexible Hours',
    desc: 'Book by the hour with live countdown timers and automatic overstay alerts.'
  },
  {
    icon: <QrCode size={40} color="#8b5cf6" />,
    title: 'QR Gate Entry',
    desc: 'Get a QR code on booking. Scan at the gate for seamless entry and exit.'
  },
  {
    icon: <Map size={40} color="#06b6d4" />,
    title: 'Live Parking Map',
    desc: 'Visual floor map showing every slot status in real-time via Socket.IO.'
  },
  {
    icon: <Zap size={40} color="#f97316" />,
    title: 'EV Charging',
    desc: 'Dedicated EV slots with charging station indicators for electric vehicles.'
  },
];

const Home = () => {
  return (
    <div>
      {/* Hero */}
      <div className="container">
        <div className="page-header">
          <div className="hero-badge">
            <Zap size={14} /> Smart Parking Platform
          </div>
          <h1>Premium Parking,<br />Simplified.</h1>
          <p>Find, book, and manage your vehicle parking with our state-of-the-art platform. Secure your spot in seconds.</p>
          <div className="hero-buttons">
            <Link to="/booking" className="btn btn-primary hero-btn">
              <Car size={20} /> Book a Spot Now
            </Link>
            <Link to="/live" className="btn btn-outline hero-btn">
              <Map size={20} /> View Live Map
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="glass stats-container">
          <div className="stats-bar stats-bar-no-margin">
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Parking Spots</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Happy Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">3</span>
              <span className="stat-label">Vehicle Types</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Support</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="features-section">
          <h2 className="section-title">
            Everything You Need
          </h2>
          <p className="section-subtitle">
            A complete smart parking ecosystem
          </p>
          <div className="spot-grid">
            {features.map((f, i) => (
              <div key={i} className="glass spot-card feature-card">
                <div className="feature-icon-wrapper">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
