import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Icon } from './Icon';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/products', label: 'Products & Categories', icon: 'box' },
  { to: '/admin/inventory', label: 'Inventory & Stock', icon: 'bag' },
  { to: '/admin/orders', label: 'Customer Orders', icon: 'orders' },
  { to: '/admin/users', label: 'User Accounts', icon: 'users' },
];

const ROUTE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products & Categories',
  '/admin/inventory': 'Inventory & Stock',
  '/admin/orders': 'Customer Orders',
  '/admin/users': 'User Accounts',
};

export const AdminLayout = ({ children }) => {
  const { profile, user, logout } = useAuth();
  const { clearCartState } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const displayName = profile?.fullName || user?.email || 'Store Admin';

  const getInitials = (name) => {
    if (!name) return 'SA';
    const clean = name.trim();
    if (clean.includes('@')) return clean.substring(0, 2).toUpperCase();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.substring(0, 2).toUpperCase();
  };

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Workspace';

  const handleLogout = async () => {
    await logout();
    if (clearCartState) clearCartState();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      {/* ── Aster Admin Dark Navy Sidebar ── */}
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-brand">
          <span className="brand-mark inverse">A</span>
          <span>
            <b>Aster</b>
            <small>Shopkeeper workspace</small>
          </span>
        </Link>

        <nav aria-label="Admin Navigation">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Admin User Badge */}
        <div className="admin-user">
          <span>{getInitials(displayName)}</span>
          <div>
            <b>{displayName}</b>
            <small>Administrator</small>
          </div>
        </div>
      </aside>

      {/* ── Main Area with Clean Top Bar ── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <small>Workspace / {currentTitle}</small>
            <h1>{currentTitle}</h1>
          </div>

          <div className="admin-top-actions">
            <Link to="/" className="btn btn-secondary">
              View storefront
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ fontSize: '12px' }}
            >
              Sign out
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
