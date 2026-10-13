import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useCart } from '../../context/CartContext';
import { useProductRealtime } from '../../hooks/useProductRealtime';
import { filterApprovedCategories } from '../../constants/categories';
import { Icon } from '../../components/Icon';
import { ProductImage } from '../../components/ProductImage';
import { StockBadge } from '../../components/StockBadge';

// Canonical category metadata for Aster category tiles
const CATEGORY_META = [
  { name: 'Grocery', caption: 'Fresh staples' },
  { name: 'Electronics', caption: 'Everyday tech' },
  { name: 'Fashion', caption: 'Modern essentials' },
  { name: 'Home & Kitchen', caption: 'Thoughtful living' },
  { name: 'Beauty & Personal Care', caption: 'Daily self-care' },
  { name: 'Books & Stationery', caption: 'Read & create' },
];

const formatINR = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [addingId, setAddingId] = useState(null);
  const [toastNotice, setToastNotice] = useState('');
  const [toastType, setToastType] = useState('success');

  const { addToCart } = useCart();

  const searchQuery = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') || 'desc';

  // Load canonical categories once
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/api/categories')
      .then((res) => {
        if (isMounted) {
          setCategories(filterApprovedCategories(res.data || []));
        }
      })
      .catch((err) => {
        console.warn('Error loading categories:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch paginated products from Spring Boot API
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

  // Real-time synchronization via Supabase postgres_changes
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

  const handleCategorySelect = (selectedId) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedId) {
      newParams.set('categoryId', selectedId);
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
    const featuredEl = document.getElementById('featured');
    if (featuredEl) {
      featuredEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.stockQuantity <= 0) return;

    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      setToastType('success');
      setToastNotice(`${product.name} added to cart`);
      setTimeout(() => setToastNotice(''), 3000);
    } catch (err) {
      setToastType('error');
      setToastNotice(err.message || 'Please log in to add items to your cart');
      setTimeout(() => setToastNotice(''), 3500);
    } finally {
      setAddingId(null);
    }
  };

  // Find active category record
  const selectedCat = useMemo(() => {
    return categories.find((cat) => cat.id.toString() === categoryId);
  }, [categories, categoryId]);

  const isFiltering = Boolean(searchQuery || categoryId);

  return (
    <main>
      {/* Hero Section & Category Tiles (rendered when no active search/category filter) */}
      {!isFiltering && page === 0 && (
        <>
          {/* Aster Hero Banner */}
          <section className="hero shell">
            <div className="hero-copy">
              <span className="kicker">Thoughtfully chosen, simply delivered</span>
              <h1>Good things for your everyday.</h1>
              <p>
                Discover useful finds across your home, wardrobe and daily routine—all in one calm,
                trusted place.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Browse products <Icon name="arrow" size={18} />
              </button>
              <div className="trust-row">
                <span>
                  <Icon name="check" size={15} /> Clear stock updates
                </span>
                <span>
                  <Icon name="check" size={15} /> Cash on delivery
                </span>
              </div>
            </div>
            <div className="hero-image">
              <img
                src="https://images.unsplash.com/photo-1788459622834-c92465163b45?auto=format&fit=crop&w=1400&q=88"
                alt="Curated everyday essentials collection"
              />
              <div className="hero-note">
                <span>Curated essentials</span>
                <strong>Made for real life</strong>
              </div>
            </div>
          </section>

          {/* Aster 6-Category Grid */}
          <section className="shell section">
            <div className="section-heading">
              <div>
                <span className="kicker">Find your category</span>
                <h2>Shop what you need</h2>
              </div>
              <p>Six simple collections for everyday shopping.</p>
            </div>
            <div className="category-grid">
              {CATEGORY_META.map((meta, index) => {
                const matchedCat = categories.find((c) => c.name === meta.name);
                return (
                  <button
                    type="button"
                    key={meta.name}
                    className={`category-tile category-${index + 1}`}
                    onClick={() => {
                      if (matchedCat) {
                        handleCategorySelect(matchedCat.id.toString());
                      } else {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('search', meta.name);
                        setSearchParams(newParams);
                      }
                    }}
                  >
                    <span className="category-number">0{index + 1}</span>
                    <span>
                      <strong>{meta.name}</strong>
                      <small>{meta.caption}</small>
                    </span>
                    <Icon name="arrow" size={18} />
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Main Catalog Section */}
      <section className="shell section products-section" id="featured">
        <div className="section-heading">
          <div>
            <span className="kicker">
              {searchQuery
                ? 'Search results'
                : selectedCat
                ? 'Category collection'
                : 'Selected for you'}
            </span>
            <h2>
              {searchQuery
                ? `Results for “${searchQuery}”`
                : selectedCat
                ? selectedCat.name
                : 'Everyday essentials'}
            </h2>
          </div>
          <p>
            {loading ? 'Refreshing catalog…' : `${products.length} ${products.length === 1 ? 'item' : 'items'} available`}
          </p>
        </div>

        {/* Active Filter Bar (shown when filtering) */}
        {isFiltering && (
          <div className="active-filter-bar">
            <div className="active-filter-tags">
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Filtered by:</span>
              {selectedCat && (
                <span className="filter-tag">
                  📁 {selectedCat.name}
                </span>
              )}
              {searchQuery && (
                <span className="filter-tag">
                  🔍 &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '32px', padding: '0 12px', fontSize: '11px' }}
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Inline Error Notice */}
        {error && (
          <div className="empty-state" style={{ margin: '20px 0', borderColor: 'var(--danger)' }}>
            <span className="empty-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              <Icon name="close" size={24} />
            </span>
            <h3>Unable to load catalog</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={loadProducts}>
              Try again
            </button>
          </div>
        )}

        {/* Products Grid / Loading Skeletons / Empty State */}
        {loading ? (
          <div className="product-grid" aria-label="Loading products">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="product-card" style={{ opacity: 0.6 }}>
                <div className="product-image-wrap" style={{ background: '#eef0f5' }} />
                <div className="product-card-body">
                  <div style={{ width: '40%', height: '10px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '10px' }} />
                  <div style={{ width: '85%', height: '18px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ width: '60%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '20px' }} />
                  <div style={{ width: '100%', height: '36px', background: '#e5e7eb', borderRadius: '6px', marginTop: 'auto' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="search" size={28} />
            </span>
            <h3>No products found</h3>
            <p>
              {selectedCat
                ? `There are currently no products available in "${selectedCat.name}". Try selecting another category or view all products.`
                : 'Try adjusting your search terms or clearing current filters.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={handleClearFilters}>
              View all products
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <Link
                  to={`/products/${product.id}`}
                  className="product-image-wrap"
                  aria-label={`View ${product.name}`}
                >
                  <ProductImage
                    className="product-image"
                    src={product.imageUrl}
                    alt={product.name}
                  />
                  {product.stockQuantity <= 0 && (
                    <span className="image-badge">Unavailable</span>
                  )}
                </Link>

                <div className="product-card-body">
                  <span className="eyebrow">
                    {product.category?.name || 'Everyday'}
                  </span>

                  <Link to={`/products/${product.id}`} className="product-name">
                    {product.name}
                  </Link>

                  <div className="card-meta">
                    <strong className="price">{formatINR(product.price)}</strong>
                    <StockBadge stock={product.stockQuantity} />
                  </div>

                  <div className="card-actions">
                    <Link to={`/products/${product.id}`} className="btn btn-secondary">
                      Details
                    </Link>

                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={product.stockQuantity <= 0 || addingId === product.id}
                      onClick={(e) => handleAddToCart(e, product)}
                      aria-label={
                        product.stockQuantity <= 0
                          ? 'Out of stock'
                          : `Add ${product.name} to cart`
                      }
                    >
                      {addingId === product.id
                        ? 'Adding…'
                        : product.stockQuantity <= 0
                        ? 'Unavailable'
                        : 'Add to cart'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Aster Pagination Controls */}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Catalog pagination">
            <span>
              Showing page {page + 1} of {totalPages}
            </span>
            <div>
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => handlePageChange(page - 1)}
                aria-label="Previous page"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  type="button"
                  key={i}
                  className={page === i ? 'active' : ''}
                  onClick={() => handlePageChange(i)}
                  aria-label={`Page ${i + 1}`}
                  aria-current={page === i ? 'page' : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Non-blocking Aster Toast */}
      {toastNotice && (
        <aside
          className="toast"
          role="status"
          aria-live="polite"
          style={
            toastType === 'error'
              ? { borderColor: 'var(--danger)', color: 'var(--danger)' }
              : undefined
          }
        >
          <span
            style={
              toastType === 'error'
                ? { background: 'var(--danger-soft)', color: 'var(--danger)' }
                : undefined
            }
          >
            <Icon name={toastType === 'error' ? 'close' : 'check'} size={16} />
          </span>
          <span>{toastNotice}</span>
          <button
            type="button"
            onClick={() => setToastNotice('')}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={15} />
          </button>
        </aside>
      )}
    </main>
  );
};

export default HomePage;
