// ==============================================================================
// SiliconLabs Enterprise ID Card Platform — Typed Frontend API Client
// ==============================================================================

export interface ApiOptions extends RequestInit {
  params?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  [key: string]: any;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Check if backend API server is online and responding
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`);

    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const isFormData = options.body instanceof FormData;
    if (isFormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
      });

      const json: ApiResponse<T> = await response.json().catch(() => ({
        success: response.ok,
        error: { message: response.statusText, statusCode: response.status },
      }));

      if (!response.ok) {
        throw new Error(json.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return json;
    } catch (err: any) {
      console.warn(`[ApiClient] Request failed: ${options.method || 'GET'} ${url.pathname}`, err.message);
      throw err;
    }
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

