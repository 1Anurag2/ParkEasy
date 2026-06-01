import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CarFront, LogOut, User, Map, LayoutDashboard, ScanLine, Sun, Moon } from 'lucide-react';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <img src="/logo.png" alt="Logo" />
        <span>ParkEasy</span>
      </Link>

      <div className="nav-links">
        <button onClick={toggleTheme} className="nav-link" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link to="/live" className="nav-link">
          <Map size={16} /> Live Map
        </Link>
        <Link to="/booking" className="nav-link">
          <CarFront size={16} /> Find Spot
        </Link>

        {user ? (
          <>
            <Link
              to={user.role === 'admin' || user.role === 'manager' ? '/admin' : '/dashboard'}
              className="nav-link"
            >
              {user.role === 'admin' || user.role === 'manager'
                ? <LayoutDashboard size={16} />
                : <User size={16} />}
              {user.name}
            </Link>

            {(user.role === 'admin' || user.role === 'manager') && (
              <Link to="/gate" className="nav-link nav-gate-link">
                <ScanLine size={16} /> Gate
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="btn btn-outline nav-logout-btn"
            >
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="btn btn-primary nav-signup-btn">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
