import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Attach JWT to every request if the user is logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aqi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let socket = null;

/**
 * Returns a singleton Socket.IO client connected to the backend.
 * Reconnection is handled automatically by socket.io-client.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: Infinity,
    });
  }
  return socket;
}

// ---- REST helpers ----

export const AirQualityAPI = {
  getCurrentAll: () => api.get('/air-quality/current').then((r) => r.data),
  getAvailableCities: () => api.get('/air-quality/available-cities').then((r) => r.data),
  lookupLocation: (q) => api.get('/air-quality/lookup', { params: { q } }).then((r) => r.data),
  getCurrentByCity: (city) => api.get(`/air-quality/${encodeURIComponent(city)}`).then((r) => r.data),
  getHistory: (stationId, range = '24h') =>
    api.get(`/history/${encodeURIComponent(stationId)}`, { params: { range } }).then((r) => r.data),
};

export const StationAPI = {
  list: () => api.get('/stations').then((r) => r.data),
  get: (id) => api.get(`/stations/${encodeURIComponent(id)}`).then((r) => r.data),
  health: () => api.get('/admin/health').then((r) => r.data),
};

export const AlertAPI = {
  list: (params) => api.get('/alerts', { params }).then((r) => r.data),
  get: (id) => api.get(`/alerts/${encodeURIComponent(id)}`).then((r) => r.data),
  acknowledge: (id) => api.patch(`/alerts/${encodeURIComponent(id)}/ack`).then((r) => r.data),
};

export const AuthAPI = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
};
