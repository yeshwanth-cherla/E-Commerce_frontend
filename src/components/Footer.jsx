import React from 'react';
import { Link } from 'react-router-dom';
import { APPROVED_CATEGORIES } from '../constants/categories';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div>
          <div className="brand footer-brand">
            <span className="brand-mark">A</span>
            <span>Aster</span>
          </div>
          <p>Useful things, thoughtfully gathered for your everyday.</p>
          <small>Cash on Delivery (COD) supported on all orders.</small>
        </div>

        <div>
          <b>Shop Categories</b>
          {APPROVED_CATEGORIES.slice(0, 4).map((name) => (
            <Link key={name} to={`/?search=${encodeURIComponent(name)}`}>
              {name}
            </Link>
          ))}
          <Link to="/">View all categories →</Link>
        </div>

        <div>
          <b>Your Account</b>
          <Link to="/orders">My orders</Link>
          <Link to="/cart">Shopping cart</Link>
          <Link to="/addresses">Delivery addresses</Link>
        </div>

        <div>
          <b>Store Administration</b>
          <Link to="/admin">Admin workspace</Link>
          <small>Spring Boot API · Supabase PostgreSQL & Auth</small>
        </div>
      </div>

      <div className="shell footer-bottom">
        <span>
          &copy; {new Date().getFullYear()} Aster E-Commerce Platform · All rights reserved.
        </span>
        <span>Cash on Delivery only · Backend-verified inventory</span>
      </div>
    </footer>
  );
};

export default Footer;
