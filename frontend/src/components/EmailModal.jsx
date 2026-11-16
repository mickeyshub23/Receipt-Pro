import { useState, useEffect, useCallback } from 'react';

const EMAIL_KEY = 'rp_email';

export default function EmailModal({ open, onConfirm, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const closeModal = useCallback(() => {
    setEmail('');
    setError('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setError('');
      return;
    }
    const saved = window.localStorage.getItem(EMAIL_KEY);
    if (saved) setEmail(saved);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, closeModal]);

  const validate = (value) => {
    if (!value.trim()) return 'Email is required';
    const trimmed = value.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(trimmed)) return 'Please enter a valid email (example: name@domain.com)';
    return '';
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError(validate(e.target.value));
  };

  const handleSubmit = () => {
    const err = validate(email);
    if (err) {
      setError(err);
      return;
    }
    window.localStorage.setItem(EMAIL_KEY, email);
    onConfirm(email);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !error) handleSubmit();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };

  if (!open) return null;

  return (
    <div
      className="pw"
      role="dialog"
      aria-modal="true"
      aria-label="Enter your email"
      onClick={handleBackdropClick}
      style={{ zIndex: 50 }}
    >
      <div className="pbox">
        <div className="phead">
          <b>Enter your email</b>
          <button type="button" className="x" aria-label="Close" onClick={closeModal}>&times;</button>
        </div>

        <p className="mut">We need your email to initialize Paystack payment. It will be saved for future use.</p>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Email address</span>
          <input
            type="email"
            value={email}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder="your.name@example.com"
            style={{ width: '100%', padding: 10, fontSize: 16, borderRadius: 8, border: error ? '1.5px solid var(--error-text)' : '1.5px solid var(--border)' }}
            autoFocus
            aria-describedby="email-error"
          />
        </label>

        {error ? (
          <p id="email-error" style={{ color: 'var(--error-text)', fontSize: 14, marginTop: 4 }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="btn"
            onClick={handleSubmit}
            disabled={!email || Boolean(error)}
            style={{ opacity: (!email || Boolean(error)) ? 0.5 : 1, cursor: (!email || Boolean(error)) ? 'not-allowed' : 'pointer' }}
          >
            Continue to payment
          </button>
          <button type="button" className="btn alt" onClick={closeModal}>
            Cancel
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          Your email will be saved locally and used for this and future payments.
        </div>
      </div>
    </div>
  );
}