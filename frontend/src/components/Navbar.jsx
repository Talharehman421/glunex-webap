import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const { pathname } = useLocation();
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
        <img src={require('../assets/glunex-logo.png')} alt="Glunex" className="brand-logo" />
        <span className="brand-text">Glu<strong>nex</strong></span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/assess" className={pathname === '/assess' ? 'active' : ''}>Assessment</Link>
          <Link to="/about" className={pathname === '/about' ? 'active' : ''}>About</Link>
          <Link to="/assess" className="nav-cta">Start Assessment</Link>
        </div>
      </div>
    </nav>
  );
}
