import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';

export type PersonLike = {
  id?: number | string;
  name?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  branchId?: number | string;
};

export type CreatePersonPayload = Record<string, unknown>;

export async function loadPersons(clanId?: number | string): Promise<PersonLike[]> {
  if (!clanId) return [];
  const data = await apiClient.get(`/clans/${clanId}/persons`);
  return toRows<PersonLike>(data);
}

export async function createPersonApi(clanId: number | string, payload: CreatePersonPayload): Promise<PersonLike> {
  return apiClient.post(`/clans/${clanId}/persons`, payload);
}
