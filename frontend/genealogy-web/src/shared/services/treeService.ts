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

  getPersonFamilyTree(personId: string | number) {
    return apiClient.get(`/tree/person/${personId}/family`);
  },

  getAncestors(personId: string | number, depth = 5) {
    return apiClient.get(`/tree/ancestors?personId=${personId}&depth=${depth}`);
  },

  getDescendants(personId: string | number, depth = 5) {
    return apiClient.get(`/tree/descendants?personId=${personId}&depth=${depth}`);
  },

  getFamily(personId: string | number, depth = 3) {
    return apiClient.get(`/tree/person/${personId}/family?depth=${depth}`);
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
