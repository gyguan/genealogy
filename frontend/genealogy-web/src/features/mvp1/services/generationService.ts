import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';

export type GenerationSchemeLike = {
  id?: number | string;
  branchId?: number | string;
  branchName?: string;
  schemeName?: string;
  name?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type GenerationItemLike = {
  id?: number | string;
  generationNo?: number | string;
  word?: string;
};

export async function loadGenerationSchemes(clanId?: number | string): Promise<GenerationSchemeLike[]> {
  if (!clanId) return [];
  const data = await apiClient.get(`/clans/${clanId}/generation-schemes`);
  return toRows<GenerationSchemeLike>(data);
}

export async function loadGenerationItems(schemeId?: number | string): Promise<GenerationItemLike[]> {
  if (!schemeId) return [];
  const data = await apiClient.get(`/generation-schemes/${schemeId}/items`);
  return toRows<GenerationItemLike>(data);
}
