import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Pagination from '../../components/Pagination';

export default function AdminInventoryPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [threshold, setThreshold] = useState(10);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('ADD');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Audit History Modal
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [page, search, categoryId, lowStockOnly, threshold]);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = lowStockOnly ? '/api/admin/inventory/low-stock' : '/api/admin/inventory';
      const params = {
        page,
        size: 10,
        threshold,
        ...(search && { search }),
        ...(categoryId && { categoryId })
      };
      const res = await apiClient.get(endpoint, { params });
      setItems(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide an audit reason for the adjustment.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/api/admin/inventory/adjust', {
        productId: selectedProduct.id,
        type: adjustmentType,
        amount: parseInt(quantity, 10),
        reason
      });
      setSuccess(`Inventory for "${selectedProduct.name}" updated successfully.`);
      setSelectedProduct(null);
      setReason('');
      setQuantity(1);
      fetchInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoryModal = async (product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/api/admin/inventory/adjustments', {
        params: { productId: product.id, page: 0, size: 20 }
      });
      setHistoryItems(res.data.content || []);
    } catch (err) {
      console.error('Failed to load adjustment history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory & Stock Control</h1>
          <p className="text-gray-400 text-sm">Monitor stock levels, set low-stock thresholds, and perform manual adjustments</p>
        </div>
      </div>

      <AlertMessage type="error" message={error} />
      <AlertMessage type="success" message={success} />

      {/* Controls / Filter Bar */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Search Product</label>
          <input
            type="text"
            placeholder="Name or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="input-field py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
            className="input-field py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Low-Stock Threshold ({threshold})</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
              className="input-field py-2 text-sm w-24"
            />
            <button
              onClick={() => { setLowStockOnly(!lowStockOnly); setPage(0); }}
              className={`btn text-xs font-semibold px-3 py-2 ${
                lowStockOnly ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-700 text-gray-300'
              }`}
            >
              {lowStockOnly ? 'Low Stock Only (Active)' : 'Filter Low Stock'}
            </button>
          </div>
        </div>

        <div className="flex justify-end items-end h-full">
          <button
            onClick={() => { setSearch(''); setCategoryId(''); setLowStockOnly(false); setPage(0); }}
            className="btn bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs px-3 py-2"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <LoadingSpinner message="Loading inventory items..." />
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          No inventory records found matching criteria.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-slate-800 text-xs uppercase text-gray-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((item) => {
                  const isLow = item.stockQuantity <= threshold;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-xs text-gray-500">ID: {item.id.substring(0, 8)}...</div>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {item.category?.name || item.categoryName || 'Uncategorized'}
                      </td>
                      <td className="py-3 px-4 text-indigo-300 font-medium">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.stockQuantity === 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isLow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {item.stockQuantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${item.enabled ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className="text-xs">{item.enabled ? 'Active' : 'Disabled'}</span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedProduct(item)}
                          className="btn bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 text-xs px-2.5 py-1"
                        >
                          Adjust Stock
                        </button>
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="btn bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs px-2.5 py-1"
                        >
                          History
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

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl space-y-4">
            <h3 className="text-lg font-bold text-white">Adjust Stock — {selectedProduct.name}</h3>
            <p className="text-xs text-gray-400">Current Stock: <span className="text-emerald-400 font-bold">{selectedProduct.stockQuantity} units</span></p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Adjustment Action</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="ADD">ADD (+) — Increase stock</option>
                  <option value="SUBTRACT">SUBTRACT (-) — Decrease stock</option>
                  <option value="SET">SET (=) — Set absolute quantity</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input-field py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Audit Reason (Required)</label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Restock shipment received, Warehouse damage audit..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="btn bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 font-semibold"
                >
                  {submitting ? 'Applying...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="card max-w-2xl w-full p-6 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Adjustment Audit — {historyProduct.name}</h3>
              <button
                onClick={() => setHistoryProduct(null)}
                className="text-gray-400 hover:text-white text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {historyLoading ? (
              <LoadingSpinner message="Fetching audit logs..." />
            ) : historyItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No adjustment audit entries for this product.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {historyItems.map((adj) => (
                  <div key={adj.id} className="p-3 bg-slate-800/60 rounded-lg text-xs flex justify-between items-start border border-slate-700/50">
                    <div>
                      <div className="font-semibold text-indigo-300">
                        {adj.adjustmentType} {adj.quantity} units (Prev: {adj.previousStock} &rarr; New: {adj.newStock})
                      </div>
                      <div className="text-gray-300 mt-1">&ldquo;{adj.reason}&rdquo;</div>
                      <div className="text-gray-500 text-[10px] mt-1">Adjusted by: {adj.adjustedByEmail || adj.adjustedBy}</div>
                    </div>
                    <div className="text-gray-400 text-[11px] whitespace-nowrap">
                      {new Date(adj.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
