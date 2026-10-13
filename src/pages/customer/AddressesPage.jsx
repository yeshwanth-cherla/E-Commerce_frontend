import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../../services/apiClient';
import { Icon } from '../../components/Icon';
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
  const [country, setCountry] = useState('India');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/addresses');
      setAddresses(response.data || []);
    } catch (err) {
      console.error('Error loading addresses:', err);
      setError(err.response?.data?.message || 'Failed to load delivery addresses');
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
    setCountry('India');
    setIsDefault(addresses.length === 0);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    setEditingAddressId(addr.id);
    setStreet(addr.street || '');
    setCity(addr.city || '');
    setState(addr.state || '');
    setZip(addr.zip || '');
    setCountry(addr.country || 'India');
    setIsDefault(Boolean(addr.isDefault));
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!street.trim() || !city.trim() || !zip.trim()) {
      setFormError('Please fill in all required address fields.');
      return;
    }

    setSaving(true);
    setFormError('');
    setError(null);

    try {
      const payload = {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zip.trim(),
        country: country.trim() || 'India',
        isDefault,
      };

      if (editingAddressId) {
        await apiClient.put(`/api/addresses/${editingAddressId}`, payload);
        setToastMessage('Address updated successfully!');
      } else {
        await apiClient.post('/api/addresses', payload);
        setToastMessage('New address saved successfully!');
      }
      setShowModal(false);
      await loadAddresses();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Save address error:', err);
      setFormError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Are you sure you want to remove this delivery address?')) return;
    setError(null);
    try {
      await apiClient.delete(`/api/addresses/${addressId}`);
      setToastMessage('Address removed successfully');
      await loadAddresses();
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('Delete address error:', err);
      setError(err.response?.data?.message || 'Failed to delete address');
    }
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="shell page">
        <LoadingSpinner message="Loading delivery addresses..." />
      </div>
    );
  }

  return (
    <div className="shell page">
      {/* ── Page Header ── */}
      <div className="page-title page-title-row">
        <div>
          <span className="kicker">Delivery Locations</span>
          <h1>Saved addresses</h1>
          <p>Manage your delivery destinations for fast and convenient checkout.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn btn-primary"
        >
          <Icon name="plus" size={16} /> Add new address
        </button>
      </div>

      {toastMessage && (
        <div style={{ marginBottom: '20px' }}>
          <AlertMessage
            type="success"
            message={toastMessage}
            onClose={() => setToastMessage('')}
          />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {/* ── Address Cards Grid or Empty State ── */}
      {addresses.length === 0 ? (
        <div className="empty-state large">
          <span className="empty-icon">
            <Icon name="box" size={30} />
          </span>
          <h1>No delivery addresses saved</h1>
          <p>Add a delivery address to make checkout faster and easier for future orders.</p>
          <button onClick={openCreateModal} className="btn btn-primary">
            <Icon name="plus" size={16} /> Add address
          </button>
        </div>
      ) : (
        <div className="address-grid">
          {addresses.map((addr) => (
            <article className="address-card" key={addr.id}>
              <div className="address-card-header">
                <div className="address-street">{addr.street}</div>
                {addr.isDefault && (
                  <span className="status-pill status-blue">Default</span>
                )}
              </div>

              <div className="address-details">
                {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.zip}
                <br />
                {addr.country || 'India'}
              </div>

              <div className="address-actions">
                <button
                  onClick={() => openEditModal(addr)}
                  className="btn btn-secondary"
                  style={{ minHeight: '34px', padding: '0 12px', fontSize: '11px' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="btn btn-ghost"
                  style={{
                    minHeight: '34px',
                    padding: '0 10px',
                    fontSize: '11px',
                    color: 'var(--danger)',
                  }}
                >
                  <Icon name="trash" size={14} /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Create / Edit Address Modal ── */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
            <header className="modal-head">
              <div>
                <h2 id="address-modal-title">
                  {editingAddressId ? 'Edit Address' : 'New Delivery Address'}
                </h2>
                <p>Enter your full delivery location details below.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => !saving && setShowModal(false)}
                aria-label="Close modal"
              >
                <Icon name="close" size={16} />
              </button>
            </header>

            <form onSubmit={handleSave} noValidate>
              <div className="modal-body form-grid">
                {formError && (
                  <div className="span-2" style={{ marginBottom: '8px' }}>
                    <AlertMessage type="error" message={formError} />
                  </div>
                )}

                <label className="span-2">
                  <span>Street Address *</span>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 24, Lake View Road, Apt 3B"
                  />
                </label>

                <label>
                  <span>City *</span>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                  />
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

                <label>
                  <span>Postal Code / PIN *</span>
                  <input
                    type="text"
                    required
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="e.g. 560001"
                  />
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

                <div className="span-2" style={{ marginTop: '4px' }}>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: 'var(--ink)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span>Set as my default shipping address</span>
                  </label>
                </div>
              </div>

              <footer className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <>
                      <span className="spinner" /> Saving…
                    </>
                  ) : (
                    'Save address'
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressesPage;
