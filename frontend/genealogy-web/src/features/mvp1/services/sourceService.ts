import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';

export type SourceLike = {
  id?: number | string;
  sourceName?: string;
  name?: string;
  sourceType?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type CreateSourcePayload = {
  sourceName: string;
  sourceType: string;
  description?: string | null;
};

export type BindSourcePayload = {
  sourceId: number;
  targetType: string;
  targetId: number;
};

export type SourceLinkLike = {
  id?: number | string;
  clanId?: number | string;
  sourceId?: number | string;
  targetType?: string;
  targetId?: number | string;
  bindingReason?: string;
  excerpt?: string;
  createdBy?: number | string;
  createdAt?: string;
};

export async function loadSources(clanId?: number | string): Promise<SourceLike[]> {
  if (!clanId) return [];
  const data = await apiClient.get(`/clans/${clanId}/sources`);
  return toRows<SourceLike>(data);
}

export async function loadSourceLinks(sourceId?: number | string): Promise<SourceLinkLike[]> {
  if (!sourceId) return [];
  const data = await apiClient.get(`/source-bindings/sources/${sourceId}`);
  return toRows<SourceLinkLike>(data);
}

export async function createSourceApi(clanId: number | string, payload: CreateSourcePayload): Promise<SourceLike> {
  return apiClient.post(`/clans/${clanId}/sources`, payload);
}

export async function bindSourceApi(clanId: number | string, payload: BindSourcePayload): Promise<SourceLinkLike> {
  return apiClient.post(`/clans/${clanId}/source-bindings`, payload);
}
