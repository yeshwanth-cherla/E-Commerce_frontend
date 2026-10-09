import axios from 'axios';
import { supabase } from './supabaseClient';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Supabase JWT Bearer token to all outgoing requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.warn('Error attaching Supabase Auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        console.warn('Unauthorized request — user session may be invalid or expired.');
      } else if (status === 403) {
        console.warn('Forbidden — user does not have permission to access this resource.');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
