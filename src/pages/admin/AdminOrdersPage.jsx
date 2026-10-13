import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Pagination from '../../components/Pagination';
import AdminSummaryCard from '../../components/AdminSummaryCard';

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard Summary Metrics
  const [summaryStats, setSummaryStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
  const [newStatus, setNewStatus] = useState('');

  // 1. Fetch Aggregate Dashboard Metrics
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.get('/api/admin/dashboard');
      setSummaryStats(res.data);
    } catch (err) {
      console.warn('Dashboard stats fetch failed:', err);
    } finally {
      setStatsLoading(false);
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
        ...(statusFilter && { status: statusFilter })
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
    setNewStatus(order.status);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    setNewStatus('');
  };

  // Status Update Handlers
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedOrder || newStatus === selectedOrder.status || updatingStatus) return;

    const validNext = getValidNextStatuses(selectedOrder.status);
    if (!validNext.includes(newStatus)) {
      setError(`Cannot transition order from ${selectedOrder.status} to ${newStatus}. Valid options: ${validNext.join(', ') || 'None'}`);
      return;
    }

    setUpdatingStatus(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.patch(`/api/admin/orders/${selectedOrder.id}/status`, {
        status: newStatus
      });
      setSuccess(`Order #${selectedOrder.id.substring(0, 8)} status successfully transitioned to ${newStatus}`);
      setSelectedOrder(res.data);
      setNewStatus(res.data.status);
      fetchOrders();
      fetchDashboardStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // COD Payment Collection Handler
  const handleCollectPayment = async () => {
    if (!selectedOrder || updatingPayment) return;
    if (selectedOrder.status === 'CANCELLED') {
      setError('Cannot record payment collection for a cancelled order.');
      return;
    }
    if (selectedOrder.paymentStatus === 'SUCCESS') {
      setError('COD payment has already been collected for this order.');
      return;
    }

    setUpdatingPayment(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.put(`/api/admin/orders/${selectedOrder.id}/payment-status`, {
        paymentStatus: 'SUCCESS'
      });
      setSuccess(`COD payment recorded as COLLECTED for Order #${selectedOrder.id.substring(0, 8)}`);
      setSelectedOrder(res.data);
      fetchOrders();
      fetchDashboardStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Status Badge Colors Helper
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.35)' };
      case 'CONFIRMED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.35)' };
      case 'SHIPPED':
        return { bg: 'rgba(139, 92, 246, 0.15)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.35)' };
      case 'DELIVERED':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.35)' };
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.35)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.15)', text: '#cbd5e1', border: 'rgba(100, 116, 139, 0.35)' };
    }
  };

  // Filter in UI if admin searched by order ID or customer name/email
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const idMatch = order.id?.toLowerCase().includes(query);
    const nameMatch = order.customerName?.toLowerCase().includes(query);
    const emailMatch = order.customerEmail?.toLowerCase().includes(query);
    const streetMatch = order.address?.street?.toLowerCase().includes(query);
    return idMatch || nameMatch || emailMatch || streetMatch;
  });

  const allowedTransitions = selectedOrder ? getValidNextStatuses(selectedOrder.status) : [];
  const isTerminalStatus = selectedOrder && allowedTransitions.length === 0;

  // Actual Metrics Derived from Dashboard API
  const totalOrdersCount = summaryStats?.totalOrders ?? totalElements;
  const pendingOrdersCount = summaryStats?.ordersByStatus?.PENDING ?? 0;
  const confirmedOrdersCount = summaryStats?.ordersByStatus?.CONFIRMED ?? 0;
  const activeOrdersCount = confirmedOrdersCount + pendingOrdersCount;
  const shippedOrdersCount = summaryStats?.ordersByStatus?.SHIPPED ?? 0;
  const codOutstandingCount = summaryStats?.pendingPayments ?? 0;

  return (
    <div className="adm-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* ── 1. Page Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.025em', margin: 0 }}>
            Order &amp; COD Management
          </h1>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: '700',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.35)',
            }}
          >
            Operations
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, maxWidth: '650px' }}>
          Monitor incoming customer purchases, advance legitimate order lifecycle states, and record Cash on Delivery collections.
        </p>
      </div>

      {/* ── 2. Alerts ── */}
      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* ── 3. Summary Cards Grid (Responsive CSS Grid in 1 Row on Desktop) ── */}
      <div
        className="adm-grid-4"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        <AdminSummaryCard
          title="Total Orders"
          value={totalOrdersCount}
          icon="📦"
          subtitle="All recorded customer purchases"
          color="indigo"
          loading={statsLoading}
        />
        <AdminSummaryCard
          title="Confirmed & Active"
          value={activeOrdersCount}
          icon="✅"
          subtitle="Ready for fulfillment & dispatch"
          color="blue"
          loading={statsLoading}
        />
        <AdminSummaryCard
          title="Shipped in Transit"
          value={shippedOrdersCount}
          icon="🚚"
          subtitle="En route for customer delivery"
          color="purple"
          loading={statsLoading}
        />
        <AdminSummaryCard
          title="COD Outstanding"
          value={codOutstandingCount}
          icon="💵"
          subtitle="Pending cash on delivery"
          color="sky"
          loading={statsLoading}
        />
      </div>

      {/* ── 4. Search & Status Filter Toolbar ── */}
      <div
        className="adm-toolbar"
        style={{
          backgroundColor: '#0b1329',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginRight: '0.35rem' }}>
            Status:
          </span>
          <button
            type="button"
            onClick={() => { setStatusFilter(''); setPage(0); }}
            className={`adm-filter-btn ${!statusFilter ? 'active' : ''}`}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: '1px solid',
              backgroundColor: !statusFilter ? '#6366f1' : '#1e293b',
              borderColor: !statusFilter ? '#6366f1' : '#334155',
              color: !statusFilter ? '#ffffff' : '#cbd5e1',
              boxShadow: !statusFilter ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            All Orders
          </button>
          {ORDER_STATUSES.map((st) => {
            const count = summaryStats?.ordersByStatus?.[st];
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => { setStatusFilter(st); setPage(0); }}
                className={`adm-filter-btn ${isActive ? 'active' : ''}`}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: '1px solid',
                  backgroundColor: isActive ? '#6366f1' : '#1e293b',
                  borderColor: isActive ? '#6366f1' : '#334155',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{st}</span>
                {typeof count === 'number' && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#4338ca' : 'rgba(0,0,0,0.3)',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      fontWeight: '700',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 280px' }}>
          <input
            type="text"
            placeholder="Search order ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#070d1e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '0.5rem 1.8rem 0.5rem 2.2rem',
              fontSize: '0.8rem',
              color: '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', pointerEvents: 'none' }}>
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* ── 5. Orders Table (Real HTML Table with Dedicated Wrapper & Non-Overlapping Columns) ── */}
      {loading ? (
        <div style={{ padding: '3rem', backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner message="Retrieving order records from server..." />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: '3.5rem 2rem', textAlign: 'center', backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '12px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📑</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>No matching orders found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            {searchQuery
              ? `No records found matching "${searchQuery}". Try clearing search keywords.`
              : `There are currently no orders under status filter "${statusFilter || 'All'}".`}
          </p>
          {(statusFilter || searchQuery) && (
            <button
              onClick={() => { setStatusFilter(''); setSearchQuery(''); setPage(0); }}
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div
          className="adm-table-container"
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            backgroundColor: '#0b1329',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          }}
        >
          <table
            className="adm-table"
            style={{
              width: '100%',
              minWidth: '980px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#070d1e', borderBottom: '1px solid #1e293b' }}>
                <th style={{ width: '130px', minWidth: '130px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Order ID
                </th>
                <th style={{ width: '240px', minWidth: '240px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Customer Details
                </th>
                <th style={{ width: '160px', minWidth: '160px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Date Placed
                </th>
                <th style={{ width: '110px', minWidth: '110px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Total
                </th>
                <th style={{ width: '150px', minWidth: '150px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Payment
                </th>
                <th style={{ width: '140px', minWidth: '140px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  Order Status
                </th>
                <th style={{ width: '140px', minWidth: '140px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const badgeStyle = getStatusBadgeStyle(order.status);
                const isPaid = order.paymentStatus === 'SUCCESS';

                return (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: '1px solid rgba(30, 41, 59, 0.7)',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    {/* Order ID */}
                    <td style={{ width: '130px', minWidth: '130px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          color: '#818cf8',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                        }}
                        title={order.id}
                      >
                        #{order.id.substring(0, 8)}
                      </span>
                    </td>

                    {/* Customer Details */}
                    <td style={{ width: '240px', minWidth: '240px', padding: '1rem', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          fontWeight: '700',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          wordBreak: 'break-word',
                        }}
                      >
                        {order.customerName || 'Customer'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          marginTop: '0.2rem',
                          wordBreak: 'break-word',
                        }}
                      >
                        {order.customerEmail || (order.address ? `${order.address.city}, ${order.address.country}` : '—')}
                      </div>
                    </td>

                    {/* Date Placed */}
                    <td style={{ width: '160px', minWidth: '160px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ color: '#e2e8f0', fontSize: '0.82rem' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td style={{ width: '110px', minWidth: '110px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: '800', color: '#ffffff', fontSize: '0.9rem' }}>
                        ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Payment (COD & Status) */}
                    <td style={{ width: '150px', minWidth: '150px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>COD</span>
                        <span style={{ color: '#475569' }}>&bull;</span>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isPaid ? '#4ade80' : '#fbbf24',
                            border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                          }}
                        >
                          {isPaid ? 'PAID' : 'PENDING'}
                        </span>
                      </div>
                    </td>

                    {/* Order Status */}
                    <td style={{ width: '140px', minWidth: '140px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          letterSpacing: '0.025em',
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.text,
                          border: `1px solid ${badgeStyle.border}`,
                        }}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ width: '140px', minWidth: '140px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenModal(order)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: '#a5b4fc',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Inspect &amp; Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Footer / Pagination */}
          <div
            className="adm-table-footer"
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#070d1e',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Showing <strong style={{ color: '#ffffff' }}>{filteredOrders.length}</strong> of{' '}
              <strong style={{ color: '#ffffff' }}>{totalElements}</strong> total orders
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* ── 6. Order Details & Transition Modal ── */}
      {selectedOrder && (
        <div
          className="adm-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            className="adm-modal-card"
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Order Inspection
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      ...getStatusBadgeStyle(selectedOrder.status),
                      border: `1px solid ${getStatusBadgeStyle(selectedOrder.status).border}`,
                    }}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.35rem' }}>
                  ID: {selectedOrder.id}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Placed on: {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Status Transition Control Card */}
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc' }}>
                Status State Progression
              </span>

              {isTerminalStatus ? (
                <div style={{ padding: '0.75rem', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔒</span>
                  <span>
                    This order is in terminal state <strong style={{ color: '#ffffff' }}>{selectedOrder.status}</strong>. No further status changes are permitted by backend business rules.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleStatusUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      disabled={updatingStatus}
                      style={{
                        flex: 1,
                        backgroundColor: '#070d1e',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    >
                      <option value={selectedOrder.status}>Current: {selectedOrder.status}</option>
                      {allowedTransitions.map((st) => (
                        <option key={st} value={st}>
                          Advance status &rarr; {st}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={updatingStatus || newStatus === selectedOrder.status}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#6366f1',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: (updatingStatus || newStatus === selectedOrder.status) ? 'not-allowed' : 'pointer',
                        opacity: (updatingStatus || newStatus === selectedOrder.status) ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {updatingStatus ? 'Updating...' : 'Save Transition'}
                    </button>
                  </div>

                  {newStatus === 'CANCELLED' && (
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.75rem' }}>
                      ⚠️ <strong>Stock Restoration Notice:</strong> Cancelling this order will automatically restore stock quantities for all items under pessimistic locks.
                    </div>
                  )}

                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
                    Supported valid paths: PENDING &rarr; CONFIRMED &rarr; SHIPPED &rarr; DELIVERED (or CANCELLED from any active state).
                  </p>
                </form>
              )}
            </div>

            {/* Customer & Delivery Address Side-by-Side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Customer Profile */}
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.3)', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                  Customer Profile
                </span>
                <strong style={{ color: '#ffffff', display: 'block', fontSize: '0.9rem' }}>{selectedOrder.customerName || 'Customer'}</strong>
                <div style={{ color: '#cbd5e1', marginTop: '0.2rem' }}>{selectedOrder.customerEmail || 'No email associated'}</div>
                {selectedOrder.customerId && (
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.35rem' }}>
                    User ID: {selectedOrder.customerId}
                  </div>
                )}
              </div>

              {/* Delivery Address Snapshot */}
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.3)', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', fontSize: '0.8rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
                  Delivery Address Snapshot
                </span>
                {selectedOrder.address ? (
                  <div style={{ color: '#cbd5e1', lineHeight: '1.4' }}>
                    <strong style={{ color: '#ffffff', display: 'block' }}>{selectedOrder.address.street}</strong>
                    <div>{selectedOrder.address.city}{selectedOrder.address.state ? `, ${selectedOrder.address.state}` : ''} {selectedOrder.address.zip}</div>
                    <div style={{ color: '#94a3b8' }}>{selectedOrder.address.country}</div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>No delivery address snapshot recorded.</div>
                )}
              </div>
            </div>

            {/* Line Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                Line Items ({selectedOrder.items?.length || 0})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {item.productImageUrl ? (
                        <img src={item.productImageUrl} alt={item.productName} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#1e293b' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '700', fontSize: '0.75rem' }}>
                          {item.productName?.substring(0, 2).toUpperCase() || 'IT'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: '700', color: '#ffffff' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          ₹{Number(item.priceAtPurchase).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &times; {item.quantity} units
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', color: '#818cf8', fontSize: '0.85rem' }}>
                      ₹{(Number(item.lineTotal ?? (item.priceAtPurchase * item.quantity))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary & COD Collection */}
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Method: <strong style={{ color: '#ffffff' }}>Cash on Delivery (COD)</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Payment Status:</span>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        backgroundColor: selectedOrder.paymentStatus === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: selectedOrder.paymentStatus === 'SUCCESS' ? '#4ade80' : '#fbbf24',
                        border: `1px solid ${selectedOrder.paymentStatus === 'SUCCESS' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                      }}
                    >
                      {selectedOrder.paymentStatus === 'SUCCESS' ? 'PAID / COLLECTED' : 'UNPAID / PENDING'}
                    </span>
                    {selectedOrder.paidAt && (
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                        ({new Date(selectedOrder.paidAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {selectedOrder.paymentStatus !== 'SUCCESS' && (
                  <button
                    onClick={handleCollectPayment}
                    disabled={updatingPayment || selectedOrder.status === 'CANCELLED'}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: (updatingPayment || selectedOrder.status === 'CANCELLED') ? 'not-allowed' : 'pointer',
                      opacity: (updatingPayment || selectedOrder.status === 'CANCELLED') ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {updatingPayment ? 'Recording...' : 'Mark Payment Collected'}
                  </button>
                )}
              </div>

              {selectedOrder.status === 'CANCELLED' && (
                <p style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: '600', margin: 0 }}>
                  ⚠️ Payment collection is disabled because this order has been cancelled.
                </p>
              )}
            </div>

            {/* Total Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                Grand Total Amount
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.025em' }}>
                ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
