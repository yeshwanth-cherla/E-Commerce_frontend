import React from 'react';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-bar" style={styles.container}>
      <button
        style={{
          ...styles.button,
          opacity: currentPage === 0 ? 0.5 : 1,
          cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
        }}
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        &larr; Previous
      </button>

      <span style={styles.info}>
        Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
      </span>

      <button
        style={{
          ...styles.button,
          opacity: currentPage >= totalPages - 1 ? 0.5 : 1,
          cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
        }}
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next &rarr;
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    marginTop: '2rem',
    marginBottom: '1rem',
  },
  button: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  info: {
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
};

export default Pagination;
