import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';

export const api = axios.create({ baseURL: BASE_URL });

// Despierta el backend (Railway entra en sleep por inactividad).
// Se llama al arrancar la app para que el cold start ocurra antes
// de que el usuario intente cargar datos reales.
export function pingBackend() {
  fetch(`${BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(10000) }).catch(() => {});
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
