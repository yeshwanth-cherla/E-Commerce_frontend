import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { AlertMessage } from '../../components/AlertMessage';
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

  // Category Explorer View State
  const [categoryExplorerExpanded, setCategoryExplorerExpanded] = useState(true);

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
      // Client-side filter for DISABLED status if requested
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

  // Stage 2 Real-Time synchronization: updates list on remote change
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
                newRecord.stock_quantity != null ? Number(newRecord.stock_quantity) : p.stockQuantity,
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

  const categoriesMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

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
      errors.price = 'Price must be a positive number greater than 0 (e.g. 19.99)';
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
    if (!validateProductForm()) return;

    setSavingProduct(true);
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
        await apiClient.put(`/api/products/${editingProductId}`, payload);
        setToastMessage(`Product "${payload.name}" updated successfully!`);
      } else {
        await apiClient.post('/api/products', payload);
        setToastMessage(`Product "${payload.name}" created successfully!`);
      }

      setShowProductModal(false);
      await loadData();
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      console.error('Save product error:', err);
      setError(err.response?.data?.message || 'Failed to save product');
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
        // Soft-delete via supported Spring Boot DELETE endpoint
        await apiClient.delete(`/api/products/${product.id}`);
        setToastMessage(`Product "${product.name}" deactivated. It is now hidden from the storefront.`);
      } else {
        // Re-enable product via supported Spring Boot PUT endpoint
        await apiClient.put(`/api/products/${product.id}`, {
          name: product.name,
          description: product.description,
          price: product.price,
          stockQuantity: product.stockQuantity,
          imageUrl: product.imageUrl,
          categoryId: product.category?.id,
          enabled: true,
        });
        setToastMessage(`Product "${product.name}" re-enabled! It is now active in the customer catalog.`);
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

  // Active filter label
  const activeCategoryObject = selectedCategoryId ? categoriesMap.get(Number(selectedCategoryId)) : null;

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Product Catalog & Inventory</h1>
          <p style={styles.subtitle}>
            Manage products, pricing, stock visibility, and department taxonomies.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button id="admin-btn-add-product" onClick={openCreateProduct} style={styles.primaryBtn}>
            + Add New Product
          </button>
        </div>
      </div>

      {/* Toast & Error Alerts */}
      {toastMessage && (
        <AlertMessage type="success" message={toastMessage} onClose={() => setToastMessage('')} />
      )}
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}

      {/* Category Explorer Card (6 Approved Main Departments Only) */}
      <div style={styles.categoryCard}>
        <div style={styles.categoryCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📁</span>
            <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
              Approved Catalog Categories (6 Main Departments)
            </strong>
          </div>
          <button
            onClick={() => setCategoryExplorerExpanded((prev) => !prev)}
            style={styles.textLinkBtn}
          >
            {categoryExplorerExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {categoryExplorerExpanded && (
          <div style={styles.categoryGrid}>
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id.toString();

              return (
                <div
                  key={cat.id}
                  style={{
                    ...styles.mainCatBox,
                    borderColor: isSelected ? '#6366f1' : '#334155',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : '#1e293b',
                  }}
                >
                  <div style={styles.mainCatTitleRow}>
                    <button
                      onClick={() => {
                        setSelectedCategoryId(isSelected ? '' : cat.id.toString());
                        setPage(0);
                      }}
                      style={{
                        ...styles.catFilterLink,
                        color: isSelected ? '#a5b4fc' : '#f8fafc',
                        fontWeight: '700',
                      }}
                      title="Filter products in this department"
                    >
                      {cat.name}
                    </button>
                    <span style={{ ...styles.badgeCount, backgroundColor: isSelected ? '#4f46e5' : '#334155' }}>
                      {isSelected ? 'Active Filter' : 'Department'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {cat.description || 'Primary catalog category'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search, Filter Bar, and Status Toggle */}
      <div style={styles.filterCard}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <div style={styles.searchInputWrap}>
            <span style={{ color: '#64748b', marginLeft: '0.6rem' }}>🔍</span>
            <input
              id="admin-product-search-input"
              type="text"
              placeholder="Search products by title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={styles.filterSearchInput}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveSearch('');
                  setPage(0);
                }}
                style={styles.clearSearchBtn}
                title="Clear search text"
              >
                ✕
              </button>
            )}
          </div>
          <button id="admin-product-search-btn" type="submit" style={styles.searchSubmitBtn}>
            Search
          </button>
        </form>

        <div style={styles.filterControlsRow}>
          {/* Category Dropdown Filter */}
          <div style={styles.filterControlGroup}>
            <label style={styles.filterLabel}>Category:</label>
            <select
              id="admin-filter-category-select"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setPage(0);
              }}
              style={styles.filterSelect}
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Buttons */}
          <div style={styles.filterControlGroup}>
            <label style={styles.filterLabel}>Status:</label>
            <div style={styles.statusToggleGroup}>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setPage(0);
                }}
                style={{
                  ...styles.statusToggleBtn,
                  backgroundColor: statusFilter === 'ALL' ? '#6366f1' : '#1e293b',
                  color: statusFilter === 'ALL' ? '#ffffff' : '#94a3b8',
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setPage(0);
                }}
                style={{
                  ...styles.statusToggleBtn,
                  backgroundColor: statusFilter === 'ACTIVE' ? '#22c55e' : '#1e293b',
                  color: statusFilter === 'ACTIVE' ? '#ffffff' : '#94a3b8',
                }}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('DISABLED');
                  setPage(0);
                }}
                style={{
                  ...styles.statusToggleBtn,
                  backgroundColor: statusFilter === 'DISABLED' ? '#ef4444' : '#1e293b',
                  color: statusFilter === 'DISABLED' ? '#ffffff' : '#94a3b8',
                }}
              >
                Disabled
              </button>
            </div>
          </div>

          {/* Active Filter Clear Button */}
          {(activeSearch || selectedCategoryId || statusFilter !== 'ALL') && (
            <button onClick={handleClearFilters} style={styles.resetFiltersBtn}>
              Reset Filters
            </button>
          )}
        </div>

        {/* Active Filters Summary */}
        {(activeSearch || activeCategoryObject || statusFilter !== 'ALL') && (
          <div style={styles.activeFiltersRow}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>
              Active Filters:
            </span>
            {activeSearch && (
              <span style={styles.activeFilterPill}>
                Search: &ldquo;{activeSearch}&rdquo;
                <button
                  onClick={() => {
                    setActiveSearch('');
                    setSearchInput('');
                    setPage(0);
                  }}
                  style={styles.pillClose}
                >
                  ✕
                </button>
              </span>
            )}
            {activeCategoryObject && (
              <span style={styles.activeFilterPill}>
                Category: {activeCategoryObject.name}
                <button
                  onClick={() => {
                    setSelectedCategoryId('');
                    setPage(0);
                  }}
                  style={styles.pillClose}
                >
                  ✕
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span style={styles.activeFilterPill}>
                Status: {statusFilter === 'ACTIVE' ? 'Active only' : 'Disabled only'}
                <button
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPage(0);
                  }}
                  style={styles.pillClose}
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Catalog Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableStatsBar}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Showing <strong>{products.length}</strong> product{products.length === 1 ? '' : 's'} on page{' '}
            <strong>{page + 1}</strong> of <strong>{Math.max(totalPages, 1)}</strong> ({totalElements} total in catalog)
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading catalog products..." />
        ) : products.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
            <h3 style={{ color: '#f8fafc', marginBottom: '0.3rem' }}>No products match your criteria</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Try adjusting your search terms, changing the category filter, or adding a new product.
            </p>
            <button onClick={handleClearFilters} style={{ ...styles.secBtn, marginTop: '1rem' }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => (
                <tr key={prod.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          style={styles.thumbnail}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={styles.noThumbnail}>📦</div>
                      )}
                      <div>
                        <strong style={{ color: '#f8fafc', display: 'block', fontSize: '0.92rem' }}>
                          {prod.name}
                        </strong>
                        {prod.description && (
                          <span
                            style={{
                              color: '#94a3b8',
                              fontSize: '0.78rem',
                              display: 'inline-block',
                              maxWidth: '280px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={prod.description}
                          >
                            {prod.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {prod.category ? (
                      <span style={styles.categoryBadge}>
                        {prod.category.name}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Uncategorized</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <strong style={{ color: '#38bdf8' }}>₹{Number(prod.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.stockBadge,
                        backgroundColor:
                          prod.stockQuantity <= 0
                            ? 'rgba(239, 68, 68, 0.2)'
                            : prod.stockQuantity <= 10
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(34, 197, 94, 0.15)',
                        color:
                          prod.stockQuantity <= 0
                            ? '#f87171'
                            : prod.stockQuantity <= 10
                            ? '#fbbf24'
                            : '#4ade80',
                      }}
                    >
                      {prod.stockQuantity <= 0
                        ? 'Out of Stock (0)'
                        : prod.stockQuantity <= 10
                        ? `Low Stock (${prod.stockQuantity})`
                        : `In Stock (${prod.stockQuantity})`}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: prod.enabled
                          ? 'rgba(34, 197, 94, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                        color: prod.enabled ? '#4ade80' : '#f87171',
                      }}
                    >
                      {prod.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        onClick={() => openEditProduct(prod)}
                        style={styles.actionEditBtn}
                        title="Edit product name, price, category, stock"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePromptToggleEnabled(prod)}
                        style={{
                          ...styles.actionToggleBtn,
                          color: prod.enabled ? '#f87171' : '#4ade80',
                        }}
                        title={
                          prod.enabled
                            ? 'Deactivate product from storefront'
                            : 'Re-enable product in storefront'
                        }
                      >
                        {prod.enabled ? 'Deactivate' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Product Create / Edit Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingProductId ? 'Edit Product Details' : 'Add New Product to Catalog'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Product Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  style={{
                    ...styles.input,
                    borderColor: productFormErrors.name ? '#ef4444' : '#334155',
                  }}
                />
                {productFormErrors.name && (
                  <span style={styles.fieldErrorText}>{productFormErrors.name}</span>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detailed specifications, features, warranty..."
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Price (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="499.00"
                    style={{
                      ...styles.input,
                      borderColor: productFormErrors.price ? '#ef4444' : '#334155',
                    }}
                  />
                  {productFormErrors.price && (
                    <span style={styles.fieldErrorText}>{productFormErrors.price}</span>
                  )}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Stock Quantity <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.stockQuantity}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, stockQuantity: e.target.value }))
                    }
                    placeholder="10"
                    style={{
                      ...styles.input,
                      borderColor: productFormErrors.stockQuantity ? '#ef4444' : '#334155',
                    }}
                  />
                  {productFormErrors.stockQuantity && (
                    <span style={styles.fieldErrorText}>{productFormErrors.stockQuantity}</span>
                  )}
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, categoryId: e.target.value }))
                  }
                  style={{
                    ...styles.input,
                    borderColor: productFormErrors.categoryId ? '#ef4444' : '#334155',
                  }}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {productFormErrors.categoryId && (
                  <span style={styles.fieldErrorText}>{productFormErrors.categoryId}</span>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Image URL (optional)</label>
                <input
                  type="url"
                  value={productForm.imageUrl}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    ...styles.input,
                    borderColor: productFormErrors.imageUrl ? '#ef4444' : '#334155',
                  }}
                />
                {productFormErrors.imageUrl && (
                  <span style={styles.fieldErrorText}>{productFormErrors.imageUrl}</span>
                )}
                {productForm.imageUrl && (
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Preview:</span>
                    <img
                      src={productForm.imageUrl}
                      alt="Preview"
                      style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem' }}>
                <input
                  type="checkbox"
                  id="product-enabled-checkbox"
                  checked={productForm.enabled}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                <label htmlFor="product-enabled-checkbox" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  Enable product immediately (visible to customers)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem' }}>
                <button
                  type="submit"
                  disabled={savingProduct}
                  style={styles.primaryBtn}
                >
                  {savingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Product Deactivation / Activation */}
      {confirmModal.isOpen && confirmModal.product && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '480px' }}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: confirmModal.action === 'disable' ? '#f87171' : '#4ade80' }}>
                {confirmModal.action === 'disable'
                  ? 'Confirm Product Deactivation'
                  : 'Confirm Product Re-activation'}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ isOpen: false, product: null, action: 'disable', loading: false })
                }
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.2rem' }}>
              {confirmModal.action === 'disable' ? (
                <>
                  <p>
                    Are you sure you want to deactivate <strong>{confirmModal.product.name}</strong>?
                  </p>
                  <div style={styles.safetyBox}>
                    <p style={{ margin: '0 0 0.4rem 0', fontWeight: '600', color: '#fca5a5' }}>
                      ⚠️ Safety & Order Integrity:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      <li>This product will immediately be hidden from customer storefront pages.</li>
                      <li>Customers will not be able to add this item to their carts or purchase it.</li>
                      <li>
                        <strong>Existing orders are fully preserved</strong>: Completed and processing
                        orders referencing this product remain intact and unmodified.
                      </li>
                      <li>You can re-enable this product at any time from this admin screen.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Are you sure you want to re-enable <strong>{confirmModal.product.name}</strong>?
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    This product will be reactivated and will immediately reappear in the customer
                    storefront catalog and search results.
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ isOpen: false, product: null, action: 'disable', loading: false })
                }
                style={styles.cancelBtn}
                disabled={confirmModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleAction}
                disabled={confirmModal.loading}
                style={{
                  ...styles.primaryBtn,
                  backgroundColor: confirmModal.action === 'disable' ? '#ef4444' : '#22c55e',
                }}
              >
                {confirmModal.loading
                  ? 'Processing...'
                  : confirmModal.action === 'disable'
                  ? 'Yes, Deactivate Product'
                  : 'Yes, Re-enable Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  primaryBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  secBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  categoryCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  categoryCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.8rem',
  },
  textLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '0.75rem',
  },
  mainCatBox: {
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  mainCatTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catFilterLink: {
    background: 'none',
    border: 'none',
    textAlign: 'left',
    padding: 0,
    cursor: 'pointer',
    fontSize: '0.88rem',
  },
  badgeCount: {
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    fontSize: '0.72rem',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  filterCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.2rem',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  searchForm: {
    display: 'flex',
    gap: '0.75rem',
    width: '100%',
  },
  searchInputWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  filterSearchInput: {
    flex: 1,
    padding: '0.65rem 0.8rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
  },
  searchSubmitBtn: {
    padding: '0.65rem 1.4rem',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  filterControlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  filterControlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  filterSelect: {
    padding: '0.55rem 0.85rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.85rem',
  },
  statusToggleGroup: {
    display: 'flex',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  statusToggleBtn: {
    border: 'none',
    padding: '0.5rem 0.9rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resetFiltersBtn: {
    background: 'none',
    border: '1px solid #475569',
    color: '#cbd5e1',
    padding: '0.5rem 0.9rem',
    borderRadius: '6px',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  activeFiltersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
    paddingTop: '0.5rem',
    borderTop: '1px solid #1e293b',
  },
  activeFilterPill: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '0.78rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  pillClose: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: 0,
  },
  tableCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
    overflowX: 'auto',
  },
  tableStatsBar: {
    marginBottom: '1rem',
  },
  emptyState: {
    padding: '3rem 1.5rem',
    textAlign: 'center',
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
  thumbnail: {
    width: '42px',
    height: '42px',
    borderRadius: '6px',
    objectFit: 'cover',
    backgroundColor: '#1e293b',
  },
  noThumbnail: {
    width: '42px',
    height: '42px',
    borderRadius: '6px',
    backgroundColor: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  categoryBadge: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.78rem',
    border: '1px solid #334155',
  },
  stockBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.78rem',
    fontWeight: '600',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  actionEditBtn: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#818cf8',
    padding: '4px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.8rem',
  },
  actionToggleBtn: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    padding: '4px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.8rem',
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
    maxWidth: '540px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
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
  input: {
    padding: '0.65rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.9rem',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: '0.78rem',
    marginTop: '0.2rem',
  },
  cancelBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  infoBanner: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    padding: '0.75rem',
    borderRadius: '6px',
  },
  safetyBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '0.85rem',
    marginTop: '0.8rem',
  },
};

export default AdminProductsPage;
