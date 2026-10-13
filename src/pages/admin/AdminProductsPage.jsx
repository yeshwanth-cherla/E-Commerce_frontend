import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';
import { ProductImage } from '../../components/ProductImage';
import { Icon } from '../../components/Icon';
import { useProductRealtime } from '../../hooks/useProductRealtime';
import { filterApprovedCategories } from '../../constants/categories';

export const AdminProductsPage = () => {
  // Catalog & Category State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Filter & Search State
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DISABLED'

  // Product Create/Edit Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stockQuantity: '10',
    imageUrl: '',
    categoryId: '',
    enabled: true,
  });
  const [productFormErrors, setProductFormErrors] = useState({});
  const [savingProduct, setSavingProduct] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Deactivation / Activation Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    product: null,
    action: 'disable', // 'disable' | 'enable'
    loading: false,
  });

  // Load Catalog & Categories
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size: 10,
        includeDisabled: statusFilter !== 'ACTIVE',
      };

      if (activeSearch.trim()) {
        params.search = activeSearch.trim();
      }
      if (selectedCategoryId) {
        params.categoryId = Number(selectedCategoryId);
      }

      const [prodRes, catRes] = await Promise.all([
        apiClient.get('/api/products', { params }),
        apiClient.get('/api/categories'),
      ]);

      const fetchedProducts = prodRes.data.content || [];
      const displayedProducts =
        statusFilter === 'DISABLED'
          ? fetchedProducts.filter((p) => !p.enabled)
          : fetchedProducts;

      setProducts(displayedProducts);
      setTotalPages(prodRes.data.totalPages || 0);
      setTotalElements(prodRes.data.totalElements || 0);
      setCategories(filterApprovedCategories(catRes.data || []));
    } catch (err) {
      console.error('Admin catalog load error:', err);
      setError(err.response?.data?.message || 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [page, activeSearch, selectedCategoryId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Supabase Real-Time synchronization
  useProductRealtime({
    onUpdate: (newRecord) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === newRecord.id) {
            return {
              ...p,
              name: newRecord.name ?? p.name,
              price: newRecord.price != null ? Number(newRecord.price) : p.price,
              stockQuantity:
                newRecord.stock_quantity != null
                  ? Number(newRecord.stock_quantity)
                  : p.stockQuantity,
              description: newRecord.description ?? p.description,
              imageUrl: newRecord.image_url ?? p.imageUrl,
              enabled: newRecord.enabled ?? p.enabled,
            };
          }
          return p;
        })
      );
      loadData();
    },
    onInsert: () => loadData(),
    onDelete: () => loadData(),
  });

  const categoriesMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  // Search Submit & Clear Handlers
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setSelectedCategoryId('');
    setStatusFilter('ALL');
    setPage(0);
  };

  // Open Create Product Modal
  const openCreateProduct = () => {
    setEditingProductId(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      stockQuantity: '10',
      imageUrl: '',
      categoryId: categories.length > 0 ? categories[0].id.toString() : '',
      enabled: true,
    });
    setProductFormErrors({});
    setModalError(null);
    setShowProductModal(true);
  };

  // Open Edit Product Modal
  const openEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setProductForm({
      name: prod.name || '',
      description: prod.description || '',
      price: prod.price != null ? prod.price.toString() : '',
      stockQuantity: prod.stockQuantity != null ? prod.stockQuantity.toString() : '0',
      imageUrl: prod.imageUrl || '',
      categoryId: prod.category?.id ? prod.category.id.toString() : '',
      enabled: prod.enabled ?? true,
    });
    setProductFormErrors({});
    setModalError(null);
    setShowProductModal(true);
  };

  // Product Form Validation
  const validateProductForm = () => {
    const errors = {};
    if (!productForm.name.trim()) {
      errors.name = 'Product name is required';
    } else if (productForm.name.trim().length > 255) {
      errors.name = 'Product name must not exceed 255 characters';
    }

    const priceNum = Number(productForm.price);
    if (!productForm.price || isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Price must be a positive number greater than 0';
    }

    const stockNum = Number(productForm.stockQuantity);
    if (productForm.stockQuantity === '' || isNaN(stockNum) || stockNum < 0) {
      errors.stockQuantity = 'Stock quantity must be a non-negative number (0 or higher)';
    }

    if (!productForm.categoryId) {
      errors.categoryId = 'Please select a valid category';
    }

    if (productForm.imageUrl && productForm.imageUrl.trim()) {
      const url = productForm.imageUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        errors.imageUrl = 'Image URL must start with http:// or https://';
      }
    }

    setProductFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (savingProduct) return;
    if (!validateProductForm()) return;

    setSavingProduct(true);
    setModalError(null);
    setError(null);
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: Number(productForm.price),
        stockQuantity: Number(productForm.stockQuantity),
        imageUrl: productForm.imageUrl.trim() || null,
        categoryId: Number(productForm.categoryId),
        enabled: productForm.enabled,
      };

      if (editingProductId) {
        const res = await apiClient.put(`/api/products/${editingProductId}`, payload);
        const savedProduct = res.data;
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProductId ? savedProduct : p))
        );
        setToastMessage(`Product "${payload.name}" updated successfully.`);
      } else {
        await apiClient.post('/api/products', payload);
        setToastMessage(`Product "${payload.name}" created successfully.`);
      }

      setShowProductModal(false);
      await loadData();
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      console.error('Save product error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save product';
      setModalError(errMsg);
    } finally {
      setSavingProduct(false);
    }
  };

  // Initiate Confirmation Dialog for Enable / Disable
  const handlePromptToggleEnabled = (prod) => {
    setConfirmModal({
      isOpen: true,
      product: prod,
      action: prod.enabled ? 'disable' : 'enable',
      loading: false,
    });
  };

  // Execute Confirmed Deactivation or Re-activation
  const handleConfirmToggleAction = async () => {
    const { product, action } = confirmModal;
    if (!product) return;

    setConfirmModal((prev) => ({ ...prev, loading: true }));
    setError(null);

    try {
      if (action === 'disable') {
        await apiClient.delete(`/api/products/${product.id}`);
        setToastMessage(`Product "${product.name}" deactivated and hidden from storefront.`);
      } else {
        await apiClient.put(`/api/products/${product.id}`, {
          name: product.name,
          description: product.description,
          price: product.price,
          stockQuantity: product.stockQuantity,
          imageUrl: product.imageUrl,
          categoryId: product.category?.id,
          enabled: true,
        });
        setToastMessage(`Product "${product.name}" re-enabled in customer catalog.`);
      }

      setConfirmModal({ isOpen: false, product: null, action: 'disable', loading: false });
      await loadData();
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      console.error('Update product status error:', err);
      setError(err.response?.data?.message || 'Failed to update product status');
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const activeCategoryObject = selectedCategoryId ? categoriesMap.get(Number(selectedCategoryId)) : null;

  return (
    <div className="admin-content">
      {/* ── Page Header / Intro ── */}
      <div className="admin-intro">
        <div>
          <h2>Products & Categories</h2>
          <p>Review and manage catalog items, pricing, inventory visibility, and taxonomies.</p>
        </div>
        <button
          type="button"
          id="admin-btn-add-product"
          className="btn btn-primary"
          onClick={openCreateProduct}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="plus" size={16} />
          <span>Add product</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{ marginBottom: '16px' }}>
          <AlertMessage type="success" message={toastMessage} onClose={() => setToastMessage('')} />
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <AlertMessage type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* ── Main Panel ── */}
      <section className="panel">
        {/* Approved Categories Quick-Filter Bar */}
        <div className="admin-categories-bar" role="navigation" aria-label="Department filters">
          <button
            type="button"
            className={`admin-category-pill ${!selectedCategoryId ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategoryId('');
              setPage(0);
            }}
          >
            All Departments ({categories.length})
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id.toString();
            return (
              <button
                key={cat.id}
                type="button"
                className={`admin-category-pill ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategoryId(isSelected ? '' : cat.id.toString());
                  setPage(0);
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="filters">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
            <label className="admin-search" style={{ width: '100%', maxWidth: 'none' }}>
              <Icon name="search" size={16} />
              <input
                id="admin-product-search-input"
                type="text"
                placeholder="Search products by title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setActiveSearch('');
                    setPage(0);
                  }}
                  style={{ border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </label>
            <button type="submit" className="btn btn-secondary" style={{ padding: '0 12px', fontSize: '12px' }}>
              Search
            </button>
          </form>

          {/* Category Select Dropdown */}
          <select
            id="admin-filter-category-select"
            aria-label="Filter by category"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Select Dropdown */}
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="DISABLED">Disabled only</option>
          </select>

          {/* Result Count Indicator */}
          <span className="result-count">
            {totalElements} {totalElements === 1 ? 'product' : 'products'} found
          </span>
        </div>

        {/* Active Filter Chips */}
        {(activeSearch || activeCategoryObject || statusFilter !== 'ALL') && (
          <div className="active-filters-bar">
            <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '11px' }}>Active filters:</span>
            {activeSearch && (
              <span className="active-filter-chip">
                Search: &ldquo;{activeSearch}&rdquo;
                <button
                  type="button"
                  onClick={() => {
                    setActiveSearch('');
                    setSearchInput('');
                    setPage(0);
                  }}
                  aria-label="Remove search filter"
                >
                  ✕
                </button>
              </span>
            )}
            {activeCategoryObject && (
              <span className="active-filter-chip">
                Category: {activeCategoryObject.name}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId('');
                    setPage(0);
                  }}
                  aria-label="Remove category filter"
                >
                  ✕
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="active-filter-chip">
                Status: {statusFilter === 'ACTIVE' ? 'Active' : 'Disabled'}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPage(0);
                  }}
                  aria-label="Remove status filter"
                >
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

        {/* Product Table */}
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner message="Loading catalog products..." />
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="box" size={36} style={{ color: 'var(--subtle)', marginBottom: '8px' }} />
            <h3 style={{ margin: '8px 0 4px', color: 'var(--ink)' }}>No products found</h3>
            <p style={{ margin: 0, fontSize: '12px' }}>
              No items match your active filters. Try adjusting your search or clearing filters.
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
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th aria-label="Actions" style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const isOutOfStock = prod.stockQuantity <= 0;
                  const isLowStock = !isOutOfStock && prod.stockQuantity <= 10;

                  return (
                    <tr key={prod.id}>
                      <td>
                        <div className="table-product">
                          <ProductImage
                            src={prod.imageUrl}
                            alt={prod.name}
                            style={{ width: '36px', height: '36px', borderRadius: '5px', objectFit: 'cover' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>
                              {prod.name}
                            </strong>
                            {prod.description && (
                              <small
                                style={{
                                  color: 'var(--muted)',
                                  fontSize: '11px',
                                  maxWidth: '260px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={prod.description}
                              >
                                {prod.description}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#4e5668', fontWeight: 500 }}>
                          {prod.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td>
                        <b style={{ color: 'var(--ink)' }}>
                          ₹{Number(prod.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </b>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isOutOfStock
                              ? 'status-red'
                              : isLowStock
                              ? 'status-amber'
                              : 'status-green'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Out of stock'
                            : isLowStock
                            ? `Low stock (${prod.stockQuantity})`
                            : `${prod.stockQuantity} in stock`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            prod.enabled ? 'status-green' : 'status-red'
                          }`}
                        >
                          {prod.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => openEditProduct(prod)}
                            title="Edit product details"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => handlePromptToggleEnabled(prod)}
                            style={{
                              color: prod.enabled ? 'var(--danger)' : 'var(--success)',
                            }}
                            title={prod.enabled ? 'Deactivate from storefront' : 'Re-enable in catalog'}
                          >
                            {prod.enabled ? 'Deactivate' : 'Enable'}
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
              Showing {page * 10 + 1}–{Math.min((page + 1) * 10, totalElements)} of {totalElements} products
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

      {/* ── Add / Edit Product Modal ── */}
      {showProductModal && (
        <div className="modal-backdrop" onClick={() => !savingProduct && setShowProductModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{editingProductId ? 'Edit product' : 'Add product'}</h2>
                <p>
                  {editingProductId
                    ? 'Update catalog pricing, inventory count, or product details.'
                    : 'Create a catalog item using the existing backend product API.'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowProductModal(false)}
                disabled={savingProduct}
                aria-label="Close dialog"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="modal-body form-grid">
                {modalError && (
                  <div className="inline-error span-2">
                    <b>Failed to save product</b>
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Product Name */}
                <label className={`span-2 ${productFormErrors.name ? 'field-error' : ''}`}>
                  <span>Product name *</span>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter product title"
                  />
                  {productFormErrors.name && <small>{productFormErrors.name}</small>}
                </label>

                {/* Category Selection */}
                <label className={productFormErrors.categoryId ? 'field-error' : ''}>
                  <span>Category *</span>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, categoryId: e.target.value }))
                    }
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {productFormErrors.categoryId && <small>{productFormErrors.categoryId}</small>}
                </label>

                {/* Price */}
                <label className={productFormErrors.price ? 'field-error' : ''}>
                  <span>Price (₹) *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                  {productFormErrors.price && <small>{productFormErrors.price}</small>}
                </label>

                {/* Stock Quantity */}
                <label className={productFormErrors.stockQuantity ? 'field-error' : ''}>
                  <span>Stock quantity *</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.stockQuantity}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, stockQuantity: e.target.value }))
                    }
                    placeholder="10"
                  />
                  {productFormErrors.stockQuantity && <small>{productFormErrors.stockQuantity}</small>}
                </label>

                {/* Image URL */}
                <label className={productFormErrors.imageUrl ? 'field-error' : ''}>
                  <span>Image URL (optional)</span>
                  <input
                    type="url"
                    value={productForm.imageUrl}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="https://..."
                  />
                  {productFormErrors.imageUrl && <small>{productFormErrors.imageUrl}</small>}
                </label>

                {/* Description */}
                <label className="span-2">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe the product specifications, features, warranty..."
                  />
                </label>

                {/* Image Preview if provided */}
                {productForm.imageUrl && (
                  <div className="span-2" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--canvas)', borderRadius: '6px' }}>
                    <ProductImage
                      src={productForm.imageUrl}
                      alt="Preview"
                      style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Image preview</span>
                      <small style={{ color: 'var(--muted)', fontSize: '10px' }}>Verify the image renders cleanly before saving.</small>
                    </div>
                  </div>
                )}

                {/* Enable Checkbox */}
                <label className="span-2" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.enabled}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    style={{ minHeight: 'auto', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontWeight: 500, fontSize: '12px' }}>
                    Enable product immediately (visible in customer catalog)
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={savingProduct}
                  onClick={() => setShowProductModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProduct}
                >
                  {savingProduct ? (
                    <>
                      <span className="spinner" style={{ marginRight: '6px' }} />
                      Saving…
                    </>
                  ) : editingProductId ? (
                    'Update product'
                  ) : (
                    'Save product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Product Activation / Deactivation Confirmation Dialog ── */}
      {confirmModal.isOpen && confirmModal.product && (
        <div
          className="modal-backdrop"
          onClick={() =>
            !confirmModal.loading &&
            setConfirmModal({ isOpen: false, product: null, action: 'disable', loading: false })
          }
        >
          <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>
                  {confirmModal.action === 'disable'
                    ? 'Deactivate product?'
                    : 'Re-enable product?'}
                </h2>
                <p>
                  {confirmModal.action === 'disable'
                    ? 'This product will be hidden from customer view.'
                    : 'This product will reappear immediately in the catalog.'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={confirmModal.loading}
                onClick={() =>
                  setConfirmModal({ isOpen: false, product: null, action: 'disable', loading: false })
                }
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ProductImage
                  src={confirmModal.product.imageUrl}
                  alt={confirmModal.product.name}
                  style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                />
                <div>
                  <strong style={{ color: 'var(--ink)', fontSize: '13px', display: 'block' }}>
                    {confirmModal.product.name}
                  </strong>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    {confirmModal.product.category?.name || 'Catalog product'} · ₹{Number(confirmModal.product.price || 0).toLocaleString('en-IN')}
                  </small>
                </div>
              </div>

              {confirmModal.action === 'disable' ? (
                <div className="warning-box">
                  <b>Safety & order integrity notice:</b>
                  <span>
                    Past customer orders containing this item remain intact and unmodified. The product is safely hidden from the storefront and can be re-enabled anytime.
                  </span>
                </div>
              ) : (
                <p className="modal-copy">
                  Re-enabling will restore this product to customer catalog listings and search results.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={confirmModal.loading}
                onClick={() =>
                  setConfirmModal({ isOpen: false, product: null, action: 'disable', loading: false })
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmModal.action === 'disable' ? 'btn btn-danger' : 'btn btn-primary'}
                disabled={confirmModal.loading}
                onClick={handleConfirmToggleAction}
              >
                {confirmModal.loading ? (
                  <>
                    <span className="spinner" style={{ marginRight: '6px' }} />
                    Updating…
                  </>
                ) : confirmModal.action === 'disable' ? (
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

export default AdminProductsPage;
