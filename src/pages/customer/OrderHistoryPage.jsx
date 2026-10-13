import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Icon } from '../../components/Icon';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { AlertMessage } from '../../components/AlertMessage';

export const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const formatPrice = (value) => {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  };

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

  const getTrackerStepClass = (stepKey, currentStatus) => {
    if (currentStatus === 'CANCELLED') return '';

    const orderFlow = ['CONFIRMED', 'SHIPPED', 'DELIVERED'];
    const currentIdx = orderFlow.indexOf(currentStatus);
    const targetIdx = orderFlow.indexOf(stepKey);

    if (currentIdx >= targetIdx) {
      return 'complete';
    }
    return '';
  };

  if (loading && orders.length === 0) {
    return (
      <main className="shell page">
        <LoadingSpinner message="Loading your order history..." />
      </main>
    );
  }

  return (
    <main className="shell page">
      <div className="page-title page-title-row">
        <div>
          <span className="kicker">Your account</span>
          <h1>My orders</h1>
          <p>Review recent purchases and track live delivery progress.</p>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '24px' }}>
          <AlertMessage type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="orders" size={28} />
          </span>
          <h3>No orders yet</h3>
          <p>Completed purchases and their delivery progress will appear here.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Start shopping
          </button>
        </div>
      ) : (
        <>
          <div className="orders-list">
            {orders.map((order) => {
              const isCancelled = order.status === 'CANCELLED';
              const isPaid = order.paymentStatus === 'SUCCESS';
              const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <section className="order-card" key={order.id}>
                  {/* Order Header */}
                  <div className="order-head">
                    <div>
                      <small>Order reference</small>
                      <b title={order.id} style={{ fontFamily: 'monospace' }}>
                        #{order.id ? order.id.substring(0, 8).toUpperCase() : 'ORDER'}
                      </b>
                    </div>

                    <div>
                      <small>Placed on</small>
                      <b>{orderDate}</b>
                    </div>

                    <div>
                      <small>Total amount</small>
                      <b>{formatPrice(order.totalAmount)}</b>
                    </div>

                    <span className={getStatusPillClass(order.status)}>
                      {order.status}
                    </span>
                  </div>

                  {/* Order Content */}
                  <div className="order-content">
                    {/* Products Preview */}
                    <div className="order-products">
                      {order.items?.slice(0, 3).map((item) => (
                        <div key={item.id}>
                          {item.productImageUrl ? (
                            <img src={item.productImageUrl} alt={item.productName || 'Product'} />
                          ) : (
                            <div className="thumb-fallback">
                              <Icon name="box" size={18} />
                            </div>
                          )}
                          <span>
                            <b>{item.productName}</b>
                            <small>
                              Quantity {item.quantity} &middot; {formatPrice(item.priceAtPurchase)}
                            </small>
                          </span>
                        </div>
                      ))}

                      {order.items?.length > 3 && (
                        <div style={{ color: 'var(--muted)', fontSize: '11px', paddingLeft: '70px' }}>
                          + {order.items.length - 3} more item(s)...
                        </div>
                      )}
                    </div>

                    {/* Stepper Progress */}
                    <div className={`tracker ${isCancelled ? 'tracker-cancelled' : ''}`}>
                      {[
                        { key: 'CONFIRMED', label: 'Confirmed', desc: 'Order accepted' },
                        { key: 'SHIPPED', label: 'Shipped', desc: 'In transit' },
                        { key: 'DELIVERED', label: 'Delivered', desc: 'Received' },
                      ].map((step) => {
                        const isDone = !isCancelled && getTrackerStepClass(step.key, order.status) === 'complete';
                        return (
                          <div className={isDone ? 'complete' : ''} key={step.key}>
                            <span>
                              {isDone ? <Icon name="check" size={13} /> : null}
                            </span>
                            <b>{step.label}</b>
                            <small>
                              {isDone ? step.desc : isCancelled ? 'Cancelled' : 'Pending'}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Footer */}
                  <div className="order-foot">
                    <span>
                      Payment: <b>Cash on Delivery &middot; {isPaid ? 'Paid' : 'Due on Delivery'}</b>
                    </span>

                    <div className="order-actions">
                      <Link
                        to={`/orders/${order.id}`}
                        className="btn btn-secondary"
                        style={{ minHeight: '34px', padding: '0 12px', fontSize: '11px' }}
                      >
                        View details <Icon name="arrow" size={14} />
                      </Link>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />

          <button
            className="continue-link"
            onClick={() => navigate('/')}
            style={{ marginTop: '28px' }}
          >
            <Icon name="arrow" size={17} /> Continue shopping
          </button>
        </>
      )}
    </main>
  );
};

export default OrderHistoryPage;
