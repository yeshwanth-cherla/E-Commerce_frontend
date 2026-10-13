import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { AlertMessage } from '../../components/AlertMessage';
import { useCart } from '../../context/CartContext';
import { useProductRealtime } from '../../hooks/useProductRealtime';
import { filterApprovedCategories } from '../../constants/categories';

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [addingId, setAddingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const { addToCart } = useCart();

  const searchQuery = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') || 'desc';

  // Load Categories once
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiClient.get('/api/categories');
        setCategories(filterApprovedCategories(response.data || []));
      } catch (err) {
        console.warn('Error loading categories:', err.message);
      }
    };
    loadCategories();
  }, []);

  // Load Products with filters
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size: 12,
        sortBy,
        sortDir,
      };
      if (searchQuery) params.search = searchQuery;
      if (categoryId) params.categoryId = categoryId;

      const response = await apiClient.get('/api/products', { params });
      const data = response.data;
      setProducts(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please check server connection.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryId, page, sortBy, sortDir]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Real-time synchronization for storefront catalog
  useProductRealtime({
    onUpdate: (newRecord) => {
      // Optimistically update product in current view (zero-latency for stock & price)
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
      // Re-fetch backend to maintain correct pagination & filtered categories
      loadProducts();
    },
    onInsert: () => {
      loadProducts();
    },
    onDelete: (oldRecord) => {
      setProducts((prev) => prev.filter((p) => p.id !== oldRecord.id));
      loadProducts();
    },
  });

  const handleCategorySelect = (id) => {
    const newParams = new URLSearchParams(searchParams);
    if (id) {
      newParams.set('categoryId', id);
    } else {
      newParams.delete('categoryId');
    }
    newParams.set('page', '0');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const handleAddToCart = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingId(productId);
    try {
      await addToCart(productId, 1);
      setToastMessage('Item added to cart!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setAddingId(null);
    }
  };

  // Selected Category (strictly one of the 6 approved categories)
  const selectedCat = categories.find((cat) => cat.id.toString() === categoryId);

  return (
    <div style={styles.container}>
      {/* Hero Banner */}
      <div style={styles.heroBanner}>
        <h1 style={styles.heroTitle}>Discover Quality Products</h1>
        <p style={styles.heroSubtitle}>
          Shop Grocery, Electronics, Fashion, Home &amp; Kitchen, Beauty &amp; Personal Care, Books &amp; Stationery with Cash on Delivery (COD).
        </p>
      </div>

      {toastMessage && (
        <AlertMessage type="success" message={toastMessage} onClose={() => setToastMessage('')} />
      )}
      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {/* Category Filter Tabs (6 Approved Categories Only) */}
      <div style={styles.filterBar}>
        <button
          onClick={() => handleCategorySelect('')}
          style={{
            ...styles.categoryTab,
            ...(categoryId === '' ? styles.activeCategoryTab : {}),
          }}
        >
          All Categories
        </button>
        {categories.map((cat) => {
          const isSelected = categoryId === cat.id.toString();
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id.toString())}
              style={{
                ...styles.categoryTab,
                ...(isSelected ? styles.activeCategoryTab : {}),
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active Filter Status Banner */}
      {(selectedCat || searchQuery) && (
        <div style={styles.activeFilterBanner}>
          <div style={styles.filterStatus}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Showing:</span>{' '}
            {selectedCat && (
              <span style={styles.activeFilterTag}>
                📁 {selectedCat.name}
              </span>
            )}
            {searchQuery && (
              <span style={styles.activeFilterTag}>
                🔍 &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            <span style={styles.productCount}>
              ({products.length} {products.length === 1 ? 'item' : 'items'} found)
            </span>
          </div>
          <button
            onClick={() => {
              const newParams = new URLSearchParams();
              setSearchParams(newParams);
            }}
            style={styles.clearFilterBtn}
          >
            ✕ Clear filters
          </button>
        </div>
      )}

      {/* Main Catalog Grid */}
      {loading ? (
        <LoadingSpinner message="Loading catalog..." />
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>📦</div>
          <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            No products found
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.2rem', maxWidth: '420px', margin: '0 auto 1.2rem', lineHeight: '1.5' }}>
            {selectedCat
              ? `There are currently no products available in "${selectedCat.name}". Try selecting another category or view the full catalog.`
              : 'Try clearing your filters or searching with different keywords.'}
          </p>
          {(categoryId || searchQuery) && (
            <button
              onClick={() => {
                const newParams = new URLSearchParams();
                setSearchParams(newParams);
              }}
              style={styles.viewAllBtn}
            >
              View All Products
            </button>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {products.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`} style={styles.card}>
              <div style={styles.imageWrapper}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    style={styles.image}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <div
                  style={{
                    ...styles.imagePlaceholder,
                    display: product.imageUrl ? 'none' : 'block',
                  }}
                >
                  📦
                </div>
                {product.stockQuantity <= 0 ? (
                  <span style={styles.outOfStockBadge}>Out of Stock</span>
                ) : product.stockQuantity <= 5 ? (
                  <span style={styles.lowStockBadge}>Low Stock ({product.stockQuantity})</span>
                ) : null}
              </div>

              <div style={styles.cardBody}>
                <span style={styles.categoryName}>{product.category?.name || 'General'}</span>
                <h3 style={styles.productName}>{product.name}</h3>

                <div style={styles.ratingRow}>
                  <span style={styles.stars}>
                    {product.averageRating ? `⭐ ${product.averageRating}` : 'No reviews'}
                  </span>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.price}>₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <button
                    onClick={(e) => handleAddToCart(e, product.id)}
                    disabled={product.stockQuantity <= 0 || addingId === product.id}
                    style={{
                      ...styles.cartButton,
                      opacity: product.stockQuantity <= 0 ? 0.5 : 1,
                    }}
                  >
                    {addingId === product.id ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  },
  heroBanner: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
    marginBottom: '2rem',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: '2rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: '1rem',
  },
  filterBar: {
    display: 'flex',
    gap: '0.6rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
    marginBottom: '0.8rem',
  },
  categoryTab: {
    padding: '0.5rem 1.1rem',
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  activeCategoryTab: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: '1px solid #6366f1',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    overflow: 'hidden',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, boxShadow 0.2s',
  },
  imageWrapper: {
    height: '180px',
    backgroundColor: '#1e293b',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    fontSize: '3.5rem',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  lowStockBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  cardBody: {
    padding: '1.2rem',
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
  },
  categoryName: {
    color: '#6366f1',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.3rem',
  },
  productName: {
    color: '#f8fafc',
    fontSize: '1.05rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  ratingRow: {
    marginBottom: '1rem',
  },
  stars: {
    color: '#fbbf24',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  cardFooter: {
    marginTop: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    color: '#f8fafc',
    fontSize: '1.2rem',
    fontWeight: '700',
  },
  cartButton: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 1rem',
    color: '#94a3b8',
  },
  activeFilterBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.8rem',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '0.75rem 1.25rem',
    marginBottom: '1.5rem',
  },
  filterStatus: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#f8fafc',
  },
  activeFilterTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '6px',
    padding: '0.2rem 0.6rem',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  productCount: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  clearFilterBtn: {
    backgroundColor: 'transparent',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  viewAllBtn: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.6rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default HomePage;
