import React from 'react';

export const StockBadge = ({ stock = 0, className = '' }) => {
  const count = Number(stock) || 0;

  if (count <= 0) {
    return (
      <span className={`stock stock-out ${className}`}>
        <span className="status-dot" />
        Out of stock
      </span>
    );
  }

  if (count <= 10) {
    return (
      <span className={`stock stock-low ${className}`}>
        <span className="status-dot" />
        Only {count} left
      </span>
    );
  }

  return (
    <span className={`stock ${className}`}>
      <span className="status-dot" />
      In stock
    </span>
  );
};

export default StockBadge;
