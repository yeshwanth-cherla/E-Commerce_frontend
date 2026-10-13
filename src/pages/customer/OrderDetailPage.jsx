import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Icon } from '../../components/Icon';
import { ProductImage } from '../../components/ProductImage';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const OrderDetailPage = () => {
  const params = useParams();
  const orderId = params.id || params.orderId;
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const orderJustCreated = Boolean(location.state?.orderCreated);

  const formatPrice = (value) => {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  };

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

  const getStatusPillClass = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'status-pill status-green';
      case 'CONFIRMED':
      case 'SHIPPED':
        return 'status-pill status-blue';
      case 'CANCELLED':
        return 'status-pill status-red';
      case 'PENDING':
      default:
        return 'status-pill status-amber';
    }
  };

  if (loading) {
    return (
      <main className="shell page">
        <LoadingSpinner message="Loading your order details..." />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="shell page">
        <nav className="breadcrumbs" style={{ marginBottom: '24px' }}>
          <button onClick={() => navigate('/orders')}>Orders</button>
          <Icon name="chevron" size={14} />
          <b>Order Details</b>
        </nav>

        <AlertMessage type="error" message={error || 'Order not found'} />

        <div className="empty-state large" style={{ marginTop: '24px' }}>
          <span className="empty-icon">
            <Icon name="box" size={30} />
          </span>
          <h1>Unable to locate order</h1>
          <p>
            We could not retrieve details for this order. It may have been removed or belongs to another customer account.
          </p>
          <div className="button-row">
            <button className="btn btn-primary" onClick={() => navigate('/orders')}>
              View order history
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Browse catalog
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const isPaid = order.paymentStatus === 'SUCCESS';
  const addr = order.address || {};
  const orderSteps = ['CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = orderSteps.indexOf(order.status);

  return (
    <main className="shell page">
      {/* ── 1. Order Confirmation Hero (Shown if user just placed the order) ── */}
      {orderJustCreated && (
        <section className="success-card" style={{ marginBottom: '40px' }}>
          <span className="success-icon">
            <Icon name="check" size={34} />
          </span>
          <span className="kicker">Backend confirmation received</span>
          <h1>Your order is confirmed</h1>
          <p>
            Thank you for shopping with us! Your <strong>Cash on Delivery</strong> order has been confirmed by the server and is now being prepared for delivery.
          </p>

          <div className="confirmation-grid">
            <div>
              <small>Order reference</small>
              <b style={{ fontFamily: 'monospace' }}>#{order.id.substring(0, 8).toUpperCase()}</b>
            </div>
            <div>
              <small>Payment method</small>
              <b>Cash on Delivery (COD)</b>
            </div>
            <div>
              <small>Payment status</small>
              <b>{isPaid ? 'Payment collected' : 'Pending collection on delivery'}</b>
            </div>
            <div>
              <small>Order total</small>
              <b>{formatPrice(order.totalAmount)}</b>
            </div>
          </div>

          <div className="button-row">
            <button className="btn btn-primary" onClick={() => navigate('/orders')}>
              View all orders
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Continue shopping
            </button>
          </div>
        </section>
      )}

      {/* ── 2. Top Navigation Breadcrumb ── */}
      <nav className="breadcrumbs" style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/orders')}>Orders</button>
        <Icon name="chevron" size={14} />
        <b>#{order.id.substring(0, 8).toUpperCase()}</b>
      </nav>

      {/* ── 3. Page Title & Action Bar ── */}
      <div className="page-title page-title-row" style={{ marginTop: '0', marginBottom: '24px' }}>
        <div>
          <span className="kicker">Order tracking</span>
          <h1>Order details</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Order ID:
            </span>
            <code
              style={{
                background: 'var(--canvas)',
                padding: '2px 8px',
                borderRadius: '5px',
                border: '1px solid var(--line)',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'var(--ink)',
              }}
            >
              {order.id}
            </code>
            <button
              onClick={handleCopyOrderId}
              className="btn btn-ghost"
              style={{ minHeight: '28px', padding: '0 8px', fontSize: '11px' }}
            >
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
            <span style={{ color: 'var(--subtle)' }}>&bull;</span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={getStatusPillClass(order.status)}>
            {order.status}
          </span>
          <button
            onClick={() => loadOrderDetail(true)}
            disabled={refreshing}
            className="btn btn-secondary"
            title="Refresh order status"
            style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>
              <Icon name="refresh" size={14} />
            </span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── 4. Fulfillment Progress Tracker ── */}
      <section className="detail-card" style={{ marginBottom: '24px' }}>
        <div className="detail-card-head">
          <h2>Fulfillment progress</h2>
          <small>Standard courier delivery</small>
        </div>

        {isCancelled ? (
          <div style={{ padding: '16px', background: 'var(--danger-soft)', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--danger)', fontSize: '20px' }}>⚠️</span>
            <div>
              <strong style={{ color: 'var(--danger)', fontSize: '13px', display: 'block' }}>
                Order Cancelled
              </strong>
              <small style={{ color: '#7f1d1d' }}>
                This order was cancelled and will not be delivered. Reserved inventory has been restored.
              </small>
            </div>
          </div>
        ) : (
          <div className="tracker">
            {[
              { key: 'CONFIRMED', label: 'Confirmed', desc: 'Order accepted' },
              { key: 'SHIPPED', label: 'Shipped', desc: 'Out for delivery' },
              { key: 'DELIVERED', label: 'Delivered', desc: 'Handed over' },
            ].map((step, idx) => {
              const isCompleted = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              const isStepDone = currentStepIdx >= idx;

              let stepClass = '';
              if (isCompleted || (isCurrent && idx === orderSteps.length - 1)) {
                stepClass = 'complete';
              } else if (isCurrent) {
                stepClass = 'active-step';
              }

              return (
                <div className={stepClass} key={step.key}>
                  <span>
                    {isStepDone ? <Icon name="check" size={13} /> : idx + 1}
                  </span>
                  <b>{step.label}</b>
                  <small>
                    {isCurrent ? 'Current status' : isCompleted ? 'Completed' : 'Upcoming'}
                  </small>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. Main Content Grid ── */}
      <div className="order-detail-layout">
        {/* Left Column: Ordered Items */}
        <div>
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Ordered items ({order.items?.length || 0})</h2>
              <small>Verified purchase snapshot</small>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {order.items?.map((item) => {
                const unitPrice = Number(item.priceAtPurchase || 0);
                const lineTotal = Number(item.lineTotal ?? (unitPrice * item.quantity));

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr auto',
                      gap: '16px',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <ProductImage
                      src={item.productImageUrl}
                      alt={item.productName || 'Product'}
                      style={{ width: '60px', height: '54px', borderRadius: '6px', objectFit: 'cover' }}
                    />

                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontFamily: 'Manrope', fontWeight: 700 }}>
                        <Link
                          to={item.productId ? `/products/${item.productId}` : '#'}
                          style={{ color: 'var(--ink)', textDecoration: 'none' }}
                        >
                          {item.productName || 'Product'}
                        </Link>
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {formatPrice(unitPrice)} &times; {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                      </div>
                    </div>

                    <strong style={{ fontFamily: 'Manrope', fontSize: '14px', color: 'var(--ink)' }}>
                      {formatPrice(lineTotal)}
                    </strong>
                  </div>
                );
              })}
            </div>

            {/* COD Explanation Note */}
            <div
              style={{
                marginTop: '20px',
                padding: '14px 16px',
                background: 'var(--canvas)',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '12px',
                color: 'var(--muted)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: 'var(--primary)', fontSize: '16px', lineHeight: 1 }}>💵</span>
              <div>
                <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '2px' }}>
                  Cash on Delivery
                </strong>
                Please have the exact amount of {formatPrice(order.totalAmount)} ready in cash when your order arrives.
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary, Payment, Address & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Order Summary Card */}
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Order summary</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="summary-line">
                <span>Items subtotal</span>
                <b>{formatPrice(order.totalAmount)}</b>
              </div>

              <div className="summary-line">
                <span>Shipping</span>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE</span>
              </div>

              <div className="summary-total" style={{ margin: '14px 0 0', paddingTop: '14px' }}>
                <span>Total amount</span>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </div>
            </div>
          </section>

          {/* Payment Information Card */}
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Payment info</h2>
              <span className={isPaid ? 'status-pill status-green' : 'status-pill status-amber'}>
                {isPaid ? 'Paid' : 'Due on Delivery'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Method:</span>
                <strong style={{ color: 'var(--ink)' }}>Cash on Delivery (COD)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Payment status:</span>
                <strong style={{ color: isPaid ? 'var(--success)' : 'var(--warning)' }}>
                  {isPaid ? 'Collected upon delivery' : 'Pending collection'}
                </strong>
              </div>

              {order.paidAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--subtle)' }}>
                  <span>Collected at:</span>
                  <span>{new Date(order.paidAt).toLocaleDateString('en-IN')}</span>
                </div>
              )}
            </div>
          </section>

          {/* Delivery Address Card */}
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Delivery address</h2>
            </div>

            <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)' }}>
              <strong>{addr.street || 'Address on file'}</strong>
              <div style={{ color: 'var(--muted)' }}>
                {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}
              </div>
              <div style={{ color: 'var(--subtle)', fontSize: '12px' }}>
                {addr.country || 'India'}
              </div>
            </div>
          </section>

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-primary full" onClick={() => navigate('/orders')}>
              View all orders
            </button>
            <button className="btn btn-secondary full" onClick={() => navigate('/')}>
              Continue shopping
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OrderDetailPage;
