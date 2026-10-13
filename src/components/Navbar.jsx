import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Icon } from './Icon';
import { apiClient } from '../services/apiClient';
import { filterApprovedCategories } from '../constants/categories';

/**
 * Aster Customer Storefront Navbar
 *
 * Implements Aster UI design tokens, brand mark, search input,
 * category navigation bar, and cart badge indicator.
 *
 * Preserves all Supabase Auth session states, routing, cart context,
 * and admin storefront switcher banner.
 */
export const Navbar = () => {
  const { user, profile, isAdmin, isAuthenticated, logout } = useAuth();
  const { cartCount, clearCartState } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentSearch = searchParams.get('search') || '';
  const currentCategoryId = searchParams.get('categoryId') || '';
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [categories, setCategories] = useState([]);

  // Sync internal search field with URL parameter
  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  // Load canonical categories once for the category sub-navigation
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/api/categories')
      .then((res) => {
        if (isMounted) {
          setCategories(filterApprovedCategories(res.data || []));
        }
      })
      .catch((err) => {
        console.warn('Category sub-nav load note:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/?search=${encodeURIComponent(q)}`);
    } else {
      navigate('/');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (currentSearch) {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    clearCartState();
    navigate('/login');
  };

  const displayName = profile?.fullName || user?.email?.split('@')[0] || 'Account';

  return (
    <>
      {/* Admin Session Notice Banner */}
      {isAdmin && (
        <div className="admin-session-banner" role="status">
          <span>👑 Admin Mode</span>
          <p>You are viewing the customer storefront.</p>
          <Link to="/admin">Switch to Admin Panel →</Link>
        </div>
      )}

      {/* Primary Site Header */}
      <header className="site-header">
        {/* Brand */}
        <Link to="/" className="brand" aria-label="Aster home">
          <span className="brand-mark">A</span>
          <span>Aster</span>
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search" role="search">
          <Icon name="search" size={19} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products and categories"
            aria-label="Search products"
          />
          {searchQuery && (
            <button
              type="button"
              className="icon-btn small"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </form>

        {/* Customer Actions */}
        <nav className="header-actions" aria-label="Customer navigation">
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="header-link" aria-label="Your orders">
                <Icon name="orders" size={20} />
                <span>
                  <small>Your account</small>
                  <strong>Orders</strong>
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="header-link"
                title={`Signed in as ${displayName}`}
                aria-label="Sign out"
              >
                <Icon name="user" size={20} />
                <span>
                  <small>{displayName}</small>
                  <strong>Sign Out</strong>
                </span>
              </button>
            </>
          ) : (
            <Link to="/login" className="header-link" aria-label="Sign in">
              <Icon name="user" size={20} />
              <span>
                <small>Welcome</small>
                <strong>Sign In</strong>
              </span>
            </Link>
          )}

          {/* Cart Trigger */}
          <Link
            to="/cart"
            className="cart-button"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <Icon name="bag" size={22} />
            <span>Cart</span>
            <b>{cartCount}</b>
          </Link>
        </nav>
      </header>

      {/* Category Navigation Bar */}
      <nav className="category-nav" aria-label="Catalog categories">
        <div className="category-nav-inner">
          <button
            type="button"
            className={!currentCategoryId && !currentSearch ? 'active' : ''}
            onClick={() => navigate('/')}
          >
            All Products
          </button>
          {categories.map((cat) => {
            const isCatActive = currentCategoryId === cat.id.toString();
            return (
              <button
                type="button"
                key={cat.id}
                className={isCatActive ? 'active' : ''}
                onClick={() => navigate(`/?categoryId=${cat.id}`)}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
