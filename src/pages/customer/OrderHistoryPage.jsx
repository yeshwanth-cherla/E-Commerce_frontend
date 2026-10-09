import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { AlertMessage } from '../../components/AlertMessage';

export const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/orders', {
        params: { page, size: 10 },
      });
      setOrders(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return '#f59e0b';
      case 'CONFIRMED':
        return '#3b82f6';
      case 'SHIPPED':
        return '#8b5cf6';
      case 'DELIVERED':
        return '#22c55e';
      case 'CANCELLED':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  if (loading) return <LoadingSpinner message="Loading your order history..." />;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Your Order History</h1>

      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {orders.length === 0 ? (
        <div style={styles.emptyCard}>
          <h3>No orders found</h3>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            You haven't placed any orders yet.
          </p>
          <Link to="/" style={styles.shopBtn}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={styles.ordersList}>
          {orders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <div style={styles.orderHeader}>
                <div>
                  <span style={styles.orderLabel}>Order ID</span>
                  <div style={styles.orderId}>{order.id}</div>
                  <span style={styles.orderDate}>
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(order.status),
                    }}
                  >
                    {order.status}
                  </span>
                  <div style={styles.orderTotal}>${Number(order.totalAmount).toFixed(2)}</div>
                </div>
              </div>

              {/* Items Summary */}
              <div style={styles.itemsSummary}>
                {order.items?.slice(0, 3).map((item) => (
                  <div key={item.id} style={styles.itemRow}>
                    <span>{item.productName} (x{item.quantity})</span>
                    <span>${(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                    + {order.items.length - 3} more item(s)...
                  </p>
                )}
              </div>

              <div style={styles.cardFooter}>
                <Link to={`/orders/${order.id}`} style={styles.viewDetailBtn}>
                  View Full Details &rarr;
                </Link>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
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
    padding: '4rem 1.5rem',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
  },
  shopBtn: {
    padding: '0.8rem 1.6rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  orderCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  },
  orderLabel: {
    color: '#64748b',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  orderId: {
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  orderDate: {
    color: '#94a3b8',
    fontSize: '0.85rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  orderTotal: {
    color: '#f8fafc',
    fontSize: '1.3rem',
    fontWeight: '800',
  },
  itemsSummary: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#cbd5e1',
    fontSize: '0.9rem',
    padding: '0.2rem 0',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewDetailBtn: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
};

export default OrderHistoryPage;
