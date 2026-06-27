export type PageResponse<T> = {
  records: T[];
  total: number;
  pageNo: number;
  pageSize: number;
  totalPages: number;
};

export type ApiError = {
  code?: string;
  message?: string;
  errorMessage?: string;
};

export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = localStorage.getItem('genealogy.apiBase') || '/api/v1';
    this.token = localStorage.getItem('genealogy.token') || '';
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = (baseUrl || '/api/v1').replace(/\/$/, '');
    localStorage.setItem('genealogy.apiBase', this.baseUrl);
  }

  getToken() {
    return this.token;
  }

  setToken(token: string) {
    this.token = token || '';
    localStorage.setItem('genealogy.token', this.token);
  }

  clearToken() {
    this.setToken('');
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload<T = unknown>(path: string, formData: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: formData });
  }

  async download(path: string): Promise<Blob> {
    const res = await fetch(this.resolve(path), { headers: this.authHeaders() });
    if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}`);
    return res.blob();
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers || undefined);
    const auth = this.authHeaders();
    Object.entries(auth).forEach(([key, value]) => headers.set(key, value));
    const res = await fetch(this.resolve(path), { ...init, headers });
    const type = res.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok || payload?.success === false) {
      const err = payload as ApiError;
      throw new Error(err.errorMessage || err.message || err.code || `HTTP ${res.status}`);
    }
    return payload?.data ?? payload;
  }

  private resolve(path: string) {
    return `${this.baseUrl}${path}`;
  }

  private authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}

export const apiClient = new ApiClient();
