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

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, code: string | undefined, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

const pendingGetRequests = new Map<string, Promise<unknown>>();

export function normalizeApiBaseUrl(value: string | null | undefined) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '/api/v1';
  const withoutTrailingSlash = trimmed.replace(/\/$/, '');
  if (/^https?:\/\//i.test(withoutTrailingSlash)) return withoutTrailingSlash;
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function errorTextCandidate(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  return '';
}

function extractApiErrorMessage(payload: unknown, status: number) {
  if (typeof payload === 'string') {
    return normalizeApiErrorMessage(payload.trim()) || `HTTP ${status}`;
  }
  const record = asRecord(payload);
  if (record) {
    const nestedError = asRecord(record.error);
    const candidates = [
      record.errorMessage,
      record.message,
      nestedError?.errorMessage,
      nestedError?.message,
      record.detail,
      nestedError?.detail,
      record.code,
      nestedError?.code,
      record.data
    ];
    for (const item of candidates) {
      const normalized = normalizeApiErrorMessage(errorTextCandidate(item));
      if (normalized) return normalized;
    }
  }
  return `HTTP ${status}`;
}

function extractApiErrorCode(payload: unknown) {
  const record = asRecord(payload);
  if (!record) return undefined;
  const nestedError = asRecord(record.error);
  const code = errorTextCandidate(record.code) || errorTextCandidate(nestedError?.code);
  return code || undefined;
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

function isErrorLikeMessage(message: string) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('already exists')
    || lower.includes('duplicated')
    || lower.includes('duplicate')
    || lower.includes('not found')
    || lower.includes('required')
    || lower.includes('unsupported')
    || lower.includes('conflict')
    || lower.includes('mismatch')
    || lower.includes('forbidden')
    || lower.includes('unauthorized')
    || lower.includes('failed')
    || lower.includes('error')
    || lower.includes('exception')
    || lower.includes('不存在')
    || lower.includes('已存在')
    || lower.includes('重复')
    || lower.includes('不能为空')
    || lower.includes('无权限')
    || lower.includes('失败');
}

function hasImplicitErrorPayload(payload: unknown) {
  if (typeof payload === 'string') {
    return isErrorLikeMessage(payload.trim());
  }
  const record = asRecord(payload);
  if (!record) return false;
  const nestedError = asRecord(record.error);
  const code = (errorTextCandidate(record.code) || errorTextCandidate(nestedError?.code)).toUpperCase();
  if (code && code !== 'SUCCESS' && /ERROR|DUPLICATED|DUPLICATE|CONFLICT|REQUIRED|UNSUPPORTED|NOT_FOUND|MISMATCH|FORBIDDEN|FAILED|INVALID/.test(code)) {
    return true;
  }
  return [
    record.errorMessage,
    record.message,
    nestedError?.errorMessage,
    nestedError?.message,
    record.detail,
    nestedError?.detail,
    record.data
  ].some(item => isErrorLikeMessage(errorTextCandidate(item)));
}

export class ApiClient {
  private baseUrl: string;
  private token: string;
  private csrfToken: string;

  constructor() {
    this.baseUrl = normalizeApiBaseUrl(localStorage.getItem('genealogy.apiBase'));
    // Compatibility window: consume a historical Bearer token once, then remove
    // it from persistent browser storage. New sessions use secure cookies.
    this.token = localStorage.getItem('genealogy.token') || '';
    localStorage.removeItem('genealogy.token');
    this.csrfToken = this.readCookie('GENEALOGY_CSRF');
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = normalizeApiBaseUrl(baseUrl);
    localStorage.setItem('genealogy.apiBase', this.baseUrl);
    this.clearPendingGetRequests();
  }

  getToken() {
    return this.token;
  }

  setToken(token: string) {
    this.token = token || '';
    localStorage.removeItem('genealogy.token');
    this.clearPendingGetRequests();
  }

  setCsrfToken(token: string) {
    this.csrfToken = token || this.readCookie('GENEALOGY_CSRF');
  }

  clearToken() {
    this.token = '';
    this.csrfToken = '';
    localStorage.removeItem('genealogy.token');
    this.clearPendingGetRequests();
  }

  async get<T = unknown>(path: string): Promise<T> {
    const key = this.pendingGetKey(path);
    const pending = pendingGetRequests.get(key);
    if (pending) return pending as Promise<T>;

    const request = this.request<T>(path, { method: 'GET' })
      .finally(() => pendingGetRequests.delete(key));
    pendingGetRequests.set(key, request as Promise<unknown>);
    return request;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const normalizedBody = normalizeJsonBody(path, body);
    if (shouldBlockDraftPersonAutoReview(path, normalizedBody)) {
      throw new Error('保存草稿继续录入不会自动提交人物审核');
    }
    try {
      return await this.request<T>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
      });
    } catch (error) {
      if (this.shouldConfirmDuplicatePerson(path, normalizedBody, error)) {
        const ok = window.confirm('发现疑似重复人物。确认仍要创建这条人物记录吗？');
        if (ok) {
          return this.request<T>(path, {
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
    const normalizedBody = normalizeJsonBody(path, body);
    return this.request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
    });
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const normalizedBody = normalizeJsonBody(path, body);
    return this.request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload<T = unknown>(path: string, formData: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: formData });
  }

  async download(path: string): Promise<Blob> {
    const headers = new Headers(this.authHeaders());
    const res = await fetch(this.resolve(path), { headers, credentials: 'include' });
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
    const method = String(init.method || 'GET').toUpperCase();
    const csrfToken = this.csrfToken || this.readCookie('GENEALOGY_CSRF');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    const res = await fetch(this.resolve(path), { ...init, headers, credentials: 'include' });
    const type = res.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await res.json() : await res.text();
    const explicitFailure = payload && typeof payload === 'object' && (payload as Record<string, unknown>).success === false;
    const implicitFailure = res.ok && hasImplicitErrorPayload(payload);
    if (!res.ok || explicitFailure || implicitFailure) {
      if (res.status === 401 && !path.endsWith('/auth/login')) {
        window.dispatchEvent(new Event('genealogy:unauthorized'));
      }
      throw new ApiRequestError(
        extractApiErrorMessage(payload, res.status),
        extractApiErrorCode(payload),
        res.status
      );
    }
    if (payload && typeof payload === 'object') {
      const data = (payload as Record<string, any>).data;
      if (data?.csrfToken) this.setCsrfToken(String(data.csrfToken));
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
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private readCookie(name: string) {
    if (typeof document === 'undefined') return '';
    const prefix = `${encodeURIComponent(name)}=`;
    return document.cookie
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith(prefix))
      ?.slice(prefix.length) || '';
  }
}

export const apiClient = new ApiClient();
