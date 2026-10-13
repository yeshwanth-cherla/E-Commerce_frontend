import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';
import { Icon } from '../../components/Icon';

const ORDER_STATUS_ORDER = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [ordersError, setOrdersError] = useState(null);
  const [inventoryError, setInventoryError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setOrdersError(null);
    setInventoryError(null);

    const [metricsRes, ordersRes, inventoryRes] = await Promise.allSettled([
      apiClient.get('/api/admin/dashboard'),
      apiClient.get('/api/admin/orders?page=0&size=5'),
      apiClient.get('/api/admin/inventory/low-stock?threshold=10&page=0&size=5'),
    ]);

    // Handle aggregate metrics
    if (metricsRes.status === 'fulfilled') {
      setMetrics(metricsRes.value.data);
    } else {
      console.error('Failed to load admin metrics:', metricsRes.reason);
      setError(metricsRes.reason?.response?.data?.message || 'Failed to load administrator metrics');
    }

    // Handle recent orders
    if (ordersRes.status === 'fulfilled') {
      const pageData = ordersRes.value.data;
      setRecentOrders(pageData?.content || pageData?.orders || []);
    } else {
      console.error('Failed to load recent orders:', ordersRes.reason);
      setOrdersError('Unable to load recent orders from server.');
    }

    // Handle low stock inventory
    if (inventoryRes.status === 'fulfilled') {
      const pageData = inventoryRes.value.data;
      setLowStockItems(pageData?.content || pageData?.items || []);
    } else {
      console.error('Failed to load low stock inventory:', inventoryRes.reason);
      setInventoryError('Unable to load stock attention list.');
    }

    setLastRefreshed(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatCurrency = (val) => {
    return `₹${Number(val || 0).toLocaleString('en-IN')}`;
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="status-pill status-blue">Confirmed</span>;
      case 'SHIPPED':
        return <span className="status-pill status-blue">Shipped</span>;
      case 'DELIVERED':
        return <span className="status-pill status-green">Delivered</span>;
      case 'CANCELLED':
        return <span className="status-pill status-red">Cancelled</span>;
      case 'PENDING':
      default:
        return <span className="status-pill status-amber">{status || 'Pending'}</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'SUCCESSFUL':
        return <span className="status-pill status-green">Paid</span>;
      case 'FAILED':
        return <span className="status-pill status-red">Failed</span>;
      case 'REFUNDED':
        return <span className="status-pill status-amber">Refunded</span>;
      case 'PENDING':
      default:
        return <span className="status-pill status-amber">COD · Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="admin-content">
        <LoadingSpinner message="Loading administrator metrics..." />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="admin-content">
        <AlertMessage type="error" message={error} />
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadDashboardData()}
          >
            Retry loading dashboard
          </button>
        </div>
      </div>
    );
  }

  const ordersByStatus = metrics?.ordersByStatus || {};

  return (
    <div className="admin-content">
      {/* ── Intro Header ── */}
      <div className="admin-intro">
        <div>
          <h2>Store overview</h2>
          <p>A clear view of operational activity supplied by the dashboard API.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefreshed && (
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
            aria-label="Refresh dashboard data"
          >
            <Icon name="refresh" size={14} />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="metric-grid">
        <article className="metric-card">
          <span>
            <Icon name="box" size={20} />
          </span>
          <div>
            <small>Active Products</small>
            <strong>{metrics?.totalEnabledProducts ?? 0}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="orders" size={20} />
          </span>
          <div>
            <small>Total Orders</small>
            <strong>{metrics?.totalOrders ?? 0}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="bag" size={20} />
          </span>
          <div>
            <small>Pending Orders</small>
            <strong>{ordersByStatus?.PENDING ?? 0}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span
            style={
              metrics?.lowStockProducts > 0
                ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
                : {}
            }
          >
            <Icon name="grid" size={20} />
          </span>
          <div>
            <small>Low-Stock Alert</small>
            <strong
              style={
                metrics?.lowStockProducts > 0
                  ? { color: 'var(--warning)' }
                  : {}
              }
            >
              {metrics?.lowStockProducts ?? 0}
            </strong>
          </div>
        </article>
      </div>

      {/* ── Main Two-Column Admin Layout ── */}
      <div className="admin-grid">
        {/* Left Column: Recent Orders & Fulfillment Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Recent Orders Panel */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Recent orders</h3>
                <p>Latest customer activity</p>
              </div>
              <Link to="/admin/orders">
                View all <Icon name="arrow" size={14} />
              </Link>
            </div>

            {ordersError ? (
              <div style={{ padding: '16px 20px' }}>
                <AlertMessage type="error" message={ordersError} />
              </div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No customer orders have been placed yet.
              </div>
            ) : (
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Fulfillment</th>
                      <th>Payment</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <b style={{ color: 'var(--ink)' }}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </b>
                        </td>
                        <td>{order.customerName || order.customerEmail || 'Customer'}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <b style={{ color: 'var(--ink)' }}>
                            {formatCurrency(order.totalAmount)}
                          </b>
                        </td>
                        <td>{getOrderStatusBadge(order.status)}</td>
                        <td>{getPaymentBadge(order.paymentStatus)}</td>
                        <td>
                          <Link to="/admin/orders" className="table-action">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Order Status Breakdown */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Order status breakdown</h3>
                <p>Current distribution across order fulfillment lifecycle</p>
              </div>
            </div>
            <div className="admin-stats-list">
              {ORDER_STATUS_ORDER.map((statusKey) => {
                const count = ordersByStatus[statusKey] ?? 0;
                return (
                  <div key={statusKey} className="admin-stat-row">
                    <span>
                      {getOrderStatusBadge(statusKey)}
                      <span style={{ marginLeft: '4px' }}>{statusKey}</span>
                    </span>
                    <b>{count} {count === 1 ? 'order' : 'orders'}</b>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Low-Stock Attention & Financial / Store Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Low-Stock Attention Panel */}
          <section className="panel low-stock-panel">
            <div className="panel-head">
              <div>
                <h3>Stock attention</h3>
                <p>Products at or below 10 units</p>
              </div>
            </div>

            {inventoryError ? (
              <div style={{ padding: '16px 18px' }}>
                <AlertMessage type="error" message={inventoryError} />
              </div>
            ) : lowStockItems.length === 0 ? (
              <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                All stock levels are currently healthy.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div className="stock-row" key={item.id}>
                  <span>
                    <b>{item.name}</b>
                    <small>{item.category?.name || 'Catalog product'}</small>
                  </span>
                  <span className={item.stockQuantity === 0 ? 'danger-text' : ''}>
                    {item.stockQuantity} {item.stockQuantity === 1 ? 'unit' : 'units'}
                  </span>
                </div>
              ))
            )}

            <Link to="/admin/inventory" className="btn btn-secondary">
              Review inventory
            </Link>
          </section>

          {/* Store Overview & Payment Status Panel */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Payment & store overview</h3>
                <p>Collection status and catalog records</p>
              </div>
            </div>
            <div className="admin-stats-list">
              <div className="admin-stat-row">
                <span>Pending COD collections</span>
                <span className="status-pill status-amber">
                  {metrics?.pendingPayments ?? 0}
                </span>
              </div>
              <div className="admin-stat-row">
                <span>Successful settlements</span>
                <span className="status-pill status-green">
                  {metrics?.successfulPayments ?? 0}
                </span>
              </div>
              <div className="admin-stat-row">
                <span>Registered customer accounts</span>
                <strong>{metrics?.totalUsers ?? 0}</strong>
              </div>
              <div className="admin-stat-row">
                <span>Active categories</span>
                <strong>{metrics?.totalCategories ?? 0}</strong>
              </div>
              <div className="admin-stat-row">
                <span>Total product reviews</span>
                <strong>{metrics?.totalReviews ?? 0}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
