import React from 'react';

export const AlertMessage = ({ type = 'error', message, onClose }) => {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  const bgColor = isError ? 'rgba(239, 68, 68, 0.15)' : isSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)';
  const borderColor = isError ? '#ef4444' : isSuccess ? '#22c55e' : '#3b82f6';
  const textColor = isError ? '#fca5a5' : isSuccess ? '#86efac' : '#93c5fd';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.25rem',
        backgroundColor: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '6px',
        color: textColor,
        margin: '1rem 0',
        fontSize: '0.95rem',
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.1rem',
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default AlertMessage;
