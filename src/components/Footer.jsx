import React from 'react';

export const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <p style={styles.text}>
          &copy; {new Date().getFullYear()} E-Commerce Platform. Built with React (Vite), Spring Boot, Supabase Auth & PostgreSQL.
        </p>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#090d16',
    borderTop: '1px solid #1e293b',
    padding: '1.5rem',
    marginTop: 'auto',
    textAlign: 'center',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  text: {
    color: '#64748b',
    fontSize: '0.85rem',
  },
};

export default Footer;
