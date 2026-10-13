import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// ─── Sidebar navigation items ────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/admin',           label: 'Dashboard',             icon: '📊', end: true },
  { to: '/admin/products',  label: 'Products & Categories', icon: '📦' },
  { to: '/admin/inventory', label: 'Inventory & Stock',     icon: '🗃️' },
  { to: '/admin/orders',    label: 'Customer Orders',       icon: '🛒' },
  { to: '/admin/users',     label: 'User Accounts',         icon: '👤' },
];

const SIDEBAR_W = '240px';

/**
 * AdminLayout — Dedicated shell for all /admin/* pages.
 *
 * Renders a collapsible sidebar (always visible on ≥768 px desktop,
 * slide-in on mobile), a thin top-bar, and a content area.
 *
 * The customer Navbar, Footer, search bar, and cart badge are NOT
 * rendered anywhere inside this layout.
 */
export const AdminLayout = ({ children }) => {
  const { profile, user, logout } = useAuth();
  const { clearCartState } = useCart();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = profile?.fullName || user?.email || 'Administrator';

  const handleLogout = async () => {
    await logout();
    clearCartState();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Inline responsive styles — no extra CSS file required */}
      <style>{`
        .adm-shell { display:flex; min-height:100vh; background:#020617; }
        .adm-sidebar {
          width:${SIDEBAR_W}; min-width:${SIDEBAR_W};
          background:#0c1526; border-right:1px solid #1e293b;
          display:flex; flex-direction:column;
          position:fixed; top:0; left:0; bottom:0; z-index:40;
          transform:translateX(-100%); transition:transform .25s ease;
        }
        .adm-sidebar.open { transform:translateX(0); }
        .adm-content { flex:1; display:flex; flex-direction:column; min-width:0; overflow-x:hidden; }
        .adm-hamburger { display:block; }
        @media(min-width:768px){
          .adm-sidebar {
            transform:translateX(0) !important;
            position:sticky !important; top:0 !important;
            height:100vh; align-self:flex-start;
          }
          .adm-hamburger { display:none !important; }
        }
      `}</style>

      <div className="adm-shell">

        {/* ── Mobile dark overlay ── */}
        {sidebarOpen && (
          <div
            onClick={closeSidebar}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:39 }}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ── */}
        <aside className={`adm-sidebar${sidebarOpen ? ' open' : ''}`}>
          {/* Brand */}
          <div style={s.brand}>
            <span style={{ fontSize:'1.5rem', color:'#818cf8' }}>⚡</span>
            <div>
              <div style={s.brandTitle}>Admin Panel</div>
              <div style={s.brandSub}>E-Commerce Manager</div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={s.nav} aria-label="Admin navigation">
            {NAV_ITEMS.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navActive : {}) })}
              >
                <span style={s.navIcon}>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer: profile + actions */}
          <div style={s.sidebarFooter}>
            <div style={s.profile}>
              <div style={s.avatar}>{displayName.charAt(0).toUpperCase()}</div>
              <div>
                <div style={s.profileName}>{displayName}</div>
                <div style={s.profileRole}>Administrator</div>
              </div>
            </div>
            <Link to="/" onClick={closeSidebar} style={s.storefrontBtn}>
              🏪 Go to Storefront
            </Link>
            <button onClick={handleLogout} style={s.logoutBtn}>
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="adm-content">
          {/* Top bar */}
          <header style={s.topBar}>
            <button
              className="adm-hamburger"
              onClick={() => setSidebarOpen(v => !v)}
              style={s.hamburger}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flex:1 }}>
              <span style={s.adminBadge}>👑 Admin</span>
              <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>Store Management Console</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
              <Link to="/" style={s.topStorefrontLink}>🏪 Storefront</Link>
              <button onClick={handleLogout} style={s.topLogoutBtn}>Sign Out</button>
            </div>
          </header>

          {/* Page content */}
          <main style={s.pageContent}>
            {children}
          </main>
        </div>

      </div>
    </>
  );
};

