import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setCartCount(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/cart');
      const cartData = response.data;
      const cartItemsList = cartData.items || cartData.cartItems || [];
      setCart(cartData);

      const count = cartData.itemCount ?? (cartItemsList.length > 0
        ? cartItemsList.reduce((acc, item) => acc + item.quantity, 0)
        : 0);
      setCartCount(count);
    } catch (err) {
      console.warn('Cart fetch note:', err.message);
      setError(err.response?.data?.message || 'Failed to load shopping cart');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      throw new Error('Please log in to add items to your cart');
    }

    setError(null);
    try {
      const response = await apiClient.post('/api/cart/items', {
        productId,
        quantity,
      });
      await fetchCart();
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add product to cart';
      setError(msg);
      throw new Error(msg);
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    setError(null);
    try {
      const response = await apiClient.put(`/api/cart/items/${cartItemId}`, {
        quantity,
      });
      await fetchCart();
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update item quantity';
      setError(msg);
      throw new Error(msg);
    }
  };

  const removeFromCart = async (cartItemId) => {
    setError(null);
    try {
      await apiClient.delete(`/api/cart/items/${cartItemId}`);
      await fetchCart();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove item from cart';
      setError(msg);
      throw new Error(msg);
    }
  };

  const clearCartState = () => {
    setCart(null);
    setCartCount(0);
  };

  const value = {
    cart,
    cartCount,
    loading,
    error,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCartState,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
