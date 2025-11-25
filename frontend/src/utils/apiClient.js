/**
 * Enhanced API client with retry logic and error handling
 */
import axios from 'axios';
import { extractError, handleErrorWithRetry, isRetryableError } from './errorHandler';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
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

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      
      return Promise.reject(error);
    }
    
    // Retry logic for retryable errors
    if (isRetryableError(error) && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = originalRequest._retryCount || 0;
      
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++;
        const delay = Math.pow(2, originalRequest._retryCount) * 1000; // Exponential backoff
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return apiClient(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Enhanced fetch wrapper with error handling
 */
export async function apiRequest(config) {
  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    const errorInfo = extractError(error);
    throw errorInfo;
  }
}

/**
 * GET request
 */
export async function apiGet(url, config = {}) {
  return apiRequest({
    method: 'GET',
    url,
    ...config
  });
}

/**
 * POST request
 */
export async function apiPost(url, data, config = {}) {
  return apiRequest({
    method: 'POST',
    url,
    data,
    ...config
  });
}

/**
 * PUT request
 */
export async function apiPut(url, data, config = {}) {
  return apiRequest({
    method: 'PUT',
    url,
    data,
    ...config
  });
}

/**
 * DELETE request
 */
export async function apiDelete(url, config = {}) {
  return apiRequest({
    method: 'DELETE',
    url,
    ...config
  });
}

/**
 * Upload file with progress tracking
 */
export async function apiUpload(url, file, onProgress, config = {}) {
  const formData = new FormData();
  formData.append('photo', file);
  
  return apiRequest({
    method: 'POST',
    url,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
    ...config
  });
}

export default apiClient;

