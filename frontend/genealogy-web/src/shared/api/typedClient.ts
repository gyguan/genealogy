import { apiClient } from './client';
import { API_OPERATIONS, type ApiOperation, type ApiPathParams, type ApiQueryParams } from './generated/api-contract';

type TypedRequestOptions<K extends ApiOperation> = {
  pathParams?: ApiPathParams<K> extends never ? undefined : ApiPathParams<K>;
  query?: ApiQueryParams<K> extends never ? undefined : ApiQueryParams<K>;
  body?: unknown;
  formData?: FormData;
};

function toClientPath(path: string) {
  return path.replace(/^\/api\/v1/, '') || '/';
}

function applyPathParams<K extends ApiOperation>(path: string, pathParams: TypedRequestOptions<K>['pathParams']) {
  if (!pathParams) return path;
  return Object.entries(pathParams as Record<string, string | number>).reduce((next, [key, value]) => {
    return next.replace(`{${key}}`, encodeURIComponent(String(value)));
  }, path);
}

function applyQuery<K extends ApiOperation>(path: string, query: TypedRequestOptions<K>['query']) {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query as Record<string, string | number | boolean | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export async function typedApiRequest<TResponse, K extends ApiOperation>(
  operation: K,
  options: TypedRequestOptions<K> = {}
): Promise<TResponse> {
  const meta = API_OPERATIONS[operation];
  const pathWithParams = applyPathParams(toClientPath(meta.path), options.pathParams);
  const path = applyQuery(pathWithParams, options.query);
  const method = String(meta.method);

  if (method === 'GET') {
    return apiClient.get<TResponse>(path);
  }
  if (method === 'POST') {
    if (options.formData) {
      return apiClient.upload<TResponse>(path, options.formData);
    }
    return apiClient.post<TResponse>(path, options.body);
  }
  if (method === 'PUT') {
    return apiClient.put<TResponse>(path, options.body);
  }
  if (method === 'PATCH') {
    return apiClient.patch<TResponse>(path, options.body);
  }
  if (method === 'DELETE') {
    return apiClient.delete<TResponse>(path);
  }
  throw new Error(`Unsupported API method: ${method}`);
}
