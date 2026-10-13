import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// ── Customer layout components ───────────────────────────────────────────────
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// ── Admin layout ─────────────────────────────────────────────────────────────
import AdminLayout from './components/AdminLayout';

// ── Customer Pages ────────────────────────────────────────────────────────────
import HomePage from './pages/customer/HomePage';
import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import AddressesPage from './pages/customer/AddressesPage';

// ── Admin Pages ───────────────────────────────────────────────────────────────
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

// ─────────────────────────────────────────────────────────────────────────────
// Customer shell — wraps every non-admin route with the shared Navbar/Footer
// Scopes Aster canvas styling to migrated customer pages (home and product details),
// safeguarding unmigrated pages (login, register, checkout, orders, admin).
// ─────────────────────────────────────────────────────────────────────────────
const CustomerShell = ({ children }) => {
  const location = useLocation();
  const isAsterTheme =
    location.pathname === '/' ||
    location.pathname.startsWith('/products/') ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/orders') ||
    location.pathname === '/addresses' ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: isAsterTheme ? 'var(--canvas, #f7f8fb)' : '#020617',
        color: isAsterTheme ? 'var(--ink, #172033)' : '#f8fafc',
      }}
    >
      <Navbar />
      <main
        style={{
          flexGrow: 1,
          width: '100%',
          margin: '0 auto',
          maxWidth: isAsterTheme ? '100%' : '1280px',
          padding: isAsterTheme ? '0' : '2rem 1.25rem',
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ── PUBLIC & PROTECTED CUSTOMER ROUTES ─────────────────────── */}
            <Route
              path="/"
              element={
                <CustomerShell>
                  <HomePage />
                </CustomerShell>
              }
            />
            <Route
              path="/login"
              element={
                <CustomerShell>
                  <LoginPage />
                </CustomerShell>
              }
            />
            <Route
              path="/register"
              element={
                <CustomerShell>
                  <RegisterPage />
                </CustomerShell>
              }
            />
            {/*
              TASK 3 FIX: route param is :id — ProductDetailPage must use
              useParams() destructuring as { id }, not { productId }.
              The fix is applied in ProductDetailPage.jsx (see that file).
            */}
            <Route
              path="/products/:id"
              element={
                <CustomerShell>
                  <ProductDetailPage />
                </CustomerShell>
              }
            />

            {/* Protected customer routes */}
            <Route
              path="/cart"
              element={
                <CustomerShell>
                  <ProtectedRoute>
                    <CartPage />
                  </ProtectedRoute>
                </CustomerShell>
              }
            />
            <Route
              path="/checkout"
              element={
                <CustomerShell>
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                </CustomerShell>
              }
            />
            <Route
              path="/orders"
              element={
                <CustomerShell>
                  <ProtectedRoute>
                    <OrderHistoryPage />
                  </ProtectedRoute>
                </CustomerShell>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <CustomerShell>
                  <ProtectedRoute>
                    <OrderDetailPage />
                  </ProtectedRoute>
                </CustomerShell>
              }
            />
            <Route
              path="/addresses"
              element={
                <CustomerShell>
                  <ProtectedRoute>
                    <AddressesPage />
                  </ProtectedRoute>
                </CustomerShell>
              }
            />

            {/* ── ADMIN ROUTES — rendered inside AdminLayout ─────────────── */}
            {/*
              AdminRoute enforces ROLE_ADMIN check (see AdminRoute.jsx).
              AdminLayout provides the sidebar + top-bar; the customer
              Navbar, search bar, and cart badge are NOT rendered here.
            */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminDashboardPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminProductsPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminInventoryPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminOrdersPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminUsersPage />
                  </AdminLayout>
                </AdminRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
