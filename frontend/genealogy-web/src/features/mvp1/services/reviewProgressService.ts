import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';
import { isOfficial } from '../domain/status';

export type ReviewProgressBranchLike = {
  id?: number | string;
  branchName?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type ReviewProgressGenerationSchemeLike = {
  id?: number | string;
  schemeName?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type ReviewProgressPersonLike = {
  id?: number | string;
  name?: string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type ReviewProgressRelationshipLike = {
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
  verificationStatus?: string;
};

export type ReviewProgressSourceLike = {
  id?: number | string;
  sourceName?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

export type ReviewProgressTaskLike = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
  status?: string;
  reviewStatus?: string;
  taskStatus?: string;
  createdAt?: string;
};

export type ReviewProgressData = {
  branches: ReviewProgressBranchLike[];
  schemes: ReviewProgressGenerationSchemeLike[];
  persons: ReviewProgressPersonLike[];
  relationships: ReviewProgressRelationshipLike[];
  sources: ReviewProgressSourceLike[];
  tasks: ReviewProgressTaskLike[];
};

function emptyReviewProgressData(): ReviewProgressData {
  return {
    branches: [],
    schemes: [],
    persons: [],
    relationships: [],
    sources: [],
    tasks: []
  };
}

export async function loadReviewData(clanId: string | number, personId?: string | number | null): Promise<ReviewProgressData> {
  if (!clanId) return emptyReviewProgressData();

  const [branchData, personData, sourceData, schemeData, taskData] = await Promise.all([
    apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
    apiClient.get(`/clans/${clanId}/persons`).catch(() => []),
    apiClient.get(`/clans/${clanId}/sources`).catch(() => []),
    apiClient.get(`/clans/${clanId}/generation-schemes`).catch(() => []),
    apiClient.get(`/clans/${clanId}/review-tasks/pending`).catch(() => [])
  ]);

  const persons = toRows<ReviewProgressPersonLike>(personData);
  const relationPersonId = personId || persons.filter(isOfficial)[0]?.id;
  const relationshipData = relationPersonId
    ? await apiClient.get(`/persons/${relationPersonId}/relationships`).catch(() => [])
    : [];

  return {
    branches: toRows<ReviewProgressBranchLike>(branchData),
    persons,
    sources: toRows<ReviewProgressSourceLike>(sourceData),
    schemes: toRows<ReviewProgressGenerationSchemeLike>(schemeData),
    tasks: toRows<ReviewProgressTaskLike>(taskData),
    relationships: toRows<ReviewProgressRelationshipLike>(relationshipData)
  };
}
