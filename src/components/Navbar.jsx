import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/**
 * Customer Storefront Navbar
 *
 * Renders search, cart, orders, addresses, and account controls for
 * customer-facing pages ONLY.
 *
 * Admin management controls (sidebar, inventory, user management, etc.)
 * are rendered exclusively inside AdminLayout — never here.
 *
 * For authenticated admins visiting the storefront: a small top utility
 * banner is shown so they can switch to the Admin Panel without cluttering
 * the customer shopping experience.
 */
export const Navbar = () => {
  const { user, profile, isAdmin, isAuthenticated, logout } = useAuth();
  const { cartCount, clearCartState } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
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
    <>
      {/*
        Admin session banner — only visible to admins browsing the storefront.
        Intentionally subtle so it doesn't interfere with the shopping UX.
      */}
      {isAdmin && (
        <div style={styles.adminBanner}>
          <span style={styles.bannerText}>
            👑 Admin session active — you are viewing the customer storefront.
          </span>
          <Link to="/admin" style={styles.bannerLink}>
            Switch to Admin Panel →
          </Link>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.container}>
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
              aria-label="Search products"
            />
            <button type="submit" style={styles.searchButton} aria-label="Search">
              🔍
            </button>
          </form>

          {/* Navigation Links */}
          <nav style={styles.nav} aria-label="Customer navigation">
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
    </>
  );
};

const styles = {
  // ── Admin session banner ──────────────────────────────────────────────────
  adminBanner: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderBottom: '1px solid rgba(99,102,241,0.25)',
    padding: '0.45rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.2rem',
    flexWrap: 'wrap',
  },
  bannerText: {
    color: '#a5b4fc',
    fontSize: '0.8rem',
    fontWeight: '500',
  },
  bannerLink: {
    color: '#818cf8',
    textDecoration: 'none',
    fontSize: '0.8rem',
    fontWeight: '700',
    padding: '2px 10px',
    border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: '4px',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },

  // ── Main header ───────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '0.8rem 1.5rem',
  },
  container: {
    maxWidth: '1280px',
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
