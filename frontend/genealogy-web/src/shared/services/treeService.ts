import { apiClient } from '../api/client';

export type RelationshipPayload = {
  fromPersonId: number;
  toPersonId: number;
  relationType: string;
  relationLabel?: string;
  isLineageRelation?: boolean;
  isBiological?: boolean;
  isPrimary?: boolean;
  confidenceLevel?: string;
};

export type LineageClanDto = {
  id?: number | string;
  clanName?: string;
  surname?: string;
};

export type LineageBranchDto = {
  id?: number | string;
  branchName?: string;
  name?: string;
  parentId?: number | string;
};

export type LineagePersonDto = {
  id?: number | string;
  personId?: number | string;
  targetId?: number | string;
  name?: string;
  personName?: string;
  displayName?: string;
  branchId?: number | string;
  branch?: LineageBranchDto;
  branchName?: string;
  gender?: string;
  sex?: string;
  generationNo?: number | string;
  generation?: number | string;
  generationNumber?: number | string;
  generationName?: string;
  generationWord?: string;
  word?: string;
  birthDate?: string;
  birthYear?: string;
  birthDateText?: string;
  deathDate?: string;
  deathYear?: string;
  deathDateText?: string;
  status?: string;
  dataStatus?: string;
  verificationStatus?: string;
  reviewStatus?: string;
  relationLabel?: string;
  relationType?: string;
};

export type LineageRelationshipDto = {
  id?: number | string;
  relationshipId?: number | string;
  fromPersonId?: number | string;
  sourcePersonId?: number | string;
  from?: LineagePersonDto;
  toPersonId?: number | string;
  targetPersonId?: number | string;
  to?: LineagePersonDto;
  relationType?: string;
  relationLabel?: string;
  status?: string;
  dataStatus?: string;
  confidenceLevel?: string;
};

export type LineageTreeDto = {
  nodes?: LineagePersonDto[];
  edges?: LineageRelationshipDto[];
  rootPersonId?: number | string;
  records?: LineagePersonDto[];
  items?: LineagePersonDto[];
  content?: LineagePersonDto[];
};

export const treeService = {
  listClans() {
    return apiClient.get('/clans');
  },

  listBranches(clanId: string) {
    return apiClient.get(`/clans/${clanId}/branches`);
  },

  listPeople(clanId: string) {
    return apiClient.get(`/clans/${clanId}/persons`);
  },

  searchPeople(clanId: string, pageNo = 1, pageSize = 120, keyword = '') {
    const params = new URLSearchParams({ clanId, pageNo: String(pageNo), pageSize: String(pageSize) });
    if (keyword.trim()) params.set('keyword', keyword.trim());
    return apiClient.get(`/persons/search?${params.toString()}`);
  },

  getPerson(personId: string | number) {
    return apiClient.get(`/persons/${personId}`);
  },

  listSources(clanId: string) {
    return apiClient.get(`/clans/${clanId}/sources`);
  },

  listPendingReviews(clanId: string) {
    return apiClient.get(`/clans/${clanId}/review-tasks/pending`);
  },

  getLogStats(clanId: string) {
    return apiClient.get(`/logs/operations/stats?clanId=${clanId}`);
  },

  getPersonRelationships(personId: string | number) {
    return apiClient.get(`/persons/${personId}/relationships`);
  },

  getPersonFamilyTree(personId: string | number, depth?: string | number) {
    const suffix = depth ? `?depth=${depth}` : '';
    return apiClient.get(`/tree/person/${personId}/family${suffix}`);
  },

  getAncestors(personId: string | number, maxDepth: string | number = 5) {
    return apiClient.get(`/tree/ancestors?personId=${personId}&maxDepth=${maxDepth}`);
  },

  getDescendants(personId: string | number, maxDepth: string | number = 5) {
    return apiClient.get(`/tree/descendants?rootPersonId=${personId}&maxDepth=${maxDepth}`);
  },

  getFamily(personId: string | number, depth: string | number = 3) {
    return this.getPersonFamilyTree(personId, depth);
  },

  getBranchLineage(clanId: string, branchId: string | number) {
    return apiClient.get(`/tree/clans/${clanId}/branches/${branchId}/lineage`);
  },

  createPerson(clanId: string, payload: unknown) {
    return apiClient.post(`/clans/${clanId}/persons`, payload);
  },

  createRelationship(clanId: string, payload: RelationshipPayload) {
    return apiClient.post(`/clans/${clanId}/relationships`, payload);
  },

  createSource(clanId: string, payload: unknown) {
    return apiClient.post(`/clans/${clanId}/sources`, payload);
  },

  submitPersonReview(personId: string | number, diffSummary = '产品化页面提交人物审核') {
    return apiClient.post(`/persons/${personId}/submit-review`, { diffSummary });
  },

  approveTask(taskId: string | number, comment = '同意入谱') {
    return apiClient.post(`/review-tasks/${taskId}/approve`, { comment });
  },

  rejectTask(taskId: string | number, comment = '请补充资料后重新提交') {
    return apiClient.post(`/review-tasks/${taskId}/reject`, { comment });
  },

  checkRelationshipConflict(clanId: string, payload: RelationshipPayload) {
    return apiClient.post(`/clans/${clanId}/relationships/check-conflict`, payload);
  }
};
