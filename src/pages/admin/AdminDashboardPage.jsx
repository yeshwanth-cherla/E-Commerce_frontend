import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/admin/dashboard');
      setMetrics(response.data);
    } catch (err) {
      console.error('Admin dashboard error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <LoadingSpinner message="Loading administrator metrics..." />;
  if (error || !metrics) return <AlertMessage type="error" message={error || 'Failed to load metrics'} />;

  const ordersByStatus = metrics.ordersByStatus || {};

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin System Dashboard</h1>

      {/* Top Metric Cards Grid */}
      <div style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>Total Users</span>
          <div style={styles.cardValue}>{metrics.totalUsers}</div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>Active Products</span>
          <div style={styles.cardValue}>{metrics.totalEnabledProducts}</div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>Categories</span>
          <div style={styles.cardValue}>{metrics.totalCategories}</div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>Total Orders</span>
          <div style={styles.cardValue}>{metrics.totalOrders}</div>
        </div>

        <div style={{ ...styles.metricCard, borderLeft: '4px solid #f59e0b' }}>
          <span style={styles.cardLabel}>Low Stock Alert</span>
          <div style={{ ...styles.cardValue, color: '#f59e0b' }}>{metrics.lowStockProducts}</div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.cardLabel}>Total Reviews</span>
          <div style={styles.cardValue}>{metrics.totalReviews}</div>
        </div>
      </div>

      {/* Status Breakdown Section */}
      <div style={styles.sectionGrid}>
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Orders Breakdown by Status</h3>
          <div style={styles.statusList}>
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} style={styles.statusRow}>
                <span style={styles.statusName}>{status}</span>
                <span style={styles.statusCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Payment Processing Overview</h3>
          <div style={styles.statusList}>
            <div style={styles.statusRow}>
              <span>Pending Payments</span>
              <strong style={{ color: '#f59e0b' }}>{metrics.pendingPayments}</strong>
            </div>
            <div style={styles.statusRow}>
              <span>Successful Payments</span>
              <strong style={{ color: '#4ade80' }}>{metrics.successfulPayments}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
    marginBottom: '2rem',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1.2rem',
    marginBottom: '2rem',
  },
  metricCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '1.5rem',
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#f8fafc',
    fontSize: '2rem',
    fontWeight: '800',
    marginTop: '0.5rem',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '1.8rem',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '1.2rem',
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#cbd5e1',
    fontSize: '0.95rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid #1e293b',
  },
  statusName: {
    fontWeight: '600',
  },
  statusCount: {
    color: '#f8fafc',
    fontWeight: '700',
  },
};

export default AdminDashboardPage;
