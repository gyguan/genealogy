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

function normalizeReviewTargetType(value: unknown) {
  const text = String(value ?? '').trim();
  const map: Record<string, string> = {
    persons: 'person',
    person: 'person',
    relationships: 'relationship',
    relationship: 'relationship',
    sources: 'source',
    source: 'source',
    branches: 'branch',
    branch: 'branch',
    'generation-schemes': 'generation_scheme',
    generation_schemes: 'generation_scheme',
    generation_scheme: 'generation_scheme'
  };
  return map[text] || text;
}

function draftSaveGuardActive() {
  return Number((window as any).__genealogyDraftSaveGuardUntil || 0) > Date.now();
}

function shouldBlockDraftPersonAutoReview(path: string, body: unknown) {
  if (!draftSaveGuardActive()) return false;
  if (!/^\/clans\/\d+\/review-tasks$/.test(path)) return false;
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return normalizeReviewTargetType(record.targetType) === 'person' && String(record.comment || '').includes('提交人物审核');
}

function normalizeJsonBody(path: string, body: unknown) {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  const next = { ...(body as Record<string, unknown>) };
  if (/^\/clans\/\d+\/persons$/.test(path)) {
    if (next.personCode === null) delete next.personCode;
    next.dataStatus = 'draft';
  }
  if (/^\/clans\/\d+\/review-tasks$/.test(path) && next.targetType !== undefined) {
    next.targetType = normalizeReviewTargetType(next.targetType);
  }
  return next;
}

function extractApiErrorMessage(payload: unknown, status: number) {
  if (typeof payload === 'string') {
    return normalizeApiErrorMessage(payload.trim()) || `HTTP ${status}`;
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidates = [
      record.errorMessage,
      record.message,
      record.error,
      record.detail,
      record.code
    ];
    for (const item of candidates) {
      const normalized = normalizeApiErrorMessage(String(item ?? '').trim());
      if (normalized) return normalized;
    }
  }
  return `HTTP ${status}`;
}

function normalizeApiErrorMessage(message: string) {
  if (!message) return '';
  const lower = message.toLowerCase();
  if (lower.includes('same relationship already exists') || lower.includes('relationship_duplicated')) {
    return '该关系已存在，请勿重复创建';
  }
  if (lower.includes('spouse relationship already exists') || lower.includes('relationship_spouse_duplicated')) {
    return '配偶关系已存在，请勿重复创建';
  }
  if (lower.includes('biological parent relationship already exists') || lower.includes('relationship_parent_duplicated')) {
    return '父母关系已存在，请勿重复创建';
  }
  return message;
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
    const normalizedBody = normalizeJsonBody(normalizedPath, body);
    if (shouldBlockDraftPersonAutoReview(normalizedPath, normalizedBody)) {
      throw new Error('保存草稿继续录入不会自动提交人物审核');
    }
    try {
      return await this.request<T>(normalizedPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
      });
    } catch (error) {
      if (this.shouldConfirmDuplicatePerson(normalizedPath, normalizedBody, error)) {
        const ok = window.confirm('发现疑似重复人物。确认仍要创建这条人物记录吗？');
        if (ok) {
          return this.request<T>(normalizedPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...(normalizedBody as Record<string, unknown>), confirmDuplicate: true })
          });
        }
      }
      throw error;
    }
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const normalizedPath = normalizeApiPath(path);
    const normalizedBody = normalizeJsonBody(normalizedPath, body);
    return this.request<T>(normalizedPath, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
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
    if (!res.ok || (payload && typeof payload === 'object' && (payload as Record<string, unknown>).success === false)) {
      throw new Error(extractApiErrorMessage(payload, res.status));
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