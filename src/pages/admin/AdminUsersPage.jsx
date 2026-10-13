import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';
import { Icon } from '../../components/Icon';

export const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Summary Metrics
  const [metrics, setMetrics] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Selected User Modal (Profile & Orders)
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Confirmation Modal for Status Changes
  const [confirmTarget, setConfirmTarget] = useState(null);

  // 1. Fetch System Metrics & Counts
  const fetchMetrics = useCallback(async () => {
    try {
      const [dashRes, usersRes] = await Promise.all([
        apiClient.get('/api/admin/dashboard'),
        apiClient.get('/api/admin/users', { params: { page: 0, size: 50 } }),
      ]);
      const sampleUsers = usersRes.data.content || [];

      const adminCount = sampleUsers.filter((u) => u.role === 'ROLE_ADMIN').length;
      const activeCount = sampleUsers.filter((u) => u.enabled).length;

      setMetrics({
        totalUsers: dashRes.data.totalUsers ?? usersRes.data.totalElements ?? 0,
        adminCount,
        activeCount,
      });
    } catch (err) {
      console.warn('User metrics fetch error:', err);
    }
  }, []);

  // 2. Fetch Users List
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        size: 10,
        ...(search.trim() && { search: search.trim() }),
      };
      const res = await apiClient.get('/api/admin/users', { params });
      setUsers(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Client-side filtering by role & status on current page records
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'ROLE_ADMIN' && u.role !== 'ROLE_ADMIN') return false;
        if (roleFilter === 'ROLE_CUSTOMER' && u.role !== 'ROLE_CUSTOMER') return false;
      }
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && !u.enabled) return false;
        if (statusFilter === 'DISABLED' && u.enabled) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter]);

  // Request Confirmation for Status Toggle
  const promptToggleStatus = (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      setError('You cannot disable your own administrator account.');
      return;
    }
    setConfirmTarget(targetUser);
  };

  // Perform Status Toggle
  const handleConfirmToggle = async () => {
    if (!confirmTarget || togglingStatus) return;

    setTogglingStatus(true);
    setError('');
    setSuccess('');
    try {
      const newEnabled = !confirmTarget.enabled;
      const res = await apiClient.patch(`/api/admin/users/${confirmTarget.id}/status`, {
        enabled: newEnabled,
      });

      setSuccess(`User account "${confirmTarget.email}" status updated to ${newEnabled ? 'Active' : 'Disabled'}.`);

      if (selectedUser?.id === confirmTarget.id) {
        setSelectedUser(res.data);
      }
      setConfirmTarget(null);
      fetchUsers();
      fetchMetrics();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user account status');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Open User Detail & Order History Modal
  const openUserModal = async (u) => {
    setSelectedUser(u);
    setOrdersLoading(true);
    setUserOrders([]);
    try {
      const res = await apiClient.get(`/api/admin/users/${u.id}/orders`, {
        params: { page: 0, size: 10 },
      });
      setUserOrders(res.data.content || []);
    } catch (err) {
      console.error('Failed to fetch user orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setPage(0);
  };

  const getInitials = (name, email) => {
    const source = (name || email || 'User').trim();
    if (source.includes('@')) return source.substring(0, 2).toUpperCase();
    const parts = source.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.substring(0, 2).toUpperCase();
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

  return (
    <div className="admin-content">
      {/* ── Intro Header ── */}
      <div className="admin-intro">
        <div>
          <h2>User Accounts</h2>
          <p>Review customer registrations, audit administrator privileges, and inspect order records.</p>
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
            <Icon name="users" size={20} />
          </span>
          <div>
            <small>Total Registered Users</small>
            <strong>{metrics?.totalUsers ?? totalElements}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="check" size={20} />
          </span>
          <div>
            <small>Active Accounts</small>
            <strong>{metrics?.activeCount ?? totalElements}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="user" size={20} />
          </span>
          <div>
            <small>Administrator Privileges</small>
            <strong>{metrics?.adminCount ?? 1}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="box" size={20} />
          </span>
          <div>
            <small>Current Page Accounts</small>
            <strong>{filteredUsers.length}</strong>
          </div>
        </article>
      </div>

      {/* ── Main Users Panel ── */}
      <section className="panel">
        {/* Filters Bar */}
        <div className="filters">
          {/* Search Box */}
          <label className="admin-search" style={{ minWidth: '240px', maxWidth: '340px' }}>
            <Icon name="search" size={16} />
            <input
              id="admin-users-search"
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(0);
                }}
                style={{ border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
                aria-label="Clear search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </label>

          {/* Role Filter Dropdown */}
          <select
            id="admin-users-role-filter"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All roles</option>
            <option value="ROLE_ADMIN">Administrators</option>
            <option value="ROLE_CUSTOMER">Customers</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            id="admin-users-status-filter"
            aria-label="Filter by account status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="DISABLED">Disabled only</option>
          </select>

          {/* Result Count Indicator */}
          <span className="result-count">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} shown
          </span>
        </div>

        {/* Active Filter Chips */}
        {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="active-filters-bar">
            <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '11px' }}>Active filters:</span>
            {search && (
              <span className="active-filter-chip">
                Search: &ldquo;{search}&rdquo;
                <button type="button" onClick={() => { setSearch(''); setPage(0); }} aria-label="Remove search filter">
                  ✕
                </button>
              </span>
            )}
            {roleFilter !== 'ALL' && (
              <span className="active-filter-chip">
                Role: {roleFilter === 'ROLE_ADMIN' ? 'Admin' : 'Customer'}
                <button type="button" onClick={() => setRoleFilter('ALL')} aria-label="Remove role filter">
                  ✕
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="active-filter-chip">
                Status: {statusFilter === 'ACTIVE' ? 'Active' : 'Disabled'}
                <button type="button" onClick={() => setStatusFilter('ALL')} aria-label="Remove status filter">
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

        {/* Users Table */}
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner message="Loading registered user accounts..." />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="users" size={36} style={{ color: 'var(--subtle)', marginBottom: '8px' }} />
            <h3 style={{ margin: '8px 0 4px', color: 'var(--ink)' }}>No users found</h3>
            <p style={{ margin: 0, fontSize: '12px' }}>
              No user accounts match your active search or status filters.
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
                  <th>User</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th>Account Status</th>
                  <th aria-label="Actions" style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const initials = getInitials(u.fullName, u.email);

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="user-avatar-pill">{initials}</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>
                              {u.fullName || 'User'}
                              {isSelf && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                                  (You)
                                </span>
                              )}
                            </strong>
                            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                              {u.email}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            u.role === 'ROLE_ADMIN' ? 'status-blue' : 'status-green'
                          }`}
                        >
                          {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Customer'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#4e5668', fontSize: '12px' }}>
                          {u.phone || '—'}
                        </span>
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            u.enabled ? 'status-green' : 'status-red'
                          }`}
                        >
                          {u.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => openUserModal(u)}
                            title="Inspect user details and view purchase history"
                          >
                            Profile & Orders
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => promptToggleStatus(u)}
                            disabled={isSelf}
                            style={{
                              color: isSelf
                                ? 'var(--subtle)'
                                : u.enabled
                                ? 'var(--danger)'
                                : 'var(--success)',
                              opacity: isSelf ? 0.5 : 1,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                            }}
                            title={
                              isSelf
                                ? 'You cannot disable your own administrator account'
                                : u.enabled
                                ? 'Deactivate user account'
                                : 'Re-enable user account'
                            }
                          >
                            {u.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span>
              Showing {page * 10 + 1}–{Math.min((page + 1) * 10, totalElements)} of {totalElements} users
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

      {/* ── User Details & Purchase History Modal ── */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="modal" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{selectedUser.fullName || selectedUser.email}</h2>
                <p>User ID: #{selectedUser.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedUser(null)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Profile Details Grid */}
              <div className="order-detail-meta-grid" style={{ marginBottom: '20px' }}>
                <div className="order-detail-meta-item">
                  <small>Email Address</small>
                  <b>{selectedUser.email}</b>
                </div>
                <div className="order-detail-meta-item">
                  <small>Phone Number</small>
                  <b>{selectedUser.phone || 'Not provided'}</b>
                </div>
                <div className="order-detail-meta-item">
                  <small>Assigned Role</small>
                  <div>
                    <span className={`status-pill ${selectedUser.role === 'ROLE_ADMIN' ? 'status-blue' : 'status-green'}`}>
                      {selectedUser.role === 'ROLE_ADMIN' ? 'Administrator' : 'Customer'}
                    </span>
                  </div>
                </div>
                <div className="order-detail-meta-item">
                  <small>Account Status</small>
                  <div>
                    <span className={`status-pill ${selectedUser.enabled ? 'status-green' : 'status-red'}`}>
                      {selectedUser.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="order-detail-meta-item">
                  <small>Registration Date</small>
                  <b>{formatDate(selectedUser.createdAt)}</b>
                </div>
              </div>

              {/* Purchase History Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700 }}>
                    Purchase History ({userOrders.length})
                  </span>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    Real order records from database
                  </small>
                </div>

                {ordersLoading ? (
                  <div style={{ padding: '32px 0' }}>
                    <LoadingSpinner message="Fetching user order records..." />
                  </div>
                ) : userOrders.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--canvas)', fontSize: '12px' }}>
                    This customer has not placed any orders yet.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="admin-items-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Fulfillment</th>
                          <th>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userOrders.map((ord) => (
                          <tr key={ord.id}>
                            <td>
                              <b style={{ color: 'var(--ink)' }}>
                                #{ord.id.substring(0, 8).toUpperCase()}
                              </b>
                            </td>
                            <td>{formatDate(ord.createdAt)}</td>
                            <td>
                              <b style={{ color: 'var(--ink)' }}>{formatCurrency(ord.totalAmount)}</b>
                            </td>
                            <td>{getOrderStatusBadge(ord.status)}</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  ord.paymentStatus === 'SUCCESS' ? 'status-green' : 'status-amber'
                                }`}
                              >
                                {ord.paymentStatus === 'SUCCESS' ? 'Paid' : 'COD · Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Status Change Dialog ── */}
      {confirmTarget && (
        <div
          className="modal-backdrop"
          onClick={() => !togglingStatus && setConfirmTarget(null)}
        >
          <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>
                  {confirmTarget.enabled ? 'Disable user account?' : 'Re-enable user account?'}
                </h2>
                <p>
                  Target user: <b>{confirmTarget.email}</b>
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={togglingStatus}
                onClick={() => setConfirmTarget(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal-body">
              {confirmTarget.enabled ? (
                <div className="warning-box">
                  <b>Account deactivation notice:</b>
                  <span>
                    The user will be immediately blocked from signing in or placing new orders. Existing order records and account data will remain intact in the database.
                  </span>
                </div>
              ) : (
                <p className="modal-copy">
                  Re-enabling will allow <b>{confirmTarget.email}</b> to sign in and resume purchasing in the storefront.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={togglingStatus}
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmTarget.enabled ? 'btn btn-danger' : 'btn btn-primary'}
                disabled={togglingStatus}
                onClick={handleConfirmToggle}
              >
                {togglingStatus ? (
                  <>
                    <span className="spinner" style={{ marginRight: '6px' }} />
                    Updating…
                  </>
                ) : confirmTarget.enabled ? (
                  'Confirm deactivation'
                ) : (
                  'Confirm activation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
