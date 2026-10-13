import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';
import { Icon } from '../../components/Icon';
import { useProductRealtime } from '../../hooks/useProductRealtime';
import { filterApprovedCategories } from '../../constants/categories';

export const AdminInventoryPage = () => {
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
  const [quantity, setQuantity] = useState(5);
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
      setError(err.response?.data?.message || 'Failed to load inventory records');
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

  // Real-time synchronization for inventory
  useProductRealtime({
    onChange: () => {
      fetchInventory();
    },
  });

  // Calculate inventory metrics from current page and server totals
  const inventoryCounts = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let inStock = 0;

    items.forEach((item) => {
      if (item.stockQuantity === 0) outOfStock++;
      else if (item.stockQuantity <= threshold) lowStock++;
      else inStock++;
    });

    return { outOfStock, lowStock, inStock };
  }, [items, threshold]);

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
      setQuantity(5);
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

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setStockStatusFilter('ALL');
    setThreshold(10);
    setPage(0);
  };

  const REASON_SUGGESTIONS = [
    'Restock shipment received from supplier',
    'Physical inventory count reconciliation',
    'Damaged or defective goods written off',
    'Customer return restored to stock',
  ];

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  const selectedCategoryObj = categoryId
    ? categories.find((c) => c.id === Number(categoryId))
    : null;

  return (
    <div className="admin-content">
      {/* ── Intro Header ── */}
      <div className="admin-intro">
        <div>
          <h2>Inventory & Stock</h2>
          <p>Monitor warehouse levels, configure stock thresholds, and log auditable adjustments.</p>
        </div>
      </div>

      {/* Alerts */}
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

      {/* ── Inventory Metric Cards ── */}
      <div className="metric-grid" style={{ marginBottom: '20px' }}>
        <article className="metric-card">
          <span>
            <Icon name="box" size={20} />
          </span>
          <div>
            <small>Total Tracked Items</small>
            <strong>{totalElements}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span>
            <Icon name="check" size={20} />
          </span>
          <div>
            <small>In Stock (Healthy)</small>
            <strong>{inventoryCounts.inStock}</strong>
          </div>
        </article>

        <article className="metric-card">
          <span
            style={
              inventoryCounts.lowStock > 0
                ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
                : {}
            }
          >
            <Icon name="grid" size={20} />
          </span>
          <div>
            <small>Low-Stock Attention</small>
            <strong style={inventoryCounts.lowStock > 0 ? { color: 'var(--warning)' } : {}}>
              {inventoryCounts.lowStock}
            </strong>
          </div>
        </article>

        <article className="metric-card">
          <span
            style={
              inventoryCounts.outOfStock > 0
                ? { background: 'var(--danger-soft)', color: 'var(--danger)' }
                : {}
            }
          >
            <Icon name="bag" size={20} />
          </span>
          <div>
            <small>Out of Stock</small>
            <strong style={inventoryCounts.outOfStock > 0 ? { color: 'var(--danger)' } : {}}>
              {inventoryCounts.outOfStock}
            </strong>
          </div>
        </article>
      </div>

      {/* ── Main Panel ── */}
      <section className="panel">
        {/* Filters Bar */}
        <div className="filters">
          {/* Search Box */}
          <label className="admin-search" style={{ minWidth: '220px', maxWidth: '300px' }}>
            <Icon name="search" size={16} />
            <input
              id="admin-inventory-search"
              type="text"
              placeholder="Search product name..."
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

          {/* Category Dropdown */}
          <select
            id="admin-inventory-category-select"
            aria-label="Filter by category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Stock Health Select */}
          <select
            aria-label="Filter by stock health"
            value={stockStatusFilter}
            onChange={(e) => {
              setStockStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All stock levels</option>
            <option value="IN_STOCK">In stock (&gt; {threshold})</option>
            <option value="LOW_STOCK">Low stock (≤ {threshold})</option>
            <option value="OUT_OF_STOCK">Out of stock (0)</option>
          </select>

          {/* Configurable Threshold Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
            <span>Threshold:</span>
            <input
              id="admin-inventory-threshold-input"
              type="number"
              min="0"
              aria-label="Low stock threshold"
              value={threshold}
              onChange={(e) => {
                setThreshold(Math.max(0, parseInt(e.target.value, 10) || 0));
                setPage(0);
              }}
              style={{
                width: '60px',
                height: '38px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--line-strong)',
                fontSize: '12px',
                textAlign: 'center',
                color: 'var(--ink)',
              }}
            />
          </div>

          {/* Result Count Indicator */}
          <span className="result-count">
            {totalElements} {totalElements === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* Active Filter Chips */}
        {(search || selectedCategoryObj || stockStatusFilter !== 'ALL') && (
          <div className="active-filters-bar">
            <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '11px' }}>Active filters:</span>
            {search && (
              <span className="active-filter-chip">
                Search: &ldquo;{search}&rdquo;
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(0);
                  }}
                  aria-label="Remove search"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedCategoryObj && (
              <span className="active-filter-chip">
                Category: {selectedCategoryObj.name}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId('');
                    setPage(0);
                  }}
                  aria-label="Remove category"
                >
                  ✕
                </button>
              </span>
            )}
            {stockStatusFilter !== 'ALL' && (
              <span className="active-filter-chip">
                Level: {stockStatusFilter.replace(/_/g, ' ')}
                <button
                  type="button"
                  onClick={() => {
                    setStockStatusFilter('ALL');
                    setPage(0);
                  }}
                  aria-label="Remove level filter"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '2px 8px', marginLeft: 'auto' }}
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Inventory Table */}
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner message="Loading warehouse inventory records..." />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="box" size={36} style={{ color: 'var(--subtle)', marginBottom: '8px' }} />
            <h3 style={{ margin: '8px 0 4px', color: 'var(--ink)' }}>No inventory records found</h3>
            <p style={{ margin: 0, fontSize: '12px' }}>
              No products match your active search, category, or stock status filters.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
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
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Available Stock</th>
                  <th>Health Indicator</th>
                  <th>Status</th>
                  <th aria-label="Actions" style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isZero = item.stockQuantity === 0;
                  const isLow = !isZero && item.stockQuantity <= threshold;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>
                            {item.name}
                          </strong>
                          <small style={{ color: 'var(--muted)', fontSize: '10px' }}>
                            ID: #{item.id ? item.id.substring(0, 8).toUpperCase() : '—'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#4e5668', fontWeight: 500 }}>
                          {item.category?.name || item.categoryName || 'Uncategorized'}
                        </span>
                      </td>
                      <td>
                        <b style={{ color: 'var(--ink)' }}>
                          ₹{Number(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </b>
                      </td>
                      <td>
                        <b className={isZero ? 'danger-text' : ''} style={{ fontSize: '13px' }}>
                          {item.stockQuantity} {item.stockQuantity === 1 ? 'unit' : 'units'}
                        </b>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isZero
                              ? 'status-red'
                              : isLow
                              ? 'status-amber'
                              : 'status-green'
                          }`}
                        >
                          {isZero
                            ? 'Out of stock'
                            : isLow
                            ? `Low stock (≤ ${threshold})`
                            : 'In stock'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            item.enabled ? 'status-green' : 'status-red'
                          }`}
                        >
                          {item.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => openAdjustModal(item)}
                            title="Adjust stock quantity"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => openHistoryModal(item)}
                            title="View audited stock adjustment history"
                          >
                            History
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="pagination">
            <span>
              Showing {page * 10 + 1}–{Math.min((page + 1) * 10, totalElements)} of {totalElements} items
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

      {/* ── Stock Adjustment Modal ── */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => !submitting && setSelectedProduct(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Adjust inventory</h2>
                <p>Review the projected stock before confirming the change.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={submitting}
                onClick={() => setSelectedProduct(null)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body">
                {/* Product Name Header */}
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: 'var(--ink)', fontSize: '15px', display: 'block' }}>
                    {selectedProduct.name}
                  </strong>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    {selectedProduct.category?.name || 'Catalog product'} · Current inventory:{' '}
                    <b>{selectedProduct.stockQuantity} units</b>
                  </small>
                </div>

                {/* Projected Result Preview */}
                <div className="inventory-summary">
                  <span>
                    Current quantity
                    <b>{selectedProduct.stockQuantity} units</b>
                  </span>
                  <Icon name="arrow" size={20} />
                  <span>
                    Resulting quantity
                    <b style={isNegativeStockError ? { color: 'var(--danger)' } : {}}>
                      {projectedStock} units
                    </b>
                  </span>
                </div>

                {formError && (
                  <div className="inline-error" style={{ marginBottom: '16px' }}>
                    <b>Validation error</b>
                    <span>{formError}</span>
                  </div>
                )}

                {/* Form Grid */}
                <div className="form-grid">
                  <label>
                    <span>Adjustment type *</span>
                    <select
                      value={adjustmentType}
                      onChange={(e) => {
                        setAdjustmentType(e.target.value);
                        setFormError('');
                      }}
                    >
                      <option value="ADD">ADD (+) — Increase available stock</option>
                      <option value="SUBTRACT">SUBTRACT (-) — Decrease stock quantity</option>
                      <option value="SET">SET (=) — Set absolute quantity</option>
                    </select>
                  </label>

                  <label>
                    <span>Quantity amount *</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0));
                        setFormError('');
                      }}
                    />
                  </label>

                  <label className="span-2">
                    <span>Audit reason *</span>
                    <textarea
                      required
                      rows={2}
                      placeholder="Explain the operational reason for this inventory adjustment..."
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setFormError('');
                      }}
                    />
                  </label>

                  {/* Suggestion Pills */}
                  <div className="span-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <small style={{ color: 'var(--muted)', width: '100%', fontSize: '11px' }}>Quick audit reasons:</small>
                    {REASON_SUGGESTIONS.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        className="suggestion-pill"
                        onClick={() => setReason(sug)}
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="modal-copy">
                  The UI prevents negative resulting quantities; the backend remains the source of truth for stock validation.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setSelectedProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || isNegativeStockError}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ marginRight: '6px' }} />
                      Updating…
                    </>
                  ) : (
                    'Confirm adjustment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Audit History Modal ── */}
      {historyProduct && (
        <div className="modal-backdrop" onClick={() => setHistoryProduct(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Stock adjustment history</h2>
                <p>Audited records for &ldquo;{historyProduct.name}&rdquo;</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setHistoryProduct(null)}
                aria-label="Close dialog"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '0' }}>
              {historyLoading ? (
                <div style={{ padding: '40px 0' }}>
                  <LoadingSpinner message="Fetching audited adjustment logs..." />
                </div>
              ) : historyItems.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  No manual adjustment history found for this product.
                </div>
              ) : (
                <div className="inventory-history-list">
                  {historyItems.map((adj) => {
                    const delta = adj.quantityDelta != null ? adj.quantityDelta : 0;
                    const deltaFormatted = delta >= 0 ? `+${delta}` : `${delta}`;

                    return (
                      <div key={adj.id} className="inventory-history-item">
                        <div className="inventory-history-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className={`status-pill ${
                                adj.adjustmentType === 'ADD'
                                  ? 'status-green'
                                  : adj.adjustmentType === 'SUBTRACT'
                                  ? 'status-red'
                                  : 'status-blue'
                              }`}
                            >
                              {adj.adjustmentType} ({deltaFormatted})
                            </span>
                            <strong style={{ color: 'var(--ink)' }}>
                              {adj.previousQuantity} → {adj.newQuantity} units
                            </strong>
                          </div>
                          <span className="inventory-history-meta">
                            {formatDate(adj.createdAt)}
                          </span>
                        </div>

                        <div className="inventory-history-reason">
                          &ldquo;{adj.reason}&rdquo;
                        </div>

                        <span className="inventory-history-meta">
                          Performed by: <b>{adj.performedByEmail || 'Administrator'}</b>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHistoryProduct(null)}
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

export default AdminInventoryPage;
