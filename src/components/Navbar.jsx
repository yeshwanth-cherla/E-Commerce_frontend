import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Navbar = () => {
  const { user, profile, isAdmin, isAuthenticated, logout } = useAuth();
  const { cartCount, clearCartState } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    clearCartState();
    navigate('/login');
  };

  const displayName = profile?.fullName || user?.email || 'Account';

  return (
    <header className="navbar-header" style={styles.header}>
      <div className="navbar-container" style={styles.container}>
        {/* Brand / Logo */}
        <Link to="/" style={styles.brand}>
          <span style={styles.brandIcon}>⚡</span> E-Commerce
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>
            🔍
          </button>
        </form>

        {/* Navigation Links */}
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>
            Catalog
          </Link>

          {/* Cart Icon & Badge */}
          <Link to="/cart" style={{ ...styles.navLink, position: 'relative' }}>
            🛒 Cart
            {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/orders" style={styles.navLink}>
                Orders
              </Link>

              <Link to="/addresses" style={styles.navLink}>
                Addresses
              </Link>

              {/* Admin Menu Dropdown */}
              {isAdmin && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    style={styles.adminBadgeButton}
                  >
                    👑 Admin Panel
                  </button>
                  {adminMenuOpen && (
                    <div style={styles.dropdownMenu} onClick={() => setAdminMenuOpen(false)}>
                      <Link to="/admin/dashboard" style={styles.dropdownItem}>
                        Dashboard
                      </Link>
                      <Link to="/admin/products" style={styles.dropdownItem}>
                        Products & Categories
                      </Link>
                      <Link to="/admin/inventory" style={styles.dropdownItem}>
                        Inventory & Restock
                      </Link>
                      <Link to="/admin/orders" style={styles.dropdownItem}>
                        Order Management
                      </Link>
                      <Link to="/admin/users" style={styles.dropdownItem}>
                        User Accounts
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* User Account Info & Sign Out */}
              <div style={styles.userSection}>
                <span style={styles.userName}>{displayName}</span>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div style={styles.authButtons}>
              <Link to="/login" style={styles.loginButton}>
                Sign In
              </Link>
              <Link to="/register" style={styles.registerButton}>
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '0.8rem 1.5rem',
  },
  container: {
    maxW: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  brand: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#f8fafc',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  brandIcon: {
    color: '#6366f1',
  },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    flex: '1',
    maxWidth: '400px',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.9rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRight: 'none',
    borderRadius: '6px 0 0 6px',
    color: '#f8fafc',
    fontSize: '0.9rem',
  },
  searchButton: {
    padding: '0.5rem 0.9rem',
    backgroundColor: '#6366f1',
    border: '1px solid #6366f1',
    borderRadius: '0 6px 6px 0',
    color: '#ffffff',
    cursor: 'pointer',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-12px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.7rem',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '2px 6px',
  },
  adminBadgeButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
    border: '1px solid #6366f1',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '120%',
    right: 0,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
    zIndex: 101,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: '0.65rem 1rem',
    color: '#e2e8f0',
    textDecoration: 'none',
    fontSize: '0.9rem',
    borderBottom: '1px solid #334155',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  userName: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    fontWeight: '500',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  authButtons: {
    display: 'flex',
    gap: '0.6rem',
  },
  loginButton: {
    color: '#e2e8f0',
    textDecoration: 'none',
    padding: '0.4rem 0.8rem',
    fontSize: '0.9rem',
  },
  registerButton: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    textDecoration: 'none',
    padding: '0.4rem 0.9rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
};

export default Navbar;
