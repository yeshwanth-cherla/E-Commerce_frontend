import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useProductRealtime } from '../../hooks/useProductRealtime';
import { Icon } from '../../components/Icon';
import { ProductImage } from '../../components/ProductImage';
import { StockBadge } from '../../components/StockBadge';

const formatINR = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [toastNotice, setToastNotice] = useState('');
  const [toastType, setToastType] = useState('success');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  const showToast = (message, type = 'success', duration = 3000) => {
    setToastNotice(message);
    setToastType(type);
    setTimeout(() => setToastNotice(''), duration);
  };

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/products/${id}`);
      setProduct(response.data);
      // Ensure quantity does not exceed updated stock
      if (response.data?.stockQuantity != null) {
        setQuantity((q) => Math.max(1, Math.min(q, response.data.stockQuantity || 1)));
      }
    } catch (err) {
      console.error('Error fetching product detail:', err);
      setError(err.response?.data?.message || 'Product not found or currently unavailable.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    setReviewLoading(true);
    try {
      const response = await apiClient.get(`/api/products/${id}/reviews`, {
        params: { page: reviewPage, size: 5 },
      });
      setReviews(response.data.content || []);
      setReviewTotalPages(response.data.totalPages || 0);
    } catch (err) {
      console.warn('Error loading reviews:', err.message);
    } finally {
      setReviewLoading(false);
    }
  }, [id, reviewPage]);

  useEffect(() => {
    loadProduct();
    loadReviews();
  }, [loadProduct, loadReviews]);

  // Real-time synchronization for this specific product
  useProductRealtime({
    productId: id,
    onUpdate: (newRecord) => {
      setProduct((prev) => {
        if (!prev) return prev;
        const newStock = newRecord.stock_quantity != null ? Number(newRecord.stock_quantity) : prev.stockQuantity;
        if (newStock < quantity) {
          setQuantity(Math.max(1, newStock || 1));
        }
        return {
          ...prev,
          name: newRecord.name ?? prev.name,
          price: newRecord.price != null ? Number(newRecord.price) : prev.price,
          stockQuantity: newStock,
          description: newRecord.description ?? prev.description,
          imageUrl: newRecord.image_url ?? prev.imageUrl,
          enabled: newRecord.enabled ?? prev.enabled,
        };
      });
      loadProduct();
    },
    onDelete: () => {
      setError('This product is no longer available in the catalog.');
    },
  });

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }
    if (!product || product.stockQuantity <= 0) return;

    setAdding(true);
    try {
      await addToCart(id, quantity);
      showToast(`${quantity} × ${product.name} added to cart`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add item to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        await apiClient.put(`/api/reviews/${editingReviewId}`, {
          rating: Number(rating),
          comment,
        });
        showToast('Your review was updated successfully!', 'success');
      } else {
        await apiClient.post(`/api/products/${id}/reviews`, {
          rating: Number(rating),
          comment,
        });
        showToast('Thank you! Your review has been posted.', 'success');
      }
      setComment('');
      setRating(5);
      setEditingReviewId(null);
      await loadProduct();
      await loadReviews();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditClick = (rev) => {
    setEditingReviewId(rev.id);
    setRating(rev.rating);
    setComment(rev.comment);
    document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to remove your review?')) return;
    try {
      await apiClient.delete(`/api/reviews/${reviewId}`);
      showToast('Review removed', 'success');
      await loadProduct();
      await loadReviews();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete review', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="shell page">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <Icon name="chevron" size={13} />
          <span>Catalog</span>
          <Icon name="chevron" size={13} />
          <span>Loading…</span>
        </div>
        <div className="product-detail" style={{ opacity: 0.6 }}>
          <div className="detail-image" style={{ background: '#eef0f5' }} />
          <div className="detail-info">
            <div style={{ width: '30%', height: '14px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '14px' }} />
            <div style={{ width: '80%', height: '36px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '16px' }} />
            <div style={{ width: '40%', height: '28px', background: '#e5e7eb', borderRadius: '6px', marginBottom: '24px' }} />
            <div style={{ width: '100%', height: '80px', background: '#e5e7eb', borderRadius: '6px' }} />
          </div>
        </div>
      </main>
    );
  }

  // Not Found / Error state
  if (error || !product) {
    return (
      <main className="shell page">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <Icon name="chevron" size={13} />
          <span>Catalog</span>
        </div>
        <div className="empty-state large" style={{ margin: '40px auto' }}>
          <span className="empty-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <Icon name="box" size={30} />
          </span>
          <h1>Product unavailable</h1>
          <p>{error || 'The product you are looking for does not exist or may have been removed.'}</p>
          <Link to="/" className="btn btn-primary">
            Browse all products <Icon name="arrow" size={16} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="shell page">
      {/* Aster Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb navigation">
        <Link to="/">Home</Link>
        <Icon name="chevron" size={13} />
        {product.category && (
          <>
            <Link to={`/?categoryId=${product.category.id}`}>{product.category.name}</Link>
            <Icon name="chevron" size={13} />
          </>
        )}
        <b>{product.name}</b>
      </nav>

      {/* Main Aster Product Detail Layout */}
      <section className="product-detail">
        {/* Product Media Column */}
        <div className="detail-image">
          <ProductImage src={product.imageUrl} alt={product.name} />
          {product.stockQuantity <= 0 && <span className="image-badge">Unavailable</span>}
        </div>

        {/* Product Information Column */}
        <div className="detail-info">
          {product.category && (
            <Link
              to={`/?categoryId=${product.category.id}`}
              className="kicker"
              style={{ textDecoration: 'none', display: 'inline-block' }}
              title={`Browse more in ${product.category.name}`}
            >
              {product.category.name}
            </Link>
          )}

          <h1>{product.name}</h1>

          {/* Rating Summary */}
          <div className="detail-rating">
            <span className="stars">
              {product.averageRating ? `★ ${product.averageRating.toFixed(1)} / 5.0` : '★ No ratings yet'}
            </span>
            {reviews.length > 0 && (
              <span>
                ({reviews.length} {reviews.length === 1 ? 'customer review' : 'customer reviews'})
              </span>
            )}
          </div>

          <p className="detail-description">{product.description}</p>

          <strong className="detail-price">{formatINR(product.price)}</strong>

          <StockBadge stock={product.stockQuantity} />

          {/* Aster Purchase Panel */}
          <div className="purchase-panel">
            <div>
              <label className="field-label" htmlFor="product-qty-select">Quantity</label>
              <div className="quantity" id="product-qty-select">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || product.stockQuantity <= 0}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={17} />
                </button>
                <span>{product.stockQuantity > 0 ? quantity : 0}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                  disabled={quantity >= product.stockQuantity || product.stockQuantity <= 0}
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" size={17} />
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary detail-add"
              disabled={product.stockQuantity <= 0 || adding}
              onClick={handleAddToCart}
            >
              <Icon name="bag" size={19} />
              {adding
                ? 'Adding to cart…'
                : product.stockQuantity <= 0
                ? 'Currently unavailable'
                : 'Add to cart'}
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="info-list">
            <div>
              <Icon name="check" size={17} />
              <span>
                <b>Live availability</b>
                <small>Stock status updates in real time with backend verification.</small>
              </span>
            </div>
            <div>
              <Icon name="check" size={17} />
              <span>
                <b>Cash on Delivery</b>
                <small>Pay in cash upon delivery. No upfront payment required.</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Aster Product Overview Block */}
      <section className="description-block">
        <span className="kicker">Product overview</span>
        <h2>Designed for the everyday</h2>
        <p>
          {product.description ||
            'Quality everyday product thoughtfully sourced and stocked in the Aster catalog.'}
        </p>
      </section>

      {/* Customer Reviews Section */}
      <section className="reviews-section" id="reviews">
        <h2>Customer reviews</h2>

        {/* Review Submission / Editing Form */}
        {isAuthenticated ? (
          <form onSubmit={handleReviewSubmit} className="review-form-card" id="review-form">
            <h3>{editingReviewId ? 'Edit your review' : 'Write a customer review'}</h3>

            <div className="review-form-group">
              <label htmlFor="review-rating-select">Your rating</label>
              <select
                id="review-rating-select"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 / 5 - Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ (4 / 5 - Good)</option>
                <option value={3}>⭐⭐⭐ (3 / 5 - Average)</option>
                <option value={2}>⭐⭐ (2 / 5 - Poor)</option>
                <option value={1}>⭐ (1 / 5 - Terrible)</option>
              </select>
            </div>

            <div className="review-form-group">
              <label htmlFor="review-comment-textarea">Your comments</label>
              <textarea
                id="review-comment-textarea"
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this item..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={submittingReview} className="btn btn-primary">
                {submittingReview
                  ? 'Submitting…'
                  : editingReviewId
                  ? 'Update review'
                  : 'Post review'}
              </button>
              {editingReviewId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReviewId(null);
                    setComment('');
                    setRating(5);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div
            style={{
              padding: '16px 20px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Sign in with your account to write a product review.
            </span>
            <Link
              to="/login"
              state={{ from: { pathname: `/products/${id}` } }}
              className="btn btn-secondary"
              style={{ minHeight: '36px', padding: '0 14px', fontSize: '12px' }}
            >
              Sign in to review
            </Link>
          </div>
        )}

        {/* Customer Reviews List */}
        {reviewLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            Loading customer reviews…
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: '16px 0 32px' }}>
            No reviews yet. Be the first customer to share your thoughts on this item!
          </p>
        ) : (
          <div>
            {reviews.map((rev) => {
              const isOwner = user && user.id === rev.userId;
              return (
                <article key={rev.id} className="review-card">
                  <header className="review-header">
                    <div>
                      <strong className="review-author">{rev.userName || 'Customer'}</strong>
                      <span className="review-stars">
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(5 - rev.rating)}
                      </span>
                    </div>
                    {isOwner && (
                      <div className="review-actions">
                        <button
                          type="button"
                          onClick={() => handleEditClick(rev)}
                          className="review-action-btn"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="review-action-btn delete"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </header>
                  <p className="review-comment">{rev.comment}</p>
                  <span className="review-date">
                    {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </article>
              );
            })}

            {/* Reviews Pagination */}
            {reviewTotalPages > 1 && (
              <nav className="pagination" aria-label="Reviews pagination" style={{ marginTop: '20px' }}>
                <span>
                  Showing page {reviewPage + 1} of {reviewTotalPages}
                </span>
                <div>
                  <button
                    type="button"
                    disabled={reviewPage <= 0}
                    onClick={() => setReviewPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  {[...Array(reviewTotalPages)].map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      className={reviewPage === i ? 'active' : ''}
                      onClick={() => setReviewPage(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={reviewPage >= reviewTotalPages - 1}
                    onClick={() => setReviewPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </div>
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

export default ProductDetailPage;
