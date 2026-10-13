import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertMessage } from '../../components/AlertMessage';

export const RegisterPage = () => {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName);
      setSuccessMessage('Account created successfully! Redirecting to sign in…');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="kicker">Join Aster</span>
          <h1>Create an account</h1>
          <p>Join us today to explore verified products and place orders.</p>
        </div>

        {errorMessage && (
          <div style={{ marginBottom: '18px' }}>
            <AlertMessage
              type="error"
              message={errorMessage}
              onClose={() => setErrorMessage('')}
            />
          </div>
        )}

        {successMessage && (
          <div style={{ marginBottom: '18px' }}>
            <AlertMessage
              type="success"
              message={successMessage}
              onClose={() => setSuccessMessage('')}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ananya Sharma"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ananya@example.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary full"
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
