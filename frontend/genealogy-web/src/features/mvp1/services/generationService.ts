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
  allowedActions?: string[];
};

export type GenerationItemLike = {
  id?: number | string;
  generationNo?: number | string;
  word?: string;
};

export type CreateGenerationSchemePayload = {
  branchId?: number | null;
  schemeName: string;
  isDefault?: boolean;
  validationEnabled?: boolean;
  strictMode?: boolean;
};

export type CreateGenerationItemPayload = {
  generationNo: number;
  word: string;
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

export async function createGenerationSchemeApi(clanId: number | string, payload: CreateGenerationSchemePayload): Promise<GenerationSchemeLike> {
  return apiClient.post(`/clans/${clanId}/generation-schemes`, payload);
}

export async function createGenerationItemApi(schemeId: number | string, payload: CreateGenerationItemPayload): Promise<GenerationItemLike> {
  return apiClient.post(`/generation-schemes/${schemeId}/items`, payload);
}

export async function deleteGenerationSchemeApi(schemeId: number | string): Promise<void> {
  await apiClient.delete(`/generation-schemes/${schemeId}`);
}