// ─── Inline style tokens ─────────────────────────────────────────────────────
const s = {
  brand: {
    display:'flex', alignItems:'center', gap:'0.75rem',
    padding:'1.25rem 1rem', borderBottom:'1px solid #1e293b',
  },
  brandTitle: { color:'#f8fafc', fontWeight:'800', fontSize:'1rem', lineHeight:1.2 },
  brandSub:   { color:'#64748b', fontSize:'0.7rem', fontWeight:'500' },

  nav: {
    flex:1, overflowY:'auto', padding:'0.75rem 0.5rem',
    display:'flex', flexDirection:'column', gap:'2px',
  },
  navLink: {
    display:'flex', alignItems:'center', gap:'0.65rem',
    padding:'0.65rem 0.85rem', borderRadius:'8px',
    color:'#94a3b8', textDecoration:'none',
    fontSize:'0.875rem', fontWeight:'500',
    transition:'background 0.15s, color 0.15s',
  },
  navActive: {
    backgroundColor:'rgba(99,102,241,0.18)', color:'#a5b4fc', fontWeight:'700',
    borderLeft:'3px solid #6366f1', paddingLeft:'calc(0.85rem - 3px)',
  },
  navIcon: { fontSize:'1rem', width:'1.25rem', textAlign:'center', flexShrink:0 },

  sidebarFooter: {
    borderTop:'1px solid #1e293b', padding:'0.85rem',
    display:'flex', flexDirection:'column', gap:'0.5rem',
  },
  profile: { display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.25rem' },
  avatar: {
    width:'34px', height:'34px', borderRadius:'50%',
    backgroundColor:'#4f46e5', color:'#fff',
    fontWeight:'700', fontSize:'0.9rem',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  profileName: {
    color:'#e2e8f0', fontSize:'0.8rem', fontWeight:'600',
    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
  },
  profileRole: { color:'#818cf8', fontSize:'0.68rem', fontWeight:'500' },

  storefrontBtn: {
    display:'block', padding:'0.5rem 0.75rem', textAlign:'center',
    backgroundColor:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)',
    borderRadius:'7px', color:'#a5b4fc', textDecoration:'none',
    fontSize:'0.8rem', fontWeight:'600',
  },
  logoutBtn: {
    display:'block', width:'100%', padding:'0.5rem 0.75rem', textAlign:'center',
    background:'transparent', border:'1px solid #334155',
    borderRadius:'7px', color:'#94a3b8', fontSize:'0.8rem', fontWeight:'500', cursor:'pointer',
  },

  topBar: {
    display:'flex', alignItems:'center', gap:'1rem',
    padding:'0 1.25rem', height:'56px', minHeight:'56px',
    backgroundColor:'#0c1526', borderBottom:'1px solid #1e293b',
    position:'sticky', top:0, zIndex:30,
  },
  hamburger: {
    background:'none', border:'none', color:'#94a3b8',
    fontSize:'1.25rem', cursor:'pointer', padding:'0.25rem',
  },
  adminBadge: {
    backgroundColor:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.35)',
    borderRadius:'6px', color:'#818cf8', fontSize:'0.78rem', fontWeight:'700', padding:'2px 8px',
  },
  topStorefrontLink: {
    color:'#a5b4fc', textDecoration:'none', fontSize:'0.82rem', fontWeight:'600',
    padding:'0.3rem 0.7rem', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'6px',
    backgroundColor:'rgba(99,102,241,0.08)', whiteSpace:'nowrap',
  },
  topLogoutBtn: {
    background:'transparent', border:'1px solid #334155', borderRadius:'6px',
    color:'#94a3b8', fontSize:'0.82rem', fontWeight:'500',
    padding:'0.3rem 0.7rem', cursor:'pointer', whiteSpace:'nowrap',
  },
  pageContent: { flex:1, padding:'1.75rem 1.5rem', maxWidth:'1400px', width:'100%', boxSizing:'border-box', margin:'0 auto' },
};

export default AdminLayout;
