import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const OrderDetailPage = () => {
  const params = useParams();
  const orderId = params.id || params.orderId;
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderJustCreated] = useState(location.state?.orderCreated || false);

  const loadOrderDetail = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error loading order detail:', err);
      setError(err.response?.data?.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  if (loading) return <LoadingSpinner message="Loading order details..." />;
  if (error || !order) return <AlertMessage type="error" message={error || 'Order not found'} />;

  const addr = order.address || {};

  return (
    <div style={styles.container}>
      {orderJustCreated && (
        <AlertMessage
          type="success"
          message="🎉 Your order has been placed successfully! Below are your order details."
        />
      )}

      <div style={styles.headerRow}>
        <div>
          <Link to="/orders" style={styles.backLink}>
            &larr; Back to Orders
          </Link>
          <h1 style={styles.title}>Order Details</h1>
          <p style={styles.orderIdText}>ID: {order.id}</p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={styles.statusBadge}>{order.status}</span>
          <p style={styles.dateText}>
            Placed on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div style={styles.contentGrid}>
        {/* Items List */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Items Ordered</h3>
          <div style={styles.itemsList}>
            {order.items?.map((item) => (
              <div key={item.id} style={styles.itemRow}>
                <div style={styles.itemMain}>
                  <strong style={{ color: '#f8fafc' }}>{item.productName}</strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    ${Number(item.priceAtPurchase).toFixed(2)} x {item.quantity}
                  </span>
                </div>
                <span style={styles.lineTotal}>
                  ${(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <hr style={styles.divider} />

          <div style={styles.totalRow}>
            <span>Total Amount</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Snapshot Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Delivery Address</h3>
          <div style={styles.addressSnapshot}>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '0.4rem' }}>
              {addr.street}
            </strong>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
              {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}
              <br />
              {addr.country}
            </p>
          </div>

          <div style={styles.statusNotice}>
            <h4 style={{ color: '#f8fafc', fontSize: '0.9rem', margin: '0 0 0.4rem 0' }}>
              Payment Information
            </h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
              Method: <strong>Cash on Delivery (COD)</strong>
              <br />
              Status:{' '}
              <strong
                style={{
                  color: order.paymentStatus === 'SUCCESS' ? '#4ade80' : '#f59e0b',
                }}
              >
                {order.paymentStatus === 'SUCCESS' ? 'PAID / COLLECTED' : 'UNPAID / PENDING'}
              </strong>
              {order.paidAt && (
                <>
                  <br />
                  Collected At: {new Date(order.paidAt).toLocaleString()}
                </>
              )}
              <br />
              Order Status: <strong>{order.status}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  backLink: {
    color: '#818cf8',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: '0.3rem 0',
  },
  orderIdText: {
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  statusBadge: {
    display: 'inline-block',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '12px',
    marginBottom: '0.3rem',
  },
  dateText: {
    color: '#64748b',
    fontSize: '0.85rem',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '2rem',
    alignItems: 'start',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.8rem',
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '1.2rem',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  lineTotal: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: '1.05rem',
  },
  divider: {
    borderColor: '#1e293b',
    margin: '1.5rem 0',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#f8fafc',
    fontSize: '1.2rem',
    fontWeight: '800',
  },
  addressSnapshot: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  statusNotice: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '1rem',
  },
};

export default OrderDetailPage;
