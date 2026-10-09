import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AlertMessage } from '../../components/AlertMessage';

export const AddressesPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Modal / Form State
  const [showModal, setShowModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('USA');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/addresses');
      setAddresses(response.data || []);
    } catch (err) {
      console.error('Error loading addresses:', err);
      setError(err.response?.data?.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openCreateModal = () => {
    setEditingAddressId(null);
    setStreet('');
    setCity('');
    setState('');
    setZip('');
    setCountry('USA');
    setIsDefault(addresses.length === 0);
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    setEditingAddressId(addr.id);
    setStreet(addr.street);
    setCity(addr.city);
    setState(addr.state || '');
    setZip(addr.zip || '');
    setCountry(addr.country);
    setIsDefault(addr.isDefault);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { street, city, state, zip, country, isDefault };
      if (editingAddressId) {
        await apiClient.put(`/api/addresses/${editingAddressId}`, payload);
        setToastMessage('Address updated successfully!');
      } else {
        await apiClient.post('/api/addresses', payload);
        setToastMessage('Address created successfully!');
      }
      setShowModal(false);
      await loadAddresses();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    setError(null);
    try {
      await apiClient.delete(`/api/addresses/${addressId}`);
      setToastMessage('Address deleted successfully');
      await loadAddresses();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete address';
      setError(msg);
    }
  };

  if (loading) return <LoadingSpinner message="Loading delivery addresses..." />;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Delivery Addresses</h1>
        <button onClick={openCreateModal} style={styles.addBtn}>
          + Add New Address
        </button>
      </div>

      {toastMessage && (
        <AlertMessage type="success" message={toastMessage} onClose={() => setToastMessage('')} />
      )}
      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {addresses.length === 0 ? (
        <div style={styles.emptyCard}>
          <h3>No delivery addresses saved</h3>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Add an address to make checkout faster and easier.
          </p>
          <button onClick={openCreateModal} style={styles.addBtn}>
            + Add Address
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {addresses.map((addr) => (
            <div key={addr.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong style={styles.street}>{addr.street}</strong>
                {addr.isDefault && <span style={styles.defaultBadge}>Default</span>}
              </div>
              <p style={styles.addressBody}>
                {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}
                <br />
                {addr.country}
              </p>
              <div style={styles.cardActions}>
                <button onClick={() => openEditModal(addr)} style={styles.editBtn}>
                  Edit
                </button>
                <button onClick={() => handleDelete(addr.id)} style={styles.deleteBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {editingAddressId ? 'Edit Address' : 'New Delivery Address'}
            </h3>

            <form onSubmit={handleSave} style={styles.form}>
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

              <div style={styles.checkboxField}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <label htmlFor="isDefault" style={{ color: '#cbd5e1', fontSize: '0.9rem', cursor: 'pointer' }}>
                  Set as default shipping address
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button type="submit" disabled={saving} style={styles.saveBtn}>
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.8rem',
    fontWeight: '800',
  },
  addBtn: {
    padding: '0.65rem 1.2rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyCard: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.8rem',
  },
  street: {
    color: '#f8fafc',
    fontSize: '1.05rem',
    wordBreak: 'break-word',
  },
  defaultBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  addressBody: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
  },
  cardActions: {
    marginTop: 'auto',
    display: 'flex',
    gap: '0.8rem',
  },
  editBtn: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  deleteBtn: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '1rem',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '2rem',
    width: '100%',
    maxWidth: '500px',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: '1.3rem',
    fontWeight: '700',
    marginBottom: '1.2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
  },
  input: {
    padding: '0.65rem 0.85rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    fontSize: '0.95rem',
  },
  checkboxField: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  saveBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '0.75rem 1.2rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default AddressesPage;
