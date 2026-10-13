import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Pagination from '../../components/Pagination';
import AdminSummaryCard from '../../components/AdminSummaryCard';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Summary Metrics
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

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
    setMetricsLoading(true);
    try {
      const dashRes = await apiClient.get('/api/admin/dashboard');
      const usersRes = await apiClient.get('/api/admin/users', { params: { page: 0, size: 50 } });
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
    } finally {
      setMetricsLoading(false);
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
        ...(search.trim() && { search: search.trim() })
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
    if (!confirmTarget) return;

    setTogglingStatus(true);
    setError('');
    setSuccess('');
    try {
      const newEnabled = !confirmTarget.enabled;
      const res = await apiClient.patch(`/api/admin/users/${confirmTarget.id}/status`, {
        enabled: newEnabled
      });

      setSuccess(`User "${confirmTarget.email}" status updated to ${newEnabled ? 'Active' : 'Disabled'}`);
      
      if (selectedUser?.id === confirmTarget.id) {
        setSelectedUser(res.data);
      }
      setConfirmTarget(null);
      fetchUsers();
      fetchMetrics();
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
        params: { page: 0, size: 10 }
      });
      setUserOrders(res.data.content || []);
    } catch (err) {
      console.error('Failed to fetch user orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Filter in UI by Role or Status if selected
  const displayedUsers = users.filter((u) => {
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'ADMIN' && u.role !== 'ROLE_ADMIN') return false;
      if (roleFilter === 'USER' && u.role === 'ROLE_ADMIN') return false;
    }
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && !u.enabled) return false;
      if (statusFilter === 'DISABLED' && u.enabled) return false;
    }
    return true;
  });

  return (
    <div className="adm-page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* ── 1. Page Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.025em', margin: 0 }}>
            User Account Administration
          </h1>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: '700',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              color: '#c4b5fd',
              border: '1px solid rgba(139, 92, 246, 0.35)',
            }}
          >
            Access Control
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, maxWidth: '650px' }}>
          Inspect registered customer profiles, oversee system permissions, and manage account access status.
        </p>
      </div>

      {/* ── 2. Alerts ── */}
      <AlertMessage type="error" message={error} onClose={() => setError('')} />
      <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

      {/* ── 3. Summary Metric Cards Grid ── */}
      <div
        className="adm-grid-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        <AdminSummaryCard
          title="Total Registered Users"
          value={metrics?.totalUsers ?? totalElements}
          icon="👥"
          subtitle="All platform customer accounts"
          color="indigo"
          loading={metricsLoading}
        />
        <AdminSummaryCard
          title="System Administrators"
          value={metrics?.adminCount ?? 0}
          icon="👑"
          subtitle="Users with ROLE_ADMIN privileges"
          color="purple"
          loading={metricsLoading}
        />
        <AdminSummaryCard
          title="Active Accounts"
          value={metrics?.activeCount ?? 0}
          icon="✅"
          subtitle="Enabled accounts with login access"
          color="emerald"
          loading={metricsLoading}
        />
      </div>

      {/* ── 4. Search & Filter Toolbar ── */}
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
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px' }}>
          <input
            type="text"
            placeholder="Search users by email or full name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{
              width: '100%',
              backgroundColor: '#070d1e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '0.55rem 2rem 0.55rem 2.2rem',
              fontSize: '0.8rem',
              color: '#ffffff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', pointerEvents: 'none' }}>
            🔍
          </span>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(0); }}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Role:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                backgroundColor: '#070d1e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                outline: 'none',
              }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins Only</option>
              <option value="USER">Customers Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: '#070d1e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                outline: 'none',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 5. Users Table Section ── */}
      {loading ? (
        <div style={{ padding: '3rem', backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner message="Retrieving user accounts..." />
        </div>
      ) : displayedUsers.length === 0 ? (
        <div style={{ padding: '3.5rem 2rem', textAlign: 'center', backgroundColor: '#0b1329', border: '1px solid #1e293b', borderRadius: '12px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👤</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', margin: '0 0 0.5rem 0' }}>No user accounts found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            {search
              ? `No user records matching search "${search}".`
              : 'There are no user accounts matching the selected criteria.'}
          </p>
          {(search || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setRoleFilter('ALL'); setStatusFilter('ALL'); setPage(0); }}
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
              minWidth: '850px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#070d1e', borderBottom: '1px solid #1e293b' }}>
                <th style={{ width: '280px', minWidth: '280px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                  User / Profile
                </th>
                <th style={{ width: '140px', minWidth: '140px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Role
                </th>
                <th style={{ width: '140px', minWidth: '140px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  Joined Date
                </th>
                <th style={{ width: '130px', minWidth: '130px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'center' }}>
                  Account Status
                </th>
                <th style={{ width: '160px', minWidth: '160px', padding: '0.9rem 1rem', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isAdmin = u.role === 'ROLE_ADMIN';
                const initial = (u.fullName?.charAt(0) || u.email?.charAt(0) || 'U').toUpperCase();

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(30, 41, 59, 0.7)',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    {/* User / Profile (Email primary, Name secondary; NO UUID in row) */}
                    <td style={{ width: '280px', minWidth: '280px', padding: '1rem', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            backgroundColor: isAdmin ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            color: isAdmin ? '#c4b5fd' : '#a5b4fc',
                            border: `1px solid ${isAdmin ? 'rgba(139, 92, 246, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.email}>
                            {u.email}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.fullName || 'No name set'}>
                            {u.fullName || <span style={{ color: '#64748b', fontStyle: 'italic' }}>No name set</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td style={{ width: '140px', minWidth: '140px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          backgroundColor: isAdmin ? 'rgba(139, 92, 246, 0.15)' : 'rgba(51, 65, 85, 0.5)',
                          color: isAdmin ? '#c4b5fd' : '#cbd5e1',
                          border: `1px solid ${isAdmin ? 'rgba(139, 92, 246, 0.35)' : 'rgba(71, 85, 105, 0.6)'}`,
                        }}
                      >
                        {isAdmin ? '👑 Admin' : '👤 Customer'}
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td style={{ width: '140px', minWidth: '140px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.8rem' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Account Status Badge */}
                    <td style={{ width: '130px', minWidth: '130px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          letterSpacing: '0.025em',
                          backgroundColor: u.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.enabled ? '#6ee7b7' : '#fca5a5',
                          border: `1px solid ${u.enabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                        }}
                      >
                        {u.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    {/* Actions: View Details and Enable/Disable */}
                    <td style={{ width: '160px', minWidth: '160px', padding: '1rem', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => openUserModal(u)}
                          style={{
                            padding: '0.4rem 0.75rem',
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
                          View Details
                        </button>

                        <button
                          disabled={isSelf || togglingStatus}
                          onClick={() => promptToggleStatus(u)}
                          title={isSelf ? 'You cannot disable your own admin account' : undefined}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            border: '1px solid',
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                            opacity: isSelf ? 0.4 : 1,
                            backgroundColor: isSelf
                              ? '#1e293b'
                              : u.enabled
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isSelf
                              ? '#64748b'
                              : u.enabled
                              ? '#fca5a5'
                              : '#6ee7b7',
                            borderColor: isSelf
                              ? '#334155'
                              : u.enabled
                              ? 'rgba(239, 68, 68, 0.35)'
                              : 'rgba(16, 185, 129, 0.35)',
                            transition: 'all 0.15s ease',
                          }}
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
              Showing <strong style={{ color: '#ffffff' }}>{displayedUsers.length}</strong> of{' '}
              <strong style={{ color: '#ffffff' }}>{totalElements}</strong> users
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* ── 6. View Details & Order History Modal ── */}
      {selectedUser && (
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
              maxWidth: '650px',
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
                    {selectedUser.email}
                  </h3>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      backgroundColor: selectedUser.enabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: selectedUser.enabled ? '#4ade80' : '#f87171',
                      border: `1px solid ${selectedUser.enabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    }}
                  >
                    {selectedUser.enabled ? 'Active Account' : 'Disabled Account'}
                  </span>
                </div>
                {/* User ID displayed only inside View Details Modal */}
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.35rem' }}>
                  User UUID: {selectedUser.id}
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
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

            {/* Profile Overview Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.4)', padding: '1rem', borderRadius: '10px', border: '1px solid #1e293b', fontSize: '0.8rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Full Name</span>
                <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{selectedUser.fullName || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Assigned Role</span>
                <strong style={{ color: selectedUser.role === 'ROLE_ADMIN' ? '#c4b5fd' : '#93c5fd', fontSize: '0.9rem' }}>
                  {selectedUser.role === 'ROLE_ADMIN' ? '👑 Administrator' : '👤 Customer'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Account Status</span>
                <strong style={{ color: selectedUser.enabled ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
                  {selectedUser.enabled ? 'Enabled' : 'Disabled'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Registration Date</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Quick Status Control */}
            <div style={{ padding: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>Account Access Control</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  {selectedUser.enabled
                    ? 'Disabling will prevent this customer from logging in or placing orders.'
                    : 'Enabling restores full login access and customer account features.'}
                </div>
              </div>

              <button
                disabled={selectedUser.id === currentUser?.id || togglingStatus}
                onClick={() => promptToggleStatus(selectedUser)}
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid',
                  cursor: (selectedUser.id === currentUser?.id || togglingStatus) ? 'not-allowed' : 'pointer',
                  opacity: (selectedUser.id === currentUser?.id || togglingStatus) ? 0.4 : 1,
                  backgroundColor: selectedUser.id === currentUser?.id
                    ? '#1e293b'
                    : selectedUser.enabled
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                  color: selectedUser.id === currentUser?.id
                    ? '#64748b'
                    : selectedUser.enabled
                    ? '#fca5a5'
                    : '#6ee7b7',
                  borderColor: selectedUser.id === currentUser?.id
                    ? '#334155'
                    : selectedUser.enabled
                    ? 'rgba(239, 68, 68, 0.35)'
                    : 'rgba(16, 185, 129, 0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedUser.enabled ? 'Disable Account Access' : 'Enable Account Access'}
              </button>
            </div>

            {/* Customer Past Order History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                  Customer Order History
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{userOrders.length} order(s)</span>
              </div>

              {ordersLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <LoadingSpinner message="Fetching user order records..." />
                </div>
              ) : userOrders.length === 0 ? (
                <div style={{ padding: '1.5rem', backgroundColor: 'rgba(30, 41, 59, 0.3)', borderRadius: '8px', border: '1px solid #1e293b', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                  No orders on record for this customer.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {userOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'rgba(30, 41, 59, 0.4)',
                        borderRadius: '8px',
                        border: '1px solid #1e293b',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: '#ffffff', fontFamily: 'monospace' }}>Order #{ord.id.substring(0, 8)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {new Date(ord.createdAt).toLocaleDateString()} &bull; {ord.items?.length || 0} item(s)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '0.85rem' }}>₹{Number(ord.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase' }}>
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Confirmation Modal for Destructive/Access-Changing Action ── */}
      {confirmTarget && (
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
            zIndex: 1100,
          }}
        >
          <div
            className="adm-modal-card"
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  backgroundColor: confirmTarget.enabled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${confirmTarget.enabled ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                }}
              >
                {confirmTarget.enabled ? '⚠️' : '🔓'}
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  {confirmTarget.enabled ? 'Disable Account Access?' : 'Enable Account Access?'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>{confirmTarget.email}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45', margin: 0 }}>
              {confirmTarget.enabled
                ? `Disabling will immediately revoke login access for "${confirmTarget.email}". They will not be able to log in or create orders until re-enabled.`
                : `Enabling will restore full system access for "${confirmTarget.email}", allowing them to log in and place orders.`}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={togglingStatus}
                onClick={handleConfirmToggle}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: confirmTarget.enabled ? '#ef4444' : '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: togglingStatus ? 'not-allowed' : 'pointer',
                  opacity: togglingStatus ? 0.6 : 1,
                }}
              >
                {togglingStatus
                  ? 'Processing...'
                  : confirmTarget.enabled
                  ? 'Yes, Disable Account'
                  : 'Yes, Enable Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
