import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const CartPage = () => {
  const { cart, loading, error, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  if (loading) return <LoadingSpinner message="Loading your shopping cart..." />;

  const cartItems = cart?.items || cart?.cartItems || [];
  const getItemPrice = (item) => Number(item.productPrice ?? item.unitPrice ?? 0);
  const totalPrice = cart?.cartTotal ?? cartItems.reduce(
    (acc, item) => acc + getItemPrice(item) * item.quantity,
    0
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Your Shopping Cart</h1>

      <AlertMessage type="error" message={error} />

      {cartItems.length === 0 ? (
        <div style={styles.emptyCart}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
          <h3>Your cart is empty</h3>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Looks like you haven't added any products to your cart yet.
          </p>
          <Link to="/" style={styles.browseBtn}>
            Browse Products
          </Link>
        </div>
      ) : (
        <div style={styles.cartLayout}>
          {/* Items List */}
          <div style={styles.itemsList}>
            {cartItems.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                <div style={styles.itemImageWrapper}>
                  {item.productImageUrl ? (
                    <img src={item.productImageUrl} alt={item.productName} style={styles.itemImage} />
                  ) : (
                    <div style={{ fontSize: '2rem' }}>📦</div>
                  )}
                </div>

                <div style={styles.itemInfo}>
                  <Link to={`/products/${item.productId}`} style={styles.itemTitle}>
                    {item.productName}
                  </Link>
                  <span style={styles.unitPrice}>${getItemPrice(item).toFixed(2)} each</span>
                </div>

                {/* Quantity Controller */}
                <div style={styles.qtyController}>
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                    style={styles.qtyBtn}
                  >
                    -
                  </button>
                  <span style={styles.qtyDisplay}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={styles.qtyBtn}
                  >
                    +
                  </button>
                </div>

                <div style={styles.lineTotal}>
                  ${(getItemPrice(item) * item.quantity).toFixed(2)}
                </div>

                <button onClick={() => removeFromCart(item.id)} style={styles.removeBtn} title="Remove item">
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Summary Card */}
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Order Summary</h3>

            <div style={styles.summaryRow}>
              <span>Items Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Estimated Shipping</span>
              <span style={{ color: '#4ade80' }}>FREE</span>
            </div>

            <hr style={styles.divider} />

            <div style={{ ...styles.summaryRow, fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              style={styles.checkoutBtn}
            >
              Proceed to Checkout &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
    marginBottom: '2rem',
  },
  emptyCart: {
    textAlign: 'center',
    padding: '4rem 1.5rem',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
  },
  browseBtn: {
    display: 'inline-block',
    padding: '0.8rem 1.6rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  cartLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '2rem',
    alignItems: 'start',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  itemCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '1.2rem',
  },
  itemImageWrapper: {
    width: '70px',
    height: '70px',
    backgroundColor: '#1e293b',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  itemInfo: {
    flex: '1',
  },
  itemTitle: {
    color: '#f8fafc',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'block',
    marginBottom: '0.3rem',
  },
  unitPrice: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  qtyController: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#1e293b',
    borderRadius: '6px',
    padding: '3px',
  },
  qtyBtn: {
    width: '28px',
    height: '28px',
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  qtyDisplay: {
    color: '#f8fafc',
    fontWeight: '600',
    padding: '0 8px',
  },
  lineTotal: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: '1.1rem',
    minWidth: '90px',
    textAlign: 'right',
  },
  removeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.4rem',
  },
  summaryCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '1.8rem',
  },
  summaryTitle: {
    color: '#f8fafc',
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '1.2rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginBottom: '0.8rem',
  },
  divider: {
    borderColor: '#1e293b',
    margin: '1.2rem 0',
  },
  checkoutBtn: {
    width: '100%',
    padding: '0.85rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '1.2rem',
  },
};

export default CartPage;
