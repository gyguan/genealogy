import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';
import type { RelationshipCreatePayload, RelationshipLike as DomainRelationshipLike } from '../domain/relationship';

export type RelationshipLike = DomainRelationshipLike & {
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

export async function deleteRelationshipApi(relationshipId: number | string): Promise<void> {
  await apiClient.delete(`/relationships/${relationshipId}`);
}
