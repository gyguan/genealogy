import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';
import type { RelationshipCreatePayload } from '../domain/relationship';

export type RelationshipLike = {
  id?: number | string;
  fromPersonId?: number | string;
  fromPersonName?: string;
  fromName?: string;
  toPersonId?: number | string;
  toPersonName?: string;
  toName?: string;
  relationType?: string;
  relationLabel?: string;
  dataStatus?: string;
  status?: string;
};

export type CreateRelationshipPayload = RelationshipCreatePayload;

export async function loadRelationships(personId?: number | string): Promise<RelationshipLike[]> {
  if (!personId) return [];
  const data = await apiClient.get(`/persons/${personId}/relationships`);
  return toRows<RelationshipLike>(data);
}

export async function createRelationshipApi(clanId: number | string, payload: CreateRelationshipPayload): Promise<RelationshipLike> {
  return apiClient.post(`/clans/${clanId}/relationships`, payload);
}
