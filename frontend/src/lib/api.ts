/**
 * Frontend API Client with JWT Authorization & Centralized Error Handling
 */

/**
 * Resolves the API base URL dynamically.
 * - In browser: uses relative '/api' (routed to backend via Vercel rewrites) or NEXT_PUBLIC_API_URL.
 * - In server functions/SSR: uses Vercel service binding BACKEND_URL (process.env.BACKEND_URL)
 *   with fallback to NEXT_PUBLIC_API_URL or local backend port.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '/api';
  }
  if (process.env.BACKEND_URL) {
    try {
      return new URL('/api', process.env.BACKEND_URL).toString().replace(/\/$/, '');
    } catch {
      return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:48291/api';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('titan_token');
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('titan_token', token);
  }
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('titan_token');
    localStorage.removeItem('titan_user');
  }
}

export function getSavedUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('titan_user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedUser(user: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('titan_user', JSON.stringify(user));
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${getApiBase()}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }

    return data as T;
  } catch (err: any) {
    if (err.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      removeToken();
      window.location.href = '/login?expired=1';
    }
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request('/auth/me'),
  },

  // Products
  products: {
    getAll: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/products${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request(`/products/${id}`),
    create: (data: any) =>
      request('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivate: (id: string) =>
      request(`/products/${id}`, {
        method: 'DELETE',
      }),
    toggleStatus: (id: string) =>
      request(`/products/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    getCategoriesAndKinds: () => request('/products/categories/kinds'),
  },

  // Inventory
  inventory: {
    getLowStock: () => request('/inventory/low-stock'),
    adjust: (data: {
      productId: string;
      type: string;
      quantity: number;
      reason?: string;
      referenceId?: string;
    }) =>
      request('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMovements: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/inventory/movements${qs ? `?${qs}` : ''}`);
    },
  },

  // Sales & POS
  sales: {
    create: (data: {
      items: Array<{ productId: string; quantity: number }>;
      customerName?: string;
      customerPhone?: string;
      discountPercent?: number;
      taxPercent?: number;
      paymentMethod?: string;
      paymentStatus?: string;
      paidAmount?: number;
      dueAmount?: number;
      paymentPercent?: number;
    }) =>
      request('/sales', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getAll: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/sales${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request(`/sales/${id}`),
    returnSale: (
      saleId: string,
      data: {
        items: Array<{ productId: string; quantity: number }>;
        reason?: string;
      }
    ) =>
      request(`/sales/${saleId}/return`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Reports
  reports: {
    getDashboard: () => request('/reports/dashboard'),
    getSales: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/reports/sales${qs ? `?${qs}` : ''}`);
    },
    getProfit: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/reports/profit${qs ? `?${qs}` : ''}`);
    },
    getTopSelling: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/reports/top-selling${qs ? `?${qs}` : ''}`);
    },
    getDownloadCsvUrl: (params: Record<string, any> = {}) => {
      const token = getToken();
      const qs = new URLSearchParams({ ...params, token: token || '' }).toString();
      return `${getApiBase()}/reports/sales/csv?${qs}`;
    },
  },

  // Categories
  categories: {
    getAll: () => request('/categories'),
    create: (data: { name: string; description?: string; kinds?: string[]; commonProducts?: string[] }) =>
      request('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Vendors / Suppliers
  vendors: {
    getAll: () => request('/vendors'),
    create: (data: { name: string; phone?: string; email?: string; address?: string; category?: string }) =>
      request('/vendors', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Customers & CRM
  customers: {
    getAll: (params: Record<string, any> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/customers${qs ? `?${qs}` : ''}`);
    },
    search: (term: string) => {
      const qs = new URLSearchParams({ phone: term, q: term }).toString();
      return request(`/customers/search?${qs}`);
    },
    getById: (id: string) => request(`/customers/${id}`),
    getAnalytics: () => request('/customers/analytics'),
    payDue: (id: string, data: { amount: number; paymentMethod?: string; note?: string }) =>
      request(`/customers/${id}/pay-due`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    create: (data: { name: string; phone: string; email?: string; address?: string; notes?: string }) =>
      request('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};

