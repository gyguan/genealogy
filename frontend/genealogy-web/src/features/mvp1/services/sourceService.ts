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

export async function loadSources(clanId?: number | string): Promise<SourceLike[]> {
  if (!clanId) return [];
  const data = await apiClient.get(`/clans/${clanId}/sources`);
  return toRows<SourceLike>(data);
}
