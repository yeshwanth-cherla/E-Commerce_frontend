import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { AlertMessage } from '../../components/AlertMessage';
import { useProductRealtime } from '../../hooks/useProductRealtime';

export const ProductDetailPage = () => {
  const { id } = useParams(); // route is /products/:id
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

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

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/products/${id}`);
      setProduct(response.data);
    } catch (err) {
      console.error('Error fetching product detail:', err);
      setError(err.response?.data?.message || 'Product not found');
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
      // Immediate optimistic update for zero-latency UI change
      setProduct((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: newRecord.name ?? prev.name,
          price: newRecord.price != null ? Number(newRecord.price) : prev.price,
          stockQuantity: newRecord.stock_quantity != null ? Number(newRecord.stock_quantity) : prev.stockQuantity,
          description: newRecord.description ?? prev.description,
          imageUrl: newRecord.image_url ?? prev.imageUrl,
          enabled: newRecord.enabled ?? prev.enabled,
        };
      });
      // Backend refetch to guarantee relations (category, rating) stay synced
      loadProduct();
    },
    onDelete: () => {
      setError('This product is no longer available.');
    },
  });

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setAdding(true);
    try {
      await addToCart(id, quantity);
      setToastMessage(`Added ${quantity} item(s) to your cart!`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to add item to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        await apiClient.put(`/api/reviews/${editingReviewId}`, {
          rating: Number(rating),
          comment,
        });
        setToastMessage('Review updated successfully!');
      } else {
        await apiClient.post(`/api/products/${id}/reviews`, {
          rating: Number(rating),
          comment,
        });
        setToastMessage('Review submitted successfully!');
      }
      setComment('');
      setRating(5);
      setEditingReviewId(null);
      await loadProduct();
      await loadReviews();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditClick = (review) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await apiClient.delete(`/api/reviews/${reviewId}`);
      setToastMessage('Review deleted');
      await loadProduct();
      await loadReviews();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review');
    }
  };

  if (loading) return <LoadingSpinner message="Loading product details..." />;
  if (error || !product) return <AlertMessage type="error" message={error || 'Product not found'} />;

  return (
    <div style={styles.container}>
      {toastMessage && (
        <AlertMessage type="success" message={toastMessage} onClose={() => setToastMessage('')} />
      )}

      {/* Main Detail Grid */}
      <div style={styles.detailGrid}>
        <div style={styles.imageColumn}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} style={styles.mainImage} />
          ) : (
            <div style={styles.placeholderImage}>📦</div>
          )}
        </div>

        <div style={styles.infoColumn}>
          {product.category && (
            <Link
              to={`/?categoryId=${product.category.id}`}
              style={{ ...styles.categoryBadge, textDecoration: 'none' }}
              title={`View products in ${product.category.name}`}
            >
              {product.category.name}
            </Link>
          )}
          <h1 style={styles.productTitle}>{product.name}</h1>

          <div style={styles.ratingSummary}>
            <span style={styles.ratingStars}>
              {product.averageRating ? `⭐ ${product.averageRating} / 5` : 'No ratings yet'}
            </span>
          </div>

          <div style={styles.priceRow}>
            <span style={styles.price}>₹{Number(product.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span
              style={{
                ...styles.stockStatus,
                color: product.stockQuantity > 0 ? '#4ade80' : '#f87171',
              }}
            >
              {product.stockQuantity > 0
                ? `In Stock (${product.stockQuantity} available)`
                : 'Out of Stock'}
            </span>
          </div>

          <p style={styles.description}>{product.description}</p>

          {/* Action Row */}
          {product.stockQuantity > 0 && (
            <div style={styles.actionRow}>
              <div style={styles.quantitySelector}>
                <label style={styles.qtyLabel}>Qty:</label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  style={styles.select}
                >
                  {[...Array(Math.min(product.stockQuantity, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={adding}
                style={styles.addToCartBtn}
              >
                {adding ? 'Adding...' : '🛒 Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div style={styles.reviewsSection}>
        <h2 style={styles.sectionTitle}>Customer Reviews</h2>

        {/* Submit / Edit Review Form */}
        {isAuthenticated && (
          <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
            <h3 style={styles.formTitle}>
              {editingReviewId ? 'Edit Your Review' : 'Write a Review'}
            </h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Rating:</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                style={styles.select}
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5/5 Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ (4/5 Good)</option>
                <option value={3}>⭐⭐⭐ (3/5 Average)</option>
                <option value={2}>⭐⭐ (2/5 Poor)</option>
                <option value={1}>⭐ (1/5 Terrible)</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Review Comment:</label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                style={styles.textarea}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button type="submit" disabled={submittingReview} style={styles.submitReviewBtn}>
                {submittingReview
                  ? 'Submitting...'
                  : editingReviewId
                  ? 'Update Review'
                  : 'Post Review'}
              </button>
              {editingReviewId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReviewId(null);
                    setComment('');
                    setRating(5);
                  }}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* Reviews List */}
        {reviewLoading ? (
          <LoadingSpinner message="Loading customer reviews..." />
        ) : reviews.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '1rem' }}>
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          <div style={styles.reviewList}>
            {reviews.map((rev) => {
              const isOwner = user && user.id === rev.userId;
              return (
                <div key={rev.id} style={styles.reviewCard}>
                  <div style={styles.reviewHeader}>
                    <div>
                      <strong style={{ color: '#f8fafc' }}>{rev.userName || 'Customer'}</strong>
                      <span style={{ color: '#fbbf24', marginLeft: '0.75rem' }}>
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(5 - rev.rating)}
                      </span>
                    </div>
                    {isOwner && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEditClick(rev)} style={styles.editBtn}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteReview(rev.id)} style={styles.deleteBtn}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p style={styles.reviewComment}>{rev.comment}</p>
                  <span style={styles.reviewDate}>
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}

            <Pagination
              currentPage={reviewPage}
              totalPages={reviewTotalPages}
              onPageChange={(p) => setReviewPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2.5rem',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '2rem',
  },
  imageColumn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    minHeight: '300px',
  },
  mainImage: {
    width: '100%',
    maxHeight: '380px',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  placeholderImage: {
    fontSize: '6rem',
  },
  infoColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  categoryBadge: {
    color: '#6366f1',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: '0.4rem',
  },
  productTitle: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
  },
  ratingSummary: {
    marginBottom: '1rem',
  },
  ratingStars: {
    color: '#fbbf24',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '1.2rem',
    marginBottom: '1.2rem',
  },
  price: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
  },
  stockStatus: {
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  description: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    marginBottom: '2rem',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    marginTop: 'auto',
  },
  quantitySelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  qtyLabel: {
    color: '#cbd5e1',
    fontSize: '0.9rem',
  },
  select: {
    padding: '0.5rem 0.8rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    borderRadius: '6px',
    fontSize: '0.95rem',
  },
  addToCartBtn: {
    flex: '1',
    padding: '0.8rem 1.5rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  reviewsSection: {
    marginTop: '3rem',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: '1.4rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
  },
  reviewForm: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    color: '#cbd5e1',
    fontSize: '0.85rem',
    marginBottom: '0.3rem',
  },
  textarea: {
    width: '100%',
    padding: '0.7rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.95rem',
  },
  submitReviewBtn: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '0.6rem 1.2rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  reviewCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1.2rem',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  reviewComment: {
    color: '#cbd5e1',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '0.5rem',
  },
  reviewDate: {
    color: '#64748b',
    fontSize: '0.75rem',
  },
  editBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};

export default ProductDetailPage;
