import React from 'react';

const icons = {
  search: 'M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z',
  bag: 'M6 8h12l1 13H5L6 8zm3 0V6a3 3 0 016 0v2',
  user: 'M20 21a8 8 0 00-16 0m8-10a4 4 0 100-8 4 4 0 000 8z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'M9 18l6-6-6-6',
  minus: 'M5 12h14',
  plus: 'M12 5v14m-7-7h14',
  trash: 'M4 7h16m-10 4v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14',
  grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  box: 'M21 8l-9-5-9 5 9 5 9-5zm-18 0v9l9 5 9-5V8m-9 5v9',
  orders: 'M6 3h12v18H6V3zm3 5h6M9 12h6m-6 4h4',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m7-10a4 4 0 100-8 4 4 0 000 8zm9 0a4 4 0 100-8m4 18v-2a4 4 0 00-3-3.87',
  check: 'M20 6L9 17l-5-5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
};

export const Icon = ({ name, size = 20, className = '', style = {} }) => {
  const path = icons[name];
  if (!path) return null;

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <path d={path} />
    </svg>
  );
};

export default Icon;
