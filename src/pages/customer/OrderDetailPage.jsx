import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';

export const OrderDetailPage = () => {
  const params = useParams();
  const orderId = params.id || params.orderId;
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const orderJustCreated = Boolean(location.state?.orderCreated);

  const loadOrderDetail = useCallback(async (isManualRefresh = false) => {
    if (!orderId) return;
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await apiClient.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error loading order detail:', err);
      if (err.response?.status === 404) {
        setError('Order not found or you do not have permission to view it.');
      } else {
        setError(err.response?.data?.message || 'Failed to load order details');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleCopyOrderId = () => {
    if (!order?.id) return;
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <LoadingSpinner message="Loading your order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Link
          to="/orders"
          style={{
            color: '#818cf8',
            fontSize: '0.875rem',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            width: 'fit-content'
          }}
        >
          &larr; Back to Order History
        </Link>
        <AlertMessage type="error" message={error || 'Order not found'} />
        <div
          style={{
            backgroundColor: '#0b1329',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🔍</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
            Unable to Locate Order
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
            We could not retrieve details for this order. It may have been removed or belongs to another customer account.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <Link
              to="/orders"
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              View Order History
            </Link>
            <Link
              to="/"
              style={{
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.875rem',
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determine steps: For modern COD orders, standard progression is CONFIRMED -> SHIPPED -> DELIVERED.
  // If an older legacy order is in PENDING status, include PENDING seamlessly.
  const isLegacyPending = order.status === 'PENDING';
  const steps = isLegacyPending
    ? ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']
    : ['CONFIRMED', 'SHIPPED', 'DELIVERED'];

  const stepMeta = {
    PENDING: {
      label: 'Order Placed',
      desc: 'Order received',
      icon: '📝',
    },
    CONFIRMED: {
      label: 'Confirmed',
      desc: 'Order accepted & verified',
      icon: '✓',
    },
    SHIPPED: {
      label: 'Shipped',
      desc: 'Out for delivery',
      icon: '🚚',
    },
    DELIVERED: {
      label: 'Delivered',
      desc: 'Handed over & completed',
      icon: '📦',
    },
  };

  const currentStepIndex = steps.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const getStepState = (stepKey) => {
    if (isCancelled) return 'cancelled';
    const idx = steps.indexOf(stepKey);
    if (idx < currentStepIndex) return 'completed';
    if (idx === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const addr = order.address || {};
  const isPaid = order.paymentStatus === 'SUCCESS';

  return (
    <div className="order-detail-page">
      {/* ── Top Navigation Link ── */}
      <div>
        <Link
          to="/orders"
          style={{
            color: '#818cf8',
            fontSize: '0.875rem',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          &larr; Back to Order History
        </Link>
      </div>

      {/* ── 1. Success Banner (for newly placed orders) ── */}
      {orderJustCreated && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '800',
              flexShrink: 0,
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
            }}
          >
            ✓
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#6ee7b7', margin: 0, letterSpacing: '-0.01em' }}>
              Order Placed Successfully!
            </h2>
            <p style={{ color: '#d1fae5', fontSize: '0.875rem', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
              Thank you for shopping with us! Your <strong>Cash on Delivery</strong> order is confirmed and is being prepared for fulfillment.
            </p>
          </div>
        </div>
      )}

      {/* ── 2. Order Header Card ── */}
      <div
        style={{
          backgroundColor: '#0b1329',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              Order Details
            </h1>
            {/* COD Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.35)',
              }}
            >
              💵 Cash on Delivery
            </span>
            {/* Payment Status Pill */}
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: isPaid ? '#4ade80' : '#fbbf24',
                border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
              }}
            >
              {isPaid ? 'Payment: Collected' : 'Payment: Due on Delivery'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Order ID:</span>
            <code
              style={{
                backgroundColor: '#070d1e',
                color: '#cbd5e1',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                border: '1px solid #1e293b',
              }}
            >
              {order.id}
            </code>
            <button
              onClick={handleCopyOrderId}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? '#4ade80' : '#818cf8',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '2px 6px',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <span style={{ color: '#475569', margin: '0 0.2rem' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Placed on {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Live Status Tag & Refresh Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
              Status
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: '800',
                color:
                  order.status === 'DELIVERED'
                    ? '#4ade80'
                    : order.status === 'CANCELLED'
                    ? '#f87171'
                    : order.status === 'SHIPPED'
                    ? '#c084fc'
                    : '#60a5fa',
              }}
            >
              {order.status}
            </div>
          </div>

          <button
            onClick={() => loadOrderDetail(true)}
            disabled={refreshing}
            title="Refresh order status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              color: '#cbd5e1',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>
              🔄
            </span>
          </button>
        </div>
      </div>

      {/* ── 3. Horizontal Order Status Tracker Card ── */}
      <div
        style={{
          backgroundColor: '#0b1329',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '1.75rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Order Fulfillment Progress
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Standard Delivery
          </span>
        </div>

        {isCancelled ? (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <div>
              <strong style={{ color: '#fca5a5', fontSize: '0.95rem', display: 'block' }}>
                Order Cancelled
              </strong>
              <p style={{ color: '#fecaca', fontSize: '0.85rem', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                This order was cancelled and will not be delivered. Reserved stock has been automatically restored.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', padding: '0 0.5rem' }}>
            {/* Connecting Track Line */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '8%',
                right: '8%',
                height: '4px',
                backgroundColor: '#1e293b',
                borderRadius: '4px',
                zIndex: 1,
              }}
            >
              {/* Active Segment Fill */}
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#10b981',
                  borderRadius: '4px',
                  width:
                    currentStepIndex === -1
                      ? '0%'
                      : `${(currentStepIndex / (steps.length - 1)) * 100}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {/* Stepper Nodes */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {steps.map((stepKey, idx) => {
                const state = getStepState(stepKey);
                const info = stepMeta[stepKey] || { label: stepKey, desc: '', icon: '•' };

                let circleBg = '#1e293b';
                let circleBorder = '#334155';
                let circleColor = '#64748b';
                let circleShadow = 'none';

                if (state === 'completed') {
                  circleBg = '#10b981';
                  circleBorder = '#10b981';
                  circleColor = '#ffffff';
                  circleShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
                } else if (state === 'current') {
                  circleBg = '#4f46e5';
                  circleBorder = '#6366f1';
                  circleColor = '#ffffff';
                  circleShadow = '0 0 16px rgba(99, 102, 241, 0.5)';
                }

                return (
                  <div
                    key={stepKey}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: circleBg,
                        border: `2px solid ${circleBorder}`,
                        color: circleColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: state === 'completed' ? '1rem' : '0.9rem',
                        boxShadow: circleShadow,
                        transition: 'all 0.25s ease',
                        marginBottom: '0.65rem',
                      }}
                    >
                      {state === 'completed' ? '✓' : state === 'current' ? (info.icon || '●') : `${idx + 1}`}
                    </div>
                    <span
                      style={{
                        fontWeight: state === 'current' ? '800' : '600',
                        fontSize: '0.875rem',
                        color:
                          state === 'completed'
                            ? '#6ee7b7'
                            : state === 'current'
                            ? '#ffffff'
                            : '#64748b',
                        display: 'block',
                      }}
                    >
                      {info.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: state === 'current' ? '#a5b4fc' : '#475569',
                        marginTop: '0.15rem',
                        maxWidth: '120px',
                        lineHeight: 1.3,
                      }}
                    >
                      {info.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Main Content Grid (Items on Left, Summary on Right) ── */}
      <div className="order-detail-grid">
        {/* ── Left Column: Ordered Items (1.6fr) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Items Card */}
          <div
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', pb: '0.75rem', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Ordered Items ({order.items?.length || 0})
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Snapshot at purchase
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {order.items?.map((item) => {
                const unitPrice = Number(item.priceAtPurchase || 0);
                const lineTotal = Number(item.lineTotal ?? (unitPrice * item.quantity));

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                      {/* Thumbnail with constrained size */}
                      {item.productImageUrl ? (
                        <img
                          src={item.productImageUrl}
                          alt={item.productName}
                          className="order-item-thumb"
                        />
                      ) : (
                        <div
                          className="order-item-thumb"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                          }}
                        >
                          {item.productName ? item.productName.substring(0, 2).toUpperCase() : 'IT'}
                        </div>
                      )}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link
                          to={item.productId ? `/products/${item.productId}` : '#'}
                          style={{
                            color: '#f8fafc',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.productName || 'Product'}
                        </Link>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                          ₹{unitPrice.toFixed(2)} &times; {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
                        ₹{lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cash on Delivery Notice Card */}
          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
            }}
          >
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>ℹ️</span>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '0.2rem' }}>
                Cash on Delivery Information
              </strong>
              Please keep the exact order amount ready in cash when the delivery executive arrives. You do not need to make any advance payments online.
            </div>
          </div>
        </div>

        {/* ── Right Column: Order Summary, Payment & Address (1fr) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Order Summary Card */}
          <div
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Order Summary
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Items Subtotal</span>
                <span style={{ fontWeight: '600' }}>
                  ₹{Number(order.totalAmount).toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>Standard Delivery</span>
                <span style={{ color: '#4ade80', fontWeight: '700' }}>
                  FREE
                </span>
              </div>

              <div
                style={{
                  height: '1px',
                  backgroundColor: '#1e293b',
                  margin: '0.35rem 0',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
                  Total to Pay
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  ₹{Number(order.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Snapshot Card */}
          <div
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Payment Information
            </h2>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Method:</span>
                <strong style={{ color: '#ffffff' }}>Cash on Delivery (COD)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8' }}>Payment Status:</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isPaid ? '#4ade80' : '#fbbf24',
                    border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  }}
                >
                  {isPaid ? 'COLLECTED' : 'DUE ON DELIVERY'}
                </span>
              </div>

              {order.paidAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Collected at:</span>
                  <span>{new Date(order.paidAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address Card */}
          <div
            style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Delivery Address Snapshot
            </h2>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: '#ffffff', display: 'block', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                {addr.street || 'Address on file'}
              </strong>
              <div style={{ color: '#94a3b8' }}>
                {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                {addr.country || 'USA'}
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <Link
              to="/orders"
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                textAlign: 'center',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.875rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                transition: 'background-color 0.15s ease',
              }}
            >
              View All Orders
            </Link>
            <Link
              to="/"
              style={{
                backgroundColor: '#1e293b',
                color: '#cbd5e1',
                textAlign: 'center',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.875rem',
                textDecoration: 'none',
                border: '1px solid #334155',
                transition: 'background-color 0.15s ease',
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
