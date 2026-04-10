import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken') || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 & token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = data.data;

        Cookies.set('accessToken', accessToken, { expires: 1 });
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Clear auth and redirect to login
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  changePassword: (data: any) => apiClient.post('/auth/change-password', data),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => apiClient.post('/auth/reset-password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Products API ─────────────────────────────────────────────────────────────
export const productsApi = {
  getAll: (params?: any) => apiClient.get('/products', { params }),
  getFeatured: (count = 8) => apiClient.get('/products/featured', { params: { count } }),
  getBySlug: (slug: string) => apiClient.get(`/products/${slug}`),
  getById: (id: number) => apiClient.get(`/products/id/${id}`),
  getRelated: (id: number, count = 4) => apiClient.get(`/products/${id}/related`, { params: { count } }),
  create: (data: any) => apiClient.post('/products', data),
  update: (id: number, data: any) => apiClient.put(`/products/${id}`, data),
  delete: (id: number) => apiClient.delete(`/products/${id}`),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Categories API ───────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll: (includeChildren = true) => apiClient.get('/categories', { params: { includeChildren } }),
  getById: (id: number) => apiClient.get(`/categories/${id}`),
  create: (data: any) => apiClient.post('/categories', data),
  update: (id: number, data: any) => apiClient.put(`/categories/${id}`, data),
  delete: (id: number) => apiClient.delete(`/categories/${id}`),
};

// ─── Cart API ─────────────────────────────────────────────────────────────────
export const cartApi = {
  get: () => apiClient.get('/cart'),
  getCart: () => apiClient.get('/cart'),
  getCount: () => apiClient.get('/cart/count'),
  addItem: (productId: number, variantId?: number, quantity = 1) =>
    apiClient.post('/cart/add', { productId, variantId, quantity }),
  updateItem: (cartItemId: number, quantity: number) =>
    apiClient.put(`/cart/${cartItemId}`, { quantity }),
  updateQuantity: (cartItemId: number, quantity: number) =>
    apiClient.put(`/cart/${cartItemId}`, { quantity }),
  removeItem: (cartItemId: number) => apiClient.delete(`/cart/${cartItemId}`),
  clear: () => apiClient.delete('/cart'),
  clearCart: () => apiClient.delete('/cart'),
  applyCoupon: (code: string, orderAmount: number) =>
    apiClient.post('/orders/validate-coupon', { code, orderAmount }),
};

// ─── Orders API ───────────────────────────────────────────────────────────────
export const ordersApi = {
  getMyOrders: (params?: any) => apiClient.get('/orders/my', { params }),
  getMyOrderDetail: (id: number) => apiClient.get(`/orders/my/${id}`),
  getAll: (params?: any) => apiClient.get('/orders', { params }),
  getAllOrders: (params?: any) => apiClient.get('/orders', { params }),
  getById: (id: number) => apiClient.get(`/orders/${id}`),
  getOrderDetail: (id: number) => apiClient.get(`/orders/${id}`),
  create: (data: any) => apiClient.post('/orders', data),
  createOrder: (data: any) => apiClient.post('/orders', data),
  updateStatus: (id: number, data: any) => apiClient.put(`/orders/${id}/status`, data),
  cancel: (id: number, reason?: string) =>
    apiClient.post(`/orders/my/${id}/cancel`, { reason }),
  cancelOrder: (id: number, reason?: string) =>
    apiClient.post(`/orders/my/${id}/cancel`, { reason }),
  validateCoupon: (code: string, orderAmount: number) =>
    apiClient.post('/orders/validate-coupon', { code, orderAmount }),
  getDashboardStats: () => apiClient.get('/orders/dashboard-stats'),
};

// ─── Reviews API ──────────────────────────────────────────────────────────────
export const reviewsApi = {
  getProductReviews: (productId: number, params?: any) =>
    apiClient.get(`/reviews/product/${productId}`, { params }),
  createReview: (data: any) => apiClient.post('/reviews', data),
  deleteReview: (id: number) => apiClient.delete(`/reviews/${id}`),
};

// ─── Addresses API ────────────────────────────────────────────────────────────
export const addressesApi = {
  getAll: () => apiClient.get('/addresses'),
  create: (data: any) => apiClient.post('/addresses', data),
  update: (id: number, data: any) => apiClient.put(`/addresses/${id}`, data),
  setDefault: (id: number) => apiClient.put(`/addresses/${id}/set-default`),
  delete: (id: number) => apiClient.delete(`/addresses/${id}`),
};

// ─── Users API (Admin) ────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (params?: any) => apiClient.get('/users', { params }),
  getById: (id: number) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post('/users', data),
  updateRole: (id: number, role: string) => apiClient.put(`/users/${id}/role`, { role }),
  toggleActive: (id: number) => apiClient.put(`/users/${id}/toggle-active`),
  toggleStatus: (id: number) => apiClient.put(`/users/${id}/toggle-active`),
};

// ─── Banners API ──────────────────────────────────────────────────────────────
export const bannersApi = {
  getAll: () => apiClient.get('/banners'),
};
