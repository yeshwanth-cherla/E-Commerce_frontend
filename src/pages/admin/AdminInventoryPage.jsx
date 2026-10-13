import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import Pagination from '../../components/Pagination';
import { useProductRealtime } from '../../hooks/useProductRealtime';
import { filterApprovedCategories } from '../../constants/categories';

export default function AdminInventoryPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  const [threshold, setThreshold] = useState(10);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('ADD'); // 'ADD' | 'SUBTRACT' | 'SET'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Audit History Modal
  const [historyProduct, setHistoryProduct] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/categories');
      setCategories(filterApprovedCategories(res.data || []));
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  // Load inventory items
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const isLowStockEndpoint = stockStatusFilter === 'LOW_STOCK';
      const endpoint = isLowStockEndpoint ? '/api/admin/inventory/low-stock' : '/api/admin/inventory';
      const params = {
        page,
        size: 10,
        threshold: Number(threshold) >= 0 ? Number(threshold) : 10,
        ...(search.trim() && { search: search.trim() }),
        ...(categoryId && { categoryId: Number(categoryId) }),
      };

      const res = await apiClient.get(endpoint, { params });
      let content = res.data.content || [];

      // Filter locally for specific client stock statuses if requested
      if (stockStatusFilter === 'OUT_OF_STOCK') {
        content = content.filter((item) => item.stockQuantity === 0);
      } else if (stockStatusFilter === 'IN_STOCK') {
        content = content.filter((item) => item.stockQuantity > Number(threshold));
      }

      setItems(content);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      console.error('Failed to load inventory', err);
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId, stockStatusFilter, threshold]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Real-time synchronization for Admin Inventory & stock updates
  useProductRealtime({
    onChange: () => {
      fetchInventory();
    },
  });

  // Calculate projected stock for selected product adjustment
  const projectedStock = useMemo(() => {
    if (!selectedProduct) return 0;
    const current = selectedProduct.stockQuantity || 0;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) return current;

    if (adjustmentType === 'SET') return qty;
    if (adjustmentType === 'ADD') return current + qty;
    if (adjustmentType === 'SUBTRACT') return current - qty;
    return current;
  }, [selectedProduct, adjustmentType, quantity]);

  // Check if current adjustment makes stock negative
  const isNegativeStockError = useMemo(() => {
    if (!selectedProduct) return false;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) return false;
    if (adjustmentType === 'SUBTRACT' && qty > selectedProduct.stockQuantity) return true;
    if (adjustmentType === 'SET' && qty < 0) return true;
    return false;
  }, [selectedProduct, adjustmentType, quantity]);

  // Open Stock Adjustment Modal
  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustmentType('ADD');
    setQuantity(5);
    setReason('');
    setFormError('');
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      setFormError('Quantity must be a non-negative whole number (0 or higher).');
      return;
    }

    if (adjustmentType === 'SUBTRACT' && qty > selectedProduct.stockQuantity) {
      setFormError(
        `Cannot subtract ${qty} units. Current stock is only ${selectedProduct.stockQuantity} units.`
      );
      return;
    }

    if (!reason.trim()) {
      setFormError('Please provide an audit reason for this inventory adjustment.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/api/admin/inventory/adjust', {
        productId: selectedProduct.id,
        type: adjustmentType,
        amount: qty,
        reason: reason.trim(),
      });

      setSuccess(
        `Inventory for "${selectedProduct.name}" updated successfully: ${selectedProduct.stockQuantity} → ${projectedStock} units.`
      );
      setSelectedProduct(null);
      setReason('');
      setQuantity(1);
      await fetchInventory();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Adjust stock error:', err);
      setFormError(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Audit History Modal
  const openHistoryModal = async (product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/api/admin/inventory/adjustments', {
        params: { productId: product.id, page: 0, size: 25 },
      });
      setHistoryItems(res.data.content || []);
    } catch (err) {
      console.error('Failed to load adjustment history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setStockStatusFilter('ALL');
    setThreshold(10);
    setPage(0);
  };

  // Common quick audit reason suggestions
  const REASON_SUGGESTIONS = [
    'Restock shipment received from supplier',
    'Periodic physical inventory count reconciliation',
    'Damaged or defective goods written off',
    'Customer return returned to warehouse stock',
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inventory & Stock Control</h1>
          <p style={styles.subtitle}>
            Monitor real-time warehouse levels, configure low-stock alerts, and log audited adjustments.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Controls & Filter Bar */}
      <div style={styles.card}>
        <div style={styles.filterGrid}>
          {/* Search Input */}
          <div style={styles.filterCol}>
            <label style={styles.filterLabel}>Search Product</label>
            <div style={styles.inputWrap}>
              <span style={{ color: '#64748b' }}>🔍</span>
              <input
                id="admin-inventory-search"
                type="text"
                placeholder="Product name or description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                style={styles.innerInput}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(0);
                  }}
                  style={styles.clearBtn}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div style={styles.filterCol}>
            <label style={styles.filterLabel}>Category</label>
            <select
              id="admin-inventory-category-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(0);
              }}
              style={styles.select}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Low-Stock Threshold Input */}
          <div style={styles.filterCol}>
            <label style={styles.filterLabel}>
              Low-Stock Threshold ({threshold} units)
            </label>
            <input
              id="admin-inventory-threshold-input"
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => {
                setThreshold(Math.max(0, parseInt(e.target.value, 10) || 0));
                setPage(0);
              }}
              style={styles.input}
            />
          </div>

          {/* Reset Filters */}
          <div style={{ ...styles.filterCol, justifyContent: 'flex-end' }}>
            <button
              onClick={handleResetFilters}
              style={styles.secBtn}
              title="Reset all filters to defaults"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Stock Status Selector Tabs */}
        <div style={styles.statusTabsRow}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '600' }}>
            Stock Health:
          </span>
          <div style={styles.statusTabsGroup}>
            <button
              type="button"
              onClick={() => {
                setStockStatusFilter('ALL');
                setPage(0);
              }}
              style={{
                ...styles.tabBtn,
                backgroundColor: stockStatusFilter === 'ALL' ? '#6366f1' : '#1e293b',
                color: stockStatusFilter === 'ALL' ? '#ffffff' : '#94a3b8',
              }}
            >
              All Levels
            </button>
            <button
              type="button"
              onClick={() => {
                setStockStatusFilter('IN_STOCK');
                setPage(0);
              }}
              style={{
                ...styles.tabBtn,
                backgroundColor: stockStatusFilter === 'IN_STOCK' ? '#22c55e' : '#1e293b',
                color: stockStatusFilter === 'IN_STOCK' ? '#ffffff' : '#94a3b8',
              }}
            >
              In Stock (&gt; {threshold})
            </button>
            <button
              type="button"
              onClick={() => {
                setStockStatusFilter('LOW_STOCK');
                setPage(0);
              }}
              style={{
                ...styles.tabBtn,
                backgroundColor: stockStatusFilter === 'LOW_STOCK' ? '#f59e0b' : '#1e293b',
                color: stockStatusFilter === 'LOW_STOCK' ? '#ffffff' : '#94a3b8',
              }}
            >
              ⚠️ Low Stock (≤ {threshold})
            </button>
            <button
              type="button"
              onClick={() => {
                setStockStatusFilter('OUT_OF_STOCK');
                setPage(0);
              }}
              style={{
                ...styles.tabBtn,
                backgroundColor: stockStatusFilter === 'OUT_OF_STOCK' ? '#ef4444' : '#1e293b',
                color: stockStatusFilter === 'OUT_OF_STOCK' ? '#ffffff' : '#94a3b8',
              }}
            >
              ⛔ Out of Stock (0)
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table Card */}
      <div style={styles.tableCard}>
        <div style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          Showing <strong>{items.length}</strong> product{items.length === 1 ? '' : 's'} on page{' '}
          <strong>{page + 1}</strong> of <strong>{Math.max(totalPages, 1)}</strong> ({totalElements} total in catalogue)
        </div>

        {loading ? (
          <LoadingSpinner message="Loading warehouse inventory records..." />
        ) : items.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗃️</div>
            <h3 style={{ color: '#f8fafc', marginBottom: '0.3rem' }}>No inventory records found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              No products match your current search, category, or stock status filters.
            </p>
            <button onClick={handleResetFilters} style={{ ...styles.secBtn, marginTop: '1rem' }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Price</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Stock Health</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Catalogue Status</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isZero = item.stockQuantity === 0;
                  const isLow = !isZero && item.stockQuantity <= threshold;

                  return (
                    <tr key={item.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={styles.prodIcon}>📦</div>
                          <div>
                            <strong style={{ color: '#f8fafc', fontSize: '0.92rem', display: 'block' }}>
                              {item.name}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              ID: {item.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.categoryBadge}>
                          {item.category?.name || item.categoryName || 'Uncategorized'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <strong style={{ color: '#38bdf8' }}>₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span
                          style={{
                            ...styles.stockPill,
                            backgroundColor: isZero
                              ? 'rgba(239, 68, 68, 0.2)'
                              : isLow
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(34, 197, 94, 0.2)',
                            color: isZero ? '#f87171' : isLow ? '#fbbf24' : '#4ade80',
                            borderColor: isZero ? 'rgba(239, 68, 68, 0.4)' : isLow ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.4)',
                          }}
                        >
                          {isZero
                            ? '⛔ Out of Stock'
                            : isLow
                            ? `⚠️ Low Stock (${item.stockQuantity} units)`
                            : `✅ In Stock (${item.stockQuantity} units)`}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: item.enabled
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: item.enabled ? '#4ade80' : '#f87171',
                          }}
                        >
                          {item.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openAdjustModal(item)}
                            style={styles.adjustBtn}
                            title="Adjust stock (ADD, SUBTRACT, SET)"
                          >
                            Adjust Stock
                          </button>
                          <button
                            onClick={() => openHistoryModal(item)}
                            style={styles.historyBtn}
                            title="View audited adjustment logs"
                          >
                            Audit History
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

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Adjust Stock Level</h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.productBanner}>
              <strong style={{ color: '#f8fafc', fontSize: '1rem' }}>
                {selectedProduct.name}
              </strong>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Current Warehouse Stock:{' '}
                <strong style={{ color: selectedProduct.stockQuantity === 0 ? '#f87171' : '#4ade80' }}>
                  {selectedProduct.stockQuantity} units
                </strong>
              </div>
            </div>

            {formError && (
              <div style={{ marginBottom: '1rem' }}>
                <AlertMessage type="error" message={formError} onClose={() => setFormError('')} />
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Adjustment Operation</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => {
                    setAdjustmentType(e.target.value);
                    setFormError('');
                  }}
                  style={styles.input}
                >
                  <option value="ADD">ADD (+) — Increase available stock</option>
                  <option value="SUBTRACT">SUBTRACT (-) — Decrease stock quantity</option>
                  <option value="SET">SET (=) — Set absolute quantity</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Quantity Amount</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0));
                    setFormError('');
                  }}
                  style={styles.input}
                />
              </div>

              {/* Real-time Projected Stock Preview */}
              <div
                style={{
                  ...styles.projectionBox,
                  borderColor: isNegativeStockError ? '#ef4444' : '#334155',
                  backgroundColor: isNegativeStockError
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(30, 41, 59, 0.7)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Resulting Stock Level:
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: isNegativeStockError ? '#f87171' : '#38bdf8' }}>
                  {selectedProduct.stockQuantity} → {projectedStock} units
                  {adjustmentType === 'ADD' && ` (+${quantity})`}
                  {adjustmentType === 'SUBTRACT' && ` (-${quantity})`}
                  {adjustmentType === 'SET' && ` (Set to ${quantity})`}
                </span>
                {isNegativeStockError && (
                  <span style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
                    ⚠️ Reduction exceeds available stock! Stock cannot drop below zero.
                  </span>
                )}
              </div>

              {/* Audit Reason */}
              <div style={styles.field}>
                <label style={styles.label}>
                  Audit Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Received shipment, physical inventory count reconciliation..."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setFormError('');
                  }}
                  style={styles.input}
                />
                {/* Reason Suggestions */}
                <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {REASON_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReason(sug)}
                      style={styles.suggestionPill}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  style={styles.cancelBtn}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isNegativeStockError}
                  style={{
                    ...styles.primaryBtn,
                    opacity: isNegativeStockError || submitting ? 0.6 : 1,
                    cursor: isNegativeStockError || submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Applying Adjustment...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {historyProduct && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '640px' }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Stock Adjustment Audit History</h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {historyProduct.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <LoadingSpinner message="Fetching audited adjustment logs..." />
            ) : historyItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No manual adjustment history found for this product.
              </div>
            ) : (
              <div style={styles.historyList}>
                {historyItems.map((adj) => {
                  const delta = adj.quantityDelta != null ? adj.quantityDelta : 0;
                  const deltaFormatted = delta >= 0 ? `+${delta}` : `${delta}`;

                  return (
                    <div key={adj.id} style={styles.historyItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                ...styles.adjBadge,
                                backgroundColor:
                                  adj.adjustmentType === 'ADD'
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : adj.adjustmentType === 'SUBTRACT'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : 'rgba(99, 102, 241, 0.2)',
                                color:
                                  adj.adjustmentType === 'ADD'
                                    ? '#4ade80'
                                    : adj.adjustmentType === 'SUBTRACT'
                                    ? '#f87171'
                                    : '#a5b4fc',
                              }}
                            >
                              {adj.adjustmentType} ({deltaFormatted})
                            </span>
                            <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>
                              Prev: {adj.previousStock} → New: {adj.newStock}
                            </strong>
                          </div>

                          <div style={{ color: '#cbd5e1', fontSize: '0.82rem', marginTop: '0.4rem' }}>
                            &ldquo;{adj.reason}&rdquo;
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Admin ID: {adj.performedByUserId}
                          </div>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(adj.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                style={styles.secBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: 0,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    marginTop: '0.3rem',
    marginBottom: 0,
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '1rem',
    alignItems: 'flex-end',
  },
  filterCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0 0.6rem',
  },
  innerInput: {
    flex: 1,
    padding: '0.6rem 0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f8fafc',
    fontSize: '0.88rem',
    outline: 'none',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.2rem',
  },
  input: {
    padding: '0.6rem 0.8rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.88rem',
  },
  select: {
    padding: '0.6rem 0.8rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.88rem',
  },
  secBtn: {
    padding: '0.6rem 1rem',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statusTabsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    flexWrap: 'wrap',
    paddingTop: '0.5rem',
    borderTop: '1px solid #1e293b',
  },
  statusTabsGroup: {
    display: 'flex',
    backgroundColor: '#020617',
    border: '1px solid #334155',
    borderRadius: '6px',
    overflow: 'hidden',
    flexWrap: 'wrap',
  },
  tabBtn: {
    border: 'none',
    padding: '0.5rem 0.9rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    padding: '0.75rem',
    borderBottom: '1px solid #1e293b',
  },
  tr: {
    borderBottom: '1px solid #1e293b',
  },
  td: {
    padding: '0.9rem 0.75rem',
    color: '#cbd5e1',
    fontSize: '0.88rem',
    verticalAlign: 'middle',
  },
  prodIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    backgroundColor: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
  },
  categoryBadge: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.78rem',
    border: '1px solid #334155',
  },
  stockPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '700',
    border: '1px solid transparent',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  adjustBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    color: '#818cf8',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.8rem',
  },
  historyBtn: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#cbd5e1',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.8rem',
  },
  emptyState: {
    padding: '3rem 1.5rem',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '1rem',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.75rem',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  productBanner: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.85rem',
    marginBottom: '1.2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  projectionBox: {
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.75rem 0.9rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  suggestionPill: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '10px',
    padding: '2px 7px',
    fontSize: '0.72rem',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  historyList: {
    maxHeight: '380px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  historyItem: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  adjBadge: {
    padding: '2px 7px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
};
