import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Pagination from '../../components/Pagination';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Selected Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedOrder || newStatus === selectedOrder.status) return;

    setUpdatingStatus(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.patch(`/api/admin/orders/${selectedOrder.id}/status`, {
        status: newStatus
      });
      setSuccess(`Order #${selectedOrder.id.substring(0, 8)} status changed to ${newStatus}`);
      setSelectedOrder(res.data);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.status === 'CANCELLED') {
      setError('Cannot record payment collection for a cancelled order');
      return;
    }

    setUpdatingStatus(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.put(`/api/admin/orders/${selectedOrder.id}/payment-status`, {
        paymentStatus: 'SUCCESS'
      });
      setSuccess(`COD payment marked as COLLECTED for Order #${selectedOrder.id.substring(0, 8)}`);
      setSelectedOrder(res.data);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CONFIRMED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'SHIPPED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'DELIVERED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Order & COD Management</h1>
          <p className="text-gray-400 text-sm">Review incoming customer orders, update order state, and record COD cash collections</p>
        </div>
      </div>

      <AlertMessage type="error" message={error} />
      <AlertMessage type="success" message={success} />

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold uppercase">Filter by Status:</span>
          <button
            onClick={() => { setStatusFilter(''); setPage(0); }}
            className={`btn text-xs px-3 py-1.5 ${!statusFilter ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
          >
            All
          </button>
          {ORDER_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(0); }}
              className={`btn text-xs px-3 py-1.5 ${statusFilter === st ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <LoadingSpinner message="Fetching customer orders..." />
      ) : orders.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          No orders found matching status filter.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-slate-800 text-xs uppercase text-gray-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-xs text-indigo-300 font-semibold">
                      #{order.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-semibold text-gray-300">COD</span> •{' '}
                      <span className={order.paymentStatus === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                        {order.paymentStatus === 'SUCCESS' ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenModal(order)}
                        className="btn bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 text-xs px-3 py-1"
                      >
                        Inspect & Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-800">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* Order Details & Transition Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full p-6 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Order Details</h3>
                <p className="text-xs text-gray-400 font-mono">ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Status Transition Control */}
            <form onSubmit={handleStatusUpdate} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-3">
              <label className="text-xs text-indigo-300 font-semibold uppercase block">Update Order Status State</label>
              <div className="flex items-center gap-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input-field py-2 text-sm flex-grow"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={updatingStatus || newStatus === selectedOrder.status}
                  className="btn bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-4 py-2 font-semibold"
                >
                  {updatingStatus ? 'Updating...' : 'Save Transition'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Note: Updating status to CANCELLED automatically releases locked stock back into available inventory.
              </p>
            </form>

            {/* Delivery Address */}
            {(selectedOrder.address || selectedOrder.shippingAddress) && (
              <div className="text-xs space-y-1 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                <span className="font-semibold text-gray-300 block">Shipping Address</span>
                <p className="text-gray-400">
                  {(selectedOrder.address || selectedOrder.shippingAddress).street}, {(selectedOrder.address || selectedOrder.shippingAddress).city}{(selectedOrder.address || selectedOrder.shippingAddress).state ? `, ${(selectedOrder.address || selectedOrder.shippingAddress).state}` : ''} {(selectedOrder.address || selectedOrder.shippingAddress).zip}, {(selectedOrder.address || selectedOrder.shippingAddress).country}
                </p>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Line Items</h4>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg text-xs">
                    <div>
                      <div className="font-semibold text-white">{item.productName}</div>
                      <div className="text-gray-400 font-mono">${Number(item.priceAtPurchase).toFixed(2)} &times; {item.quantity} units</div>
                    </div>
                    <div className="font-bold text-indigo-300">${(Number(item.lineTotal ?? item.subtotal ?? (item.priceAtPurchase * item.quantity))).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary & Collection Action */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-400">Payment Method: <strong className="text-white">Cash on Delivery (COD)</strong></div>
                  <div className="text-xs text-gray-400">
                    Payment Status:{' '}
                    <span className={selectedOrder.paymentStatus === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                      {selectedOrder.paymentStatus === 'SUCCESS' ? 'PAID / COLLECTED' : 'UNPAID / PENDING'}
                    </span>
                  </div>
                </div>

                {selectedOrder.paymentStatus !== 'SUCCESS' && (
                  <button
                    onClick={handleCollectPayment}
                    disabled={updatingStatus || selectedOrder.status === 'CANCELLED'}
                    className="btn bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3 py-2 font-bold"
                  >
                    {updatingStatus ? 'Updating...' : 'Mark Payment Collected'}
                  </button>
                )}
              </div>

              {selectedOrder.status === 'CANCELLED' && (
                <p className="text-[11px] text-rose-400 font-semibold">
                  ⚠️ Payment collection is disabled because this order has been cancelled.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <div className="text-xs text-gray-400">Grand Total</div>
              <div className="text-lg font-bold text-white">${selectedOrder.totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
