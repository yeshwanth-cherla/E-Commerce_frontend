import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Pagination from '../../components/Pagination';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Selected User Modal (Profile & Orders)
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        size: 10,
        ...(search && { search })
      };
      const res = await apiClient.get('/api/admin/users', { params });
      setUsers(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      setError('You cannot disable your own admin account.');
      return;
    }

    setTogglingStatus(true);
    setError('');
    setSuccess('');
    try {
      const newEnabled = !targetUser.enabled;
      const res = await apiClient.patch(`/api/admin/users/${targetUser.id}/status`, {
        enabled: newEnabled
      });
      setSuccess(`User ${targetUser.email} status updated to ${newEnabled ? 'Enabled' : 'Disabled'}`);
      
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(res.data);
      }
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setTogglingStatus(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Account Administration</h1>
          <p className="text-gray-400 text-sm">Search registered users, view profile details, and toggle account access status</p>
        </div>
      </div>

      <AlertMessage type="error" message={error} />
      <AlertMessage type="success" message={success} />

      {/* Filter Bar */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <label className="text-xs text-gray-400 block mb-1">Search User Accounts</label>
          <input
            type="text"
            placeholder="Search by email or full name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="input-field py-2 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner message="Fetching user accounts..." />
      ) : users.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          No registered user accounts found matching query.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-slate-800 text-xs uppercase text-gray-400 font-medium">
                <tr>
                  <th className="py-3 px-4">User Email / Profile</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-center">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{u.email}</div>
                        <div className="text-xs text-gray-400">{u.fullName || 'No name set'}</div>
                        <div className="text-[10px] text-gray-500 font-mono">ID: {u.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.role === 'ROLE_ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-700 text-gray-300'
                        }`}>
                          {u.role || 'ROLE_USER'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {u.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openUserModal(u)}
                          className="btn bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 text-xs px-2.5 py-1"
                        >
                          View Details
                        </button>
                        <button
                          disabled={isSelf || togglingStatus}
                          onClick={() => handleToggleStatus(u)}
                          className={`btn text-xs px-2.5 py-1 ${
                            isSelf
                              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                              : u.enabled
                              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/40'
                              : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40'
                          }`}
                        >
                          {u.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-800">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* User Details & Order History Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full p-6 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedUser.email}</h3>
                <p className="text-xs text-gray-400 font-mono">User ID: {selectedUser.id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Full Name</span>
                <span className="font-semibold text-white">{selectedUser.fullName || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Assigned Role</span>
                <span className="font-semibold text-purple-300">{selectedUser.role || 'ROLE_USER'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Account Status</span>
                <span className={`font-semibold ${selectedUser.enabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedUser.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Registration Date</span>
                <span className="font-semibold text-gray-300">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Account Status Control Action */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-400">Manage user access:</span>
              <button
                disabled={selectedUser.id === currentUser?.id || togglingStatus}
                onClick={() => handleToggleStatus(selectedUser)}
                className={`btn text-xs px-4 py-2 font-semibold ${
                  selectedUser.id === currentUser?.id
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : selectedUser.enabled
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 hover:bg-rose-600/50'
                    : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50'
                }`}
              >
                {selectedUser.enabled ? 'Disable Account Access' : 'Enable Account Access'}
              </button>
            </div>

            {/* Customer Order History */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-indigo-300 uppercase">User Order History</h4>
              {ordersLoading ? (
                <LoadingSpinner message="Fetching user order records..." />
              ) : userOrders.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No past orders on record for this user.</p>
              ) : (
                <div className="space-y-2">
                  {userOrders.map((ord) => (
                    <div key={ord.id} className="p-3 bg-slate-800/50 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-white font-mono">Order #{ord.id.substring(0, 8)}</div>
                        <div className="text-gray-400 text-[11px]">{new Date(ord.createdAt).toLocaleDateString()} &bull; {ord.items?.length || 0} item(s)</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-300">${ord.totalAmount.toFixed(2)}</div>
                        <span className="inline-block text-[10px] font-semibold text-gray-300">{ord.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
