import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * useProductRealtime
 *
 * Reusable React hook for subscribing to real-time changes on the `products` table
 * via the configured Supabase client.
 *
 * Features:
 * - Subscribes to INSERT, UPDATE, DELETE events on public.products.
 * - Optional `productId` filter to only listen to a specific product (e.g. ProductDetailPage).
 * - Uses callback refs to avoid recreating the WebSocket channel when parent components re-render.
 * - Graceful cleanup via `supabase.removeChannel()` on unmount.
 * - Handles connection status callbacks (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT).
 *
 * @param {Object} options
 * @param {string|number} [options.productId] - Specific product ID to filter on
 * @param {Function} [options.onInsert] - Callback when a product is inserted
 * @param {Function} [options.onUpdate] - Callback when a product is updated ({ newProduct, oldProduct, payload })
 * @param {Function} [options.onDelete] - Callback when a product is deleted ({ oldProduct, payload })
 * @param {Function} [options.onChange] - Generic callback on any product change (receives full payload)
 * @param {boolean} [options.enabled=true] - Whether the subscription should be active
 */
export const useProductRealtime = ({
  productId,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
} = {}) => {
  // Store callbacks in refs to keep channel stable across renders
  const callbacksRef = useRef({});
  callbacksRef.current = { onInsert, onUpdate, onDelete, onChange };

  useEffect(() => {
    if (!enabled) return;

    // Unique channel identifier
    const channelId = `realtime-products-${productId || 'all'}-${Math.random().toString(36).slice(2, 7)}`;

    const filterConfig = {
      event: '*',
      schema: 'public',
      table: 'products',
    };

    if (productId) {
      filterConfig.filter = `id=eq.${productId}`;
    }

    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', filterConfig, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const cb = callbacksRef.current;

        // Trigger generic change handler if provided
        if (cb.onChange) {
          try {
            cb.onChange(payload);
          } catch (err) {
            console.error('[Realtime] Error in onChange handler:', err);
          }
        }

        // Trigger event-specific handlers
        if (eventType === 'INSERT' && cb.onInsert) {
          try {
            cb.onInsert(newRecord, payload);
          } catch (err) {
            console.error('[Realtime] Error in onInsert handler:', err);
          }
        } else if (eventType === 'UPDATE' && cb.onUpdate) {
          try {
            cb.onUpdate(newRecord, oldRecord, payload);
          } catch (err) {
            console.error('[Realtime] Error in onUpdate handler:', err);
          }
        } else if (eventType === 'DELETE' && cb.onDelete) {
          try {
            cb.onDelete(oldRecord, payload);
          } catch (err) {
            console.error('[Realtime] Error in onDelete handler:', err);
          }
        }
      })
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          // Connected successfully
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Channel error for products subscription:', error?.message || error);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Connection timed out on products subscription.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, enabled]);
};

export default useProductRealtime;
