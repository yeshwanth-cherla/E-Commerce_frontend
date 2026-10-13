import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { useCart } from '../../context/CartContext';
import { Icon } from '../../components/Icon';
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

  // New address form state
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('India');
  const [addingAddress, setAddingAddress] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const formatPrice = (value) => {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    const loadCheckoutData = async () => {
      setLoading(true);
      setError(null);
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
        setError(err.response?.data?.message || 'Failed to load checkout data');
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [fetchCart]);

  const validateAddressForm = () => {
    const errors = {};
    if (!street.trim()) errors.street = 'Street address is required';
    if (!city.trim()) errors.city = 'City is required';
    if (!zip.trim()) {
      errors.zip = 'Postal code / PIN is required';
    } else if (!/^[0-9A-Za-z -]{3,10}$/.test(zip.trim())) {
      errors.zip = 'Enter a valid postal code';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    setAddingAddress(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/addresses', {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim() || 'India',
        isDefault: addresses.length === 0,
      });
      const newAddr = res.data;
      setAddresses((prev) => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      setShowNewAddress(false);
      setStreet('');
      setCity('');
      setState('');
      setZip('');
      setFormErrors({});
    } catch (err) {
      console.error('Error saving address:', err);
      setError(err.response?.data?.message || 'Failed to save new delivery address');
    } finally {
      setAddingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (submitting) return;

    if (!selectedAddressId) {
      setError('Please select or add a delivery address to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/orders/checkout', {
        addressId: selectedAddressId,
      });
      const createdOrder = response.data;
      if (clearCartState) clearCartState();
      navigate(`/orders/${createdOrder.id}`, {
        state: { orderCreated: true },
      });
    } catch (err) {
      console.error('Checkout submission failure:', err);
      if (err.response?.status === 409) {
        setError(err.response?.data?.message || 'One or more items in your cart is out of stock or unavailable.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Cannot checkout an empty or invalid cart.');
      } else {
        setError(err.response?.data?.message || 'Checkout failed. Please review your cart and stock availability.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="shell page">
        <LoadingSpinner message="Preparing checkout..." />
      </main>
    );
  }

  const cartItems = cart?.items || cart?.cartItems || [];
  const getItemPrice = (item) => Number(item.productPrice ?? item.unitPrice ?? 0);
  const total = cart?.cartTotal ?? cartItems.reduce(
    (acc, item) => acc + getItemPrice(item) * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return (
      <main className="shell page">
        <div className="empty-state large">
          <span className="empty-icon">
            <Icon name="bag" size={30} />
          </span>
          <h1>Your cart is empty</h1>
          <p>Please add items to your cart before proceeding to checkout.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Browse products
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <button onClick={() => navigate('/cart')}>Cart</button>
        <Icon name="chevron" size={14} />
        <b>Checkout</b>
      </nav>

      <div className="page-title">
        <span className="kicker">Final step</span>
        <h1>Checkout</h1>
        <p>Review your delivery address and order details before confirming.</p>
      </div>

      {error && (
        <div style={{ marginBottom: '24px' }}>
          <AlertMessage type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      <div className="checkout-layout">
        <div>
          {/* Step 1: Delivery Address */}
          <section className="form-card">
            <div className="card-title">
              <span className="step-number">1</span>
              <div>
                <h2>Delivery address</h2>
                <p>Select a saved delivery address or enter a new one.</p>
              </div>
            </div>

            {addresses.length > 0 && !showNewAddress && (
              <div className="address-select-grid">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <label
                      key={addr.id}
                      className={`address-card-radio ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        value={addr.id}
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div className="address-body">
                        <strong>
                          {addr.street}
                          {addr.isDefault && <span className="address-tag">Default</span>}
                        </strong>
                        <span style={{ color: 'var(--muted)' }}>
                          {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}
                        </span>
                        <small style={{ color: 'var(--subtle)' }}>{addr.country || 'India'}</small>
                      </div>
                    </label>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowNewAddress(true)}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                >
                  <Icon name="plus" size={15} /> Add new address
                </button>
              </div>
            )}

            {(showNewAddress || addresses.length === 0) && (
              <form onSubmit={handleCreateAddress} noValidate>
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                    Add new delivery address
                  </strong>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddress(false);
                        setFormErrors({});
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '0 8px', minHeight: '32px', fontSize: '11px' }}
                    >
                      Use existing address
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <label className={`span-2 ${formErrors.street ? 'field-error' : ''}`}>
                    <span>Street Address *</span>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        if (formErrors.street) setFormErrors((p) => ({ ...p, street: null }));
                      }}
                      placeholder="e.g. 24, Lake View Road, Apt 3B"
                    />
                    {formErrors.street && <small>{formErrors.street}</small>}
                  </label>

                  <label className={formErrors.city ? 'field-error' : ''}>
                    <span>City *</span>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (formErrors.city) setFormErrors((p) => ({ ...p, city: null }));
                      }}
                      placeholder="e.g. Bengaluru"
                    />
                    {formErrors.city && <small>{formErrors.city}</small>}
                  </label>

                  <label>
                    <span>State / Region</span>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Karnataka"
                    />
                  </label>

                  <label className={formErrors.zip ? 'field-error' : ''}>
                    <span>Postal Code / PIN *</span>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => {
                        setZip(e.target.value);
                        if (formErrors.zip) setFormErrors((p) => ({ ...p, zip: null }));
                      }}
                      placeholder="e.g. 560001"
                    />
                    {formErrors.zip && <small>{formErrors.zip}</small>}
                  </label>

                  <label>
                    <span>Country</span>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="submit"
                    disabled={addingAddress}
                    className="btn btn-primary"
                  >
                    {addingAddress ? (
                      <>
                        <span className="spinner" /> Saving address…
                      </>
                    ) : (
                      'Save & use address'
                    )}
                  </button>

                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddress(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>

          {/* Step 2: Payment Method */}
          <section className="form-card">
            <div className="card-title">
              <span className="step-number">2</span>
              <div>
                <h2>Payment method</h2>
                <p>Cash on Delivery is available for all eligible orders.</p>
              </div>
            </div>

            <label className="payment-option">
              <input type="radio" defaultChecked name="payment" readOnly />
              <span className="radio-mark" />
              <span>
                <b>Cash on Delivery (COD)</b>
                <small>Pay in cash when your order is delivered to your doorstep. No advance payment required.</small>
              </span>
              <Icon name="check" size={18} />
            </label>
          </section>
        </div>

        {/* Aside: Order Summary */}
        <aside className="summary-card checkout-summary">
          <h2>Your order</h2>

          <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '16px' }}>
            {cartItems.map((item) => {
              const itemPrice = getItemPrice(item);
              const lineTotal = itemPrice * item.quantity;
              return (
                <div className="mini-item" key={item.id}>
                  <img
                    src={item.productImageUrl || ''}
                    alt={item.productName || 'Product'}
                  />
                  <span>
                    <Link
                      to={`/products/${item.productId}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {item.productName}
                    </Link>
                    <small>Qty {item.quantity} &middot; {formatPrice(itemPrice)}</small>
                  </span>
                  <b>{formatPrice(lineTotal)}</b>
                </div>
              );
            })}
          </div>

          <div className="summary-line">
            <span>Subtotal</span>
            <b>{formatPrice(total)}</b>
          </div>

          <div className="summary-line" style={{ marginTop: '8px' }}>
            <span>Shipping</span>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE</span>
          </div>

          <div className="summary-total">
            <span>Payable amount</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <button
            className="btn btn-primary full"
            disabled={submitting || !selectedAddressId || cartItems.length === 0}
            onClick={handlePlaceOrder}
          >
            {submitting ? (
              <>
                <span className="spinner" /> Confirming order…
              </>
            ) : (
              'Place order'
            )}
          </button>

          <p className="confirm-copy">
            {submitting
              ? 'Submission is locked to prevent duplicate orders.'
              : 'Your order is confirmed only after server verification.'}
          </p>
        </aside>
      </div>
    </main>
  );
};

export default CheckoutPage;
