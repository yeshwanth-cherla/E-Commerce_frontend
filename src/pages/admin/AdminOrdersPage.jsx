import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';
import { Icon } from '../../components/Icon';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

/**
 * Valid status progression rules supported by Spring Boot AdminOrderService:
 * - PENDING -> CONFIRMED, CANCELLED
 * - CONFIRMED -> SHIPPED, CANCELLED
 * - SHIPPED -> DELIVERED, CANCELLED
 * - DELIVERED -> Terminal (no transitions allowed)
 * - CANCELLED -> Terminal (no transitions allowed)
 */
const getValidNextStatuses = (currentStatus) => {
  switch (currentStatus) {
    case 'PENDING':
      return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['SHIPPED', 'CANCELLED'];
    case 'SHIPPED':
      return ['DELIVERED', 'CANCELLED'];
    case 'DELIVERED':
    case 'CANCELLED':
    default:
      return [];
  }
};

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard Summary Metrics
  const [summaryStats, setSummaryStats] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Selected Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [modalFeedback, setModalFeedback] = useState({ error: '', success: '' });

  // 1. Fetch Aggregate Dashboard Metrics
  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/admin/dashboard');
      setSummaryStats(res.data);
    } catch (err) {
      console.warn('Dashboard stats fetch failed:', err);
    }
  }, []);

  // 2. Fetch Orders List
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        size: 10,
        ...(statusFilter && { status: statusFilter }),
      };
      const res = await apiClient.get('/api/admin/orders', { params });
      setOrders(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order records');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    const validNext = getValidNextStatuses(order.status);
    setTargetStatus(validNext.length > 0 ? validNext[0] : '');
    setModalFeedback({ error: '', success: '' });
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setTargetStatus('');
    setModalFeedback({ error: '', success: '' });
  };

  // Status Update Handler
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !targetStatus || updatingStatus) return;

    const validNext = getValidNextStatuses(selectedOrder.status);
    if (!validNext.includes(targetStatus)) {
      setModalFeedback({
        error: `Cannot transition order from ${selectedOrder.status} to ${targetStatus}. Valid options: ${validNext.join(', ') || 'None'}`,
        success: '',
      });
      return;
    }

    setUpdatingStatus(true);
    setModalFeedback({ error: '', success: '' });
    try {
      const res = await apiClient.patch(`/api/admin/orders/${selectedOrder.id}/status`, {
        status: targetStatus,
      });
      const updated = res.data;
      setSelectedOrder(updated);
      const nextNext = getValidNextStatuses(updated.status);
      setTargetStatus(nextNext.length > 0 ? nextNext[0] : '');
      setModalFeedback({
        error: '',
        success: `Order #${selectedOrder.id.substring(0, 8).toUpperCase()} status updated to ${updated.status}.`,
      });
      setSuccess(`Order #${selectedOrder.id.substring(0, 8).toUpperCase()} transitioned to ${updated.status}.`);
      fetchOrders();
      fetchDashboardStats();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setModalFeedback({
        error: err.response?.data?.message || 'Failed to update order status',
        success: '',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // COD Payment Collection Handler
  const handleCollectPayment = async () => {
    if (!selectedOrder || updatingPayment) return;
    if (selectedOrder.status === 'CANCELLED') {
      setModalFeedback({
        error: 'Cannot record payment collection for a cancelled order.',
        success: '',
      });
      return;
    }
    if (selectedOrder.paymentStatus === 'SUCCESS') {
      setModalFeedback({
        error: 'COD payment has already been collected for this order.',
        success: '',
      });
      return;
    }

    setUpdatingPayment(true);
    setModalFeedback({ error: '', success: '' });
    try {
      const res = await apiClient.put(`/api/admin/orders/${selectedOrder.id}/payment-status`, {
        paymentStatus: 'SUCCESS',
      });
      const updated = res.data;
      setSelectedOrder(updated);
      setModalFeedback({
        error: '',
        success: `Payment successfully recorded as COLLECTED for Order #${selectedOrder.id.substring(0, 8).toUpperCase()}.`,
      });
      setSuccess(`COD payment recorded as collected for Order #${selectedOrder.id.substring(0, 8).toUpperCase()}.`);
      fetchOrders();
      fetchDashboardStats();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setModalFeedback({
        error: err.response?.data?.message || 'Failed to update payment collection status',
        success: '',
      });
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Filtered orders list by client-side search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const idStr = o.id ? o.id.toLowerCase() : '';
      const emailStr = o.customerEmail ? o.customerEmail.toLowerCase() : '';
      const nameStr = o.customerName ? o.customerName.toLowerCase() : '';
      return idStr.includes(query) || emailStr.includes(query) || nameStr.includes(query);
    });
  }, [orders, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPage(0);
  };

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
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
      case 'SUCCESS':
      case 'SUCCESSFUL':
        return <span className="status-pill status-green">Paid · Collected</span>;
      case 'FAILED':
        return <span className="status-pill status-red">Failed</span>;
      case 'REFUNDED':
        return <span className="status-pill status-amber">Refunded</span>;
      case 'PENDING':
      default:
        return <span className="status-pill status-amber">COD · Pending</span>;
    }
  };

  return (
    <div className="admin-content">
      {/* ── Page Header / Intro ── */}
      <div className="admin-intro">
        <div>
          <h2>Customer Orders</h2>
          <p>Review fulfillment progress, manage state transitions, and audit cash collection.</p>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <AlertMessage type="error" message={error} onClose={() => setError('')} />
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '16px' }}>
          <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />
        </div>
      )}

      {/* ── Summary Metric Cards ── */}
      <div className="metric-grid" style={{ marginBottom: '20px' }}>
        <article className="metric-card">
          <span>
            <Icon name="orders" size={20} />
          </span>
          <div>
            <small>Total Orders</small>
            <strong>{summaryStats?.totalOrders ?? totalElements}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="bag" size={20} />
          </span>
          <div>
            <small>Pending Orders</small>
            <strong>{summaryStats?.ordersByStatus?.PENDING ?? 0}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="check" size={20} />
          </span>
          <div>
            <small>Delivered (Fulfilled)</small>
            <strong>{summaryStats?.ordersByStatus?.DELIVERED ?? 0}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span
            style={
              summaryStats?.pendingPayments > 0
                ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
                : {}
            }
          >
            <Icon name="grid" size={20} />
          </span>
          <div>
            <small>Pending COD Collections</small>
            <strong style={summaryStats?.pendingPayments > 0 ? { color: 'var(--warning)' } : {}}>
              {summaryStats?.pendingPayments ?? 0}
            </strong>
          </div>
        </article>
      </div>

      {/* ── Main Orders Panel ── */}
      <section className="panel">
        {/* Filters Bar */}
        <div className="filters">
          {/* Search Box */}
          <label className="admin-search" style={{ minWidth: '240px', maxWidth: '340px' }}>
            <Icon name="search" size={16} />
            <input
              id="admin-orders-search"
              type="text"
              placeholder="Search by Order ID or customer email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
                aria-label="Clear search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </label>

          {/* Status Filter Dropdown */}
          <select
            id="admin-orders-status-filter"
            aria-label="Filter by order status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Result Count Indicator */}
          <span className="result-count">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} shown
          </span>
        </div>

        {/* Active Filter Chips */}
        {(searchQuery || statusFilter) && (
          <div className="active-filters-bar">
            <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '11px' }}>Active filters:</span>
            {searchQuery && (
              <span className="active-filter-chip">
                Search: &ldquo;{searchQuery}&rdquo;
                <button type="button" onClick={() => setSearchQuery('')} aria-label="Remove search filter">
                  ✕
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="active-filter-chip">
                Status: {statusFilter}
                <button type="button" onClick={() => { setStatusFilter(''); setPage(0); }} aria-label="Remove status filter">
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '2px 8px', marginLeft: 'auto' }}
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Orders Table */}
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner message="Loading customer orders..." />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="orders" size={36} style={{ color: 'var(--subtle)', marginBottom: '8px' }} />
            <h3 style={{ margin: '8px 0 4px', color: 'var(--ink)' }}>No orders found</h3>
            <p style={{ margin: 0, fontSize: '12px' }}>
              No order records match your active search or status filters.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearFilters}
              style={{ marginTop: '16px', fontSize: '12px' }}
            >
              Clear filters
            </button>
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
                  <th aria-label="Actions" style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b style={{ color: 'var(--ink)' }}>
                        #{order.id.substring(0, 8).toUpperCase()}
                      </b>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                          {order.customerName || 'Customer'}
                        </span>
                        <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          {order.customerEmail || '—'}
                        </small>
                      </div>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <b style={{ color: 'var(--ink)' }}>
                        {formatCurrency(order.totalAmount)}
                      </b>
                    </td>
                    <td>{getOrderStatusBadge(order.status)}</td>
                    <td>{getPaymentBadge(order.paymentStatus)}</td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => handleOpenModal(order)}
                        title="View order details and manage status"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span>
              Showing {page * 10 + 1}–{Math.min((page + 1) * 10, totalElements)} of {totalElements} orders
            </span>
            <div>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                .map((i, idx, arr) => (
                  <React.Fragment key={i}>
                    {idx > 0 && arr[idx - 1] !== i - 1 && (
                      <span style={{ padding: '0 4px', color: 'var(--muted)' }}>…</span>
                    )}
                    <button
                      type="button"
                      className={i === page ? 'active' : ''}
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </button>
                  </React.Fragment>
                ))}
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Order Detail & State Transition Modal ── */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Order #{selectedOrder.id.substring(0, 8).toUpperCase()}</h2>
                <p>Placed on {formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseModal}
                aria-label="Close dialog"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Modal Inline Feedback */}
              {modalFeedback.error && (
                <div className="inline-error" style={{ marginBottom: '16px' }}>
                  <b>Action failed</b>
                  <span>{modalFeedback.error}</span>
                </div>
              )}
              {modalFeedback.success && (
                <div style={{ marginBottom: '16px' }}>
                  <AlertMessage type="success" message={modalFeedback.success} onClose={() => setModalFeedback({ error: '', success: '' })} />
                </div>
              )}

              {/* Order Meta Information */}
              <div className="order-detail-meta-grid">
                <div className="order-detail-meta-item">
                  <small>Customer</small>
                  <b>{selectedOrder.customerName || 'Customer'}</b>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{selectedOrder.customerEmail}</span>
                </div>
                <div className="order-detail-meta-item">
                  <small>Total Amount</small>
                  <b style={{ color: 'var(--primary)' }}>{formatCurrency(selectedOrder.totalAmount)}</b>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Cash on Delivery</span>
                </div>
                <div className="order-detail-meta-item">
                  <small>Current Status</small>
                  <div>{getOrderStatusBadge(selectedOrder.status)}</div>
                </div>
                <div className="order-detail-meta-item">
                  <small>Payment Status</small>
                  <div>{getPaymentBadge(selectedOrder.paymentStatus)}</div>
                </div>
              </div>

              {/* Delivery Address Snapshot */}
              {selectedOrder.address && (
                <div style={{ marginBottom: '20px', padding: '14px 16px', border: '1px solid var(--line)', borderRadius: '8px', background: 'white' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Delivery Address
                  </span>
                  <div style={{ color: 'var(--ink)', fontSize: '13px', lineHeight: 1.5 }}>
                    {selectedOrder.address.street}, {selectedOrder.address.city}, {selectedOrder.address.state} {selectedOrder.address.zip}, {selectedOrder.address.country}
                  </div>
                </div>
              )}

              {/* Ordered Items List */}
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Order Items ({selectedOrder.items?.length || 0})
                </span>
                <div style={{ border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="admin-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td>
                              <b style={{ color: 'var(--ink)' }}>{item.productName || item.product?.name || 'Product Item'}</b>
                            </td>
                            <td>{formatCurrency(item.unitPrice || item.price)}</td>
                            <td>{item.quantity}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {formatCurrency((item.unitPrice || item.price) * item.quantity)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px' }}>
                            Item details captured with order snapshot.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Status Progression State Machine ── */}
              <div style={{ padding: '18px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--canvas)', marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                  Fulfillment Status Transition
                </span>

                {getValidNextStatuses(selectedOrder.status).length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px' }}>
                    <Icon name="check" size={16} />
                    <span>
                      Order is in a terminal state (<b>{selectedOrder.status}</b>). No further fulfillment transitions are permitted.
                      {selectedOrder.status === 'CANCELLED' && ' Inventory stock has been restored.'}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="order-transition">
                      <div>{getOrderStatusBadge(selectedOrder.status)}</div>
                      <Icon name="arrow" size={16} />
                      <div>{getOrderStatusBadge(targetStatus)}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                        Transition to:
                      </label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value)}
                        style={{ height: '36px', padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: '6px', background: 'white', color: 'var(--ink)', fontSize: '12px' }}
                      >
                        {getValidNextStatuses(selectedOrder.status).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        className={targetStatus === 'CANCELLED' ? 'btn btn-danger' : 'btn btn-primary'}
                        disabled={updatingStatus || !targetStatus}
                        style={{ fontSize: '12px', padding: '8px 14px' }}
                      >
                        {updatingStatus ? (
                          <>
                            <span className="spinner" style={{ marginRight: '6px' }} />
                            Updating…
                          </>
                        ) : (
                          `Confirm → ${targetStatus}`
                        )}
                      </button>
                    </div>

                    {targetStatus === 'CANCELLED' && (
                      <div className="warning-box" style={{ marginTop: '4px' }}>
                        <b>Stock restoration notice:</b>
                        <span>
                          Confirming cancellation will immediately restore all reserved item quantities back to warehouse inventory.
                        </span>
                      </div>
                    )}
                  </form>
                )}
              </div>

              {/* ── Cash on Delivery Payment Collection ── */}
              <div style={{ padding: '18px', border: '1px solid var(--line)', borderRadius: '8px', background: 'white' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Payment Status (Cash on Delivery)
                </span>

                {selectedOrder.status === 'CANCELLED' ? (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                    Payment collection is disabled because this order has been cancelled.
                  </p>
                ) : selectedOrder.paymentStatus === 'SUCCESS' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '12px', fontWeight: 600 }}>
                    <Icon name="check" size={16} />
                    <span>Cash on Delivery payment has been successfully recorded as collected.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#4e5668' }}>
                        Customer payment is currently pending settlement upon delivery.
                      </p>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        Do not infer paid status merely from delivery. Verify cash receipt before recording.
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCollectPayment}
                      disabled={updatingPayment}
                      style={{ fontSize: '12px' }}
                    >
                      {updatingPayment ? (
                        <>
                          <span className="spinner" style={{ marginRight: '6px' }} />
                          Recording…
                        </>
                      ) : (
                        'Record cash collection'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
