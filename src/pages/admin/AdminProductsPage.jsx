import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { AlertMessage } from '../../components/AlertMessage';

export const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get('/api/products', { params: { page, size: 10, enabledOnly: false } }),
        apiClient.get('/api/categories'),
      ]);
      setProducts(prodRes.data.content || []);
      setTotalPages(prodRes.data.totalPages || 0);
      setCategories(catRes.data || []);

      if (catRes.data && catRes.data.length > 0 && !categoryId) {
        setCategoryId(catRes.data[0].id.toString());
      }
    } catch (err) {
      console.error('Admin catalog load error:', err);
      setError('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [page, categoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateProduct = () => {
    setEditingProductId(null);
    setName('');
    setDescription('');
    setPrice('');
    setStockQuantity('10');
    setImageUrl('');
    setEnabled(true);
    if (categories.length > 0) setCategoryId(categories[0].id.toString());
    setShowProductModal(true);
  };

  const openEditProduct = (prod) => {
    setEditingProductId(prod.id);
    setName(prod.name);
    setDescription(prod.description || '');
    setPrice(prod.price.toString());
    setStockQuantity(prod.stockQuantity.toString());
    setImageUrl(prod.imageUrl || '');
    setCategoryId(prod.category?.id?.toString() || '');
    setEnabled(prod.enabled);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    setError(null);
    try {
      const payload = {
        name,
        description,
        price: Number(price),
        stockQuantity: Number(stockQuantity),
        imageUrl,
        categoryId: Number(categoryId),
        enabled,
      };

      if (editingProductId) {
        await apiClient.put(`/api/products/${editingProductId}`, payload);
        setToastMessage('Product updated successfully!');
      } else {
        await apiClient.post('/api/products', payload);
        setToastMessage('Product created successfully!');
      }

      setShowProductModal(false);
      await loadData();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductEnabled = async (prod) => {
    try {
      if (prod.enabled) {
        await apiClient.delete(`/api/products/${prod.id}`);
        setToastMessage(`Product '${prod.name}' disabled.`);
      } else {
        await apiClient.put(`/api/products/${prod.id}`, {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          stockQuantity: prod.stockQuantity,
          imageUrl: prod.imageUrl,
          categoryId: prod.category?.id,
          enabled: true,
        });
        setToastMessage(`Product '${prod.name}' enabled.`);
      }
      await loadData();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update product status');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    setError(null);
    try {
      await apiClient.post('/api/categories', {
        name: categoryName,
        description: categoryDescription,
        parentId: categoryParentId ? Number(categoryParentId) : null,
      });
      setToastMessage('Category created successfully!');
      setShowCategoryModal(false);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryParentId('');
      await loadData();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading catalog management..." />;

  const mainCategories = categories.filter((c) => !c.parentId);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Product & Category Management</h1>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={() => setShowCategoryModal(true)} style={styles.secBtn}>
            + Add Category / Subcategory
          </button>
          <button onClick={openCreateProduct} style={styles.primaryBtn}>
            + Add Product
          </button>
        </div>
      </div>

      {toastMessage && (
        <AlertMessage type="success" message={toastMessage} onClose={() => setToastMessage('')} />
      )}
      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {/* Categories Summary Pill */}
      <div style={styles.categoriesBar}>
        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>
          Categories ({categories.length}):
        </span>
        {categories.map((c) => (
          <span key={c.id} style={styles.catPill}>
            {c.parentName ? `${c.parentName} → ` : ''}{c.name}
          </span>
        ))}
      </div>

      {/* Products Table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
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
                  <strong style={{ color: '#f8fafc' }}>{prod.name}</strong>
                </td>
                <td style={styles.td}>
                  {prod.category?.parentName ? `${prod.category.parentName} > ` : ''}
                  {prod.category?.name}
                </td>
                <td style={styles.td}>${Number(prod.price).toFixed(2)}</td>
                <td style={styles.td}>{prod.stockQuantity}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: prod.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: prod.enabled ? '#4ade80' : '#f87171',
                    }}
                  >
                    {prod.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button onClick={() => openEditProduct(prod)} style={styles.actionBtn}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleProductEnabled(prod)}
                    style={{ ...styles.actionBtn, color: prod.enabled ? '#f87171' : '#4ade80' }}
                  >
                    {prod.enabled ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
      </div>

      {/* Create / Edit Product Modal */}
      {showProductModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {editingProductId ? 'Edit Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSaveProduct} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={styles.field}>
                  <label style={styles.label}>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={styles.input}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentName ? `${c.parentName} > ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Image URL (optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" disabled={savingProduct} style={styles.primaryBtn}>
                  {savingProduct ? 'Saving...' : 'Save Product'}
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Add Category or Subcategory</h3>
            <form onSubmit={handleSaveCategory} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Smart Laptops or Electronics"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Parent Category (Optional)</label>
                <select
                  value={categoryParentId}
                  onChange={(e) => setCategoryParentId(e.target.value)}
                  style={styles.input}
                >
                  <option value="">-- None (Creates a Main Category) --</option>
                  {mainCategories.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Select a parent category to create a subcategory, or leave blank for a main category.
                </small>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <textarea
                  rows={2}
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" disabled={savingCategory} style={styles.primaryBtn}>
                  {savingCategory ? 'Creating...' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
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
  secBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  categoriesBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  catPill: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
  },
  tableCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
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
  td: {
    padding: '0.9rem 0.75rem',
    color: '#cbd5e1',
    fontSize: '0.9rem',
    borderBottom: '1px solid #1e293b',
  },
  badge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    fontWeight: '600',
    marginRight: '0.8rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    padding: '2rem',
    width: '100%',
    maxWidth: '520px',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '1.2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
  },
  input: {
    padding: '0.65rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.95rem',
  },
  cancelBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default AdminProductsPage;
