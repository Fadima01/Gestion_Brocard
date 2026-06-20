import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1', // Proxied to http://localhost:8000/api/v1
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injecter le token JWT s'il est présent dans le localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepter les erreurs 401 pour déconnecter automatiquement
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
