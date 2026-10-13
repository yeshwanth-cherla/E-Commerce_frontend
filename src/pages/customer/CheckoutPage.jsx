import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useCart } from '../../context/CartContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, fetchCart, clearCartState } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // New address inline form state
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('USA');
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    const loadCheckoutData = async () => {
      setLoading(true);
      try {
        await fetchCart();
        const addressRes = await apiClient.get('/api/addresses');
        const userAddresses = addressRes.data || [];
        setAddresses(userAddresses);

        const defaultAddr = userAddresses.find((a) => a.isDefault) || userAddresses[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else {
          setShowNewAddress(true);
        }
      } catch (err) {
        console.error('Checkout load error:', err);
        setError('Failed to load checkout data');
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [fetchCart]);

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setAddingAddress(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/addresses', {
        street,
        city,
        state,
        zip,
        country,
        isDefault: addresses.length === 0,
      });
      const newAddr = res.data;
      setAddresses([...addresses, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowNewAddress(false);
      setStreet('');
      setCity('');
      setState('');
      setZip('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save new address');
    } finally {
      setAddingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select or add a delivery address');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/orders/checkout', {
        addressId: selectedAddressId,
      });
      const createdOrder = response.data;
      clearCartState();
      navigate(`/orders/${createdOrder.id}`, {
        state: { orderCreated: true },
      });
    } catch (err) {
      console.error('Checkout failure:', err);
      setError(err.response?.data?.message || 'Checkout failed. Please review cart and stock availability.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Preparing checkout..." />;

  const cartItems = cart?.items || cart?.cartItems || [];
  const getItemPrice = (item) => Number(item.productPrice ?? item.unitPrice ?? 0);
  const totalPrice = cart?.cartTotal ?? cartItems.reduce(
    (acc, item) => acc + getItemPrice(item) * item.quantity,
    0
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Checkout & Review Order</h1>

      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {cartItems.length === 0 ? (
        <div style={styles.emptyCard}>
          <h3>Your cart is empty</h3>
          <p>Please add items to your cart before proceeding to checkout.</p>
        </div>
      ) : (
        <div style={styles.checkoutGrid}>
          {/* Address Column */}
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>1. Shipping Address</h2>

            {addresses.length > 0 && !showNewAddress && (
              <div style={styles.addressList}>
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    style={{
                      ...styles.addressLabel,
                      border: selectedAddressId === addr.id ? '1px solid #6366f1' : '1px solid #334155',
                      backgroundColor: selectedAddressId === addr.id ? 'rgba(99, 102, 241, 0.1)' : '#1e293b',
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                    />
                    <div>
                      <strong style={{ color: '#f8fafc' }}>
                        {addr.street} {addr.isDefault && <span style={styles.defaultTag}>[Default]</span>}
                      </strong>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                        {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}, {addr.country}
                      </p>
                    </div>
                  </label>
                ))}

                <button
                  type="button"
                  onClick={() => setShowNewAddress(true)}
                  style={styles.addAddressBtn}
                >
                  + Add New Address
                </button>
              </div>
            )}

            {(showNewAddress || addresses.length === 0) && (
              <form onSubmit={handleCreateAddress} style={styles.addressForm}>
                <h3 style={{ color: '#f8fafc', fontSize: '1rem', marginBottom: '1rem' }}>
                  Add Shipping Address
                </h3>
                <div style={styles.field}>
                  <label style={styles.label}>Street Address</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 Main St"
                    style={styles.input}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={styles.field}>
                    <label style={styles.label}>City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="NY"
                      style={styles.input}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={styles.field}>
                    <label style={styles.label}>Zip Code</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="10001"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Country</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="USA"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button type="submit" disabled={addingAddress} style={styles.saveAddressBtn}>
                    {addingAddress ? 'Saving...' : 'Save & Select Address'}
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddress(false)}
                      style={styles.cancelAddressBtn}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Summary & Confirmation Column */}
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>2. Payment Method</h2>

            <div style={styles.codBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <input
                  type="radio"
                  id="codOption"
                  name="paymentMethod"
                  checked
                  readOnly
                  style={{ accentColor: '#6366f1', width: '18px', height: '18px' }}
                />
                <label htmlFor="codOption" style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
                  💵 Cash on Delivery (COD)
                </label>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.5rem 0 0 1.8rem' }}>
                Pay with cash when your package is delivered to your doorstep.
              </p>
            </div>

            <h2 style={{ ...styles.sectionTitle, marginTop: '1.8rem' }}>3. Order Summary</h2>

            <div style={styles.itemList}>
              {cartItems.map((item) => (
                <div key={item.id} style={styles.itemRow}>
                  <span>
                    {item.productName} <small style={{ color: '#94a3b8' }}>x {item.quantity}</small>
                  </span>
                  <span>₹{(getItemPrice(item) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <hr style={styles.divider} />

            <div style={{ ...styles.itemRow, fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
              <span>Total Amount</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>

            <div style={styles.paymentInfoNote}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                ℹ️ Initial Payment Status: <strong style={{ color: '#f59e0b' }}>UNPAID / PENDING</strong>. Status will update to <strong>PAID</strong> after delivery collection.
              </p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !selectedAddressId}
              style={{
                ...styles.placeOrderBtn,
                opacity: submitting || !selectedAddressId ? 0.6 : 1,
              }}
            >
              {submitting ? 'Placing Order...' : 'Confirm & Place Order (COD)'}
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
  emptyCard: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    color: '#94a3b8',
  },
  checkoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    alignItems: 'start',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.8rem',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: '1.2rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
  },
  addressList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  addressLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.8rem',
    padding: '1rem',
    border: '1px solid #334155',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  defaultTag: {
    color: '#6366f1',
    fontSize: '0.75rem',
  },
  addAddressBtn: {
    marginTop: '0.5rem',
    padding: '0.6rem',
    backgroundColor: 'transparent',
    color: '#818cf8',
    border: '1px dashed #6366f1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  addressForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.8rem',
  },
  input: {
    padding: '0.6rem 0.8rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.9rem',
  },
  saveAddressBtn: {
    padding: '0.6rem 1rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelAddressBtn: {
    padding: '0.6rem 1rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    marginBottom: '1rem',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#cbd5e1',
    fontSize: '0.95rem',
  },
  divider: {
    borderColor: '#1e293b',
    margin: '1.2rem 0',
  },
  codBox: {
    backgroundColor: '#1e293b',
    border: '1px solid #6366f1',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  paymentInfoNote: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0.8rem',
    margin: '1.2rem 0',
  },
  placeOrderBtn: {
    width: '100%',
    padding: '0.9rem',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.05rem',
    fontWeight: '800',
    cursor: 'pointer',
  },
};

export default CheckoutPage;
