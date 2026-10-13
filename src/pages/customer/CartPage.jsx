import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Icon } from '../../components/Icon';
import { ProductImage } from '../../components/ProductImage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const CartPage = () => {
  const { cart, loading, error, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState(null);

  const formatPrice = (value) => {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  };

  const handleUpdateQty = async (itemId, nextQty) => {
    if (nextQty < 1) return;
    try {
      setUpdatingId(itemId);
      await updateQuantity(itemId, nextQty);
    } catch (err) {
      console.error('Failed to update quantity:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      setUpdatingId(itemId);
      await removeFromCart(itemId);
    } catch (err) {
      console.error('Failed to remove cart item:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !cart) {
    return (
      <main className="shell page">
        <LoadingSpinner message="Loading your shopping cart..." />
      </main>
    );
  }

  const cartItems = cart?.items || cart?.cartItems || [];
  const getItemPrice = (item) => Number(item.productPrice ?? item.unitPrice ?? 0);
  const subtotal = cart?.cartTotal ?? cartItems.reduce(
    (acc, item) => acc + getItemPrice(item) * item.quantity,
    0
  );

  if (!cartItems.length) {
    return (
      <main className="shell page">
        <div className="empty-state large">
          <span className="empty-icon">
            <Icon name="bag" size={30} />
          </span>
          <h1>Your cart is waiting</h1>
          <p>Browse our verified catalog and add something useful to get started.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Browse products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell page">
      <div className="page-title">
        <span className="kicker">Review your selection</span>
        <h1>Shopping cart</h1>
        <p>{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your bag</p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <AlertMessage type="error" message={error} />
        </div>
      )}

      <div className="cart-layout">
        <section className="cart-items">
          {cartItems.map((item) => {
            const price = getItemPrice(item);
            const lineTotal = price * item.quantity;
            const isMutating = updatingId === item.id;
            const maxStock = item.availableStock ?? item.stock;

            return (
              <article className="cart-item" key={item.id}>
                <ProductImage
                  src={item.productImageUrl}
                  alt={item.productName || 'Product'}
                  className="cart-item-image"
                />

                <div className="cart-item-main">
                  {item.category && <span className="eyebrow">{item.category}</span>}
                  <h3>
                    <Link to={`/products/${item.productId}`}>
                      {item.productName}
                    </Link>
                  </h3>

                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                    {formatPrice(price)} each
                  </div>

                  {maxStock !== undefined && maxStock <= 5 && maxStock > 0 && (
                    <div style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
                      Only {maxStock} left in stock
                    </div>
                  )}

                  <button
                    className="remove-link"
                    onClick={() => handleRemove(item.id)}
                    disabled={isMutating}
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    <Icon name="trash" size={15} />
                    {isMutating ? 'Updating...' : 'Remove'}
                  </button>
                </div>

                <div className="cart-item-end">
                  <strong>{formatPrice(lineTotal)}</strong>

                  <div className="quantity">
                    <button
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      disabled={isMutating || item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Icon name="minus" size={16} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      disabled={isMutating || (maxStock !== undefined && item.quantity >= maxStock)}
                      aria-label="Increase quantity"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          <button className="continue-link" onClick={() => navigate('/')}>
            <Icon name="arrow" size={17} /> Continue shopping
          </button>
        </section>

        <aside className="summary-card">
          <h2>Order summary</h2>

          <div className="summary-line">
            <span>Items subtotal</span>
            <b>{formatPrice(subtotal)}</b>
          </div>

          <div className="summary-line" style={{ marginTop: '12px' }}>
            <span>Standard shipping</span>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE</span>
          </div>

          <div className="summary-note">
            Final payable amount will be confirmed at checkout. Cash on Delivery is the supported payment method.
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>

          <button
            className="btn btn-primary full"
            onClick={() => navigate('/checkout')}
            disabled={loading || cartItems.length === 0}
          >
            Proceed to checkout <Icon name="arrow" size={18} />
          </button>

          <p className="secure-note">
            <Icon name="check" size={15} /> Stock and prices are verified before placing your order.
          </p>
        </aside>
      </div>
    </main>
  );
};

export default CartPage;
