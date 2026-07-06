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

const pendingGetRequests = new Map<string, Promise<unknown>>();

function normalizeApiPath(path: string) {
  // P0-1: source binding contract is /source-bindings.
  // Keep frontend callers safe while legacy /source-links references are removed gradually.
  return path.replace(/\/clans\/(\d+)\/source-links\b/g, '/clans/$1/source-bindings');
}

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
    this.clearPendingGetRequests();
  }

  getToken() {
    return this.token;
  }

  setToken(token: string) {
    this.token = token || '';
    localStorage.setItem('genealogy.token', this.token);
    this.clearPendingGetRequests();
  }

  clearToken() {
    this.setToken('');
  }

  async get<T = unknown>(path: string): Promise<T> {
    const normalizedPath = normalizeApiPath(path);
    const key = this.pendingGetKey(normalizedPath);
    const pending = pendingGetRequests.get(key);
    if (pending) return pending as Promise<T>;

    const request = this.request<T>(normalizedPath, { method: 'GET' })
      .finally(() => pendingGetRequests.delete(key));
    pendingGetRequests.set(key, request as Promise<unknown>);
    return request;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const normalizedPath = normalizeApiPath(path);
    try {
      return await this.request<T>(normalizedPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      if (this.shouldConfirmDuplicatePerson(normalizedPath, body, error)) {
        const ok = window.confirm('发现疑似重复人物。确认仍要创建这条人物记录吗？');
        if (ok) {
          return this.request<T>(normalizedPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...(body as Record<string, unknown>), confirmDuplicate: true })
          });
        }
      }
      throw error;
    }
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(normalizeApiPath(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(normalizeApiPath(path), { method: 'DELETE' });
  }

  async upload<T = unknown>(path: string, formData: FormData): Promise<T> {
    return this.request<T>(normalizeApiPath(path), { method: 'POST', body: formData });
  }

  async download(path: string): Promise<Blob> {
    const res = await fetch(this.resolve(normalizeApiPath(path)), { headers: this.authHeaders() });
    if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}`);
    return res.blob();
  }

  private shouldConfirmDuplicatePerson(path: string, body: unknown, error: unknown) {
    if (!/^\/clans\/\d+\/persons$/.test(path)) return false;
    if (!body || typeof body !== 'object') return false;
    if ((body as Record<string, unknown>).confirmDuplicate === true) return false;
    const message = (error as Error)?.message || '';
    return message.includes('疑似重复') || message.includes('PERSON_DUPLICATE_CONFIRM_REQUIRED');
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

  private clearPendingGetRequests() {
    pendingGetRequests.clear();
  }

  private pendingGetKey(path: string) {
    return `${this.baseUrl}|${path}|${this.token}`;
  }

  private resolve(path: string) {
    return `${this.baseUrl}${normalizeApiPath(path)}`;
  }

  private authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
}

export const apiClient = new ApiClient();