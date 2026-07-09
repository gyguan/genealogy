import { apiClient } from '../api/client';

export type PersonSearchParams = {
  clanId: string;
  pageNo: number;
  pageSize: number;
  branchId?: string;
  keyword?: string;
  name?: string;
  gender?: string;
  generationNo?: string;
  generationWord?: string;
  dataStatus?: string;
};

function personSearchQuery(params: PersonSearchParams) {
  const query = new URLSearchParams({ clanId: params.clanId, pageNo: String(params.pageNo), pageSize: String(params.pageSize) });
  if (params.branchId) query.set('branchId', params.branchId);
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.name?.trim()) query.set('name', params.name.trim());
  if (params.gender) query.set('gender', params.gender);
  if (params.generationNo) query.set('generationNo', params.generationNo);
  if (params.generationWord) query.set('generationWord', params.generationWord);
  if (params.dataStatus) query.set('dataStatus', params.dataStatus);
  return query.toString();
}

export const personArchiveService = {
  listClans() {
    return apiClient.get('/clans');
  },

  listBranches(clanId: string) {
    return apiClient.get(`/clans/${clanId}/branches`);
  },

  listGenerationSchemes(clanId: string) {
    return apiClient.get(`/clans/${clanId}/generation-schemes`);
  },

  listGenerationSchemeItems(schemeId: string | number) {
    return apiClient.get(`/generation-schemes/${schemeId}/items`);
  },

  searchPersons(params: PersonSearchParams) {
    return apiClient.get(`/persons/search?${personSearchQuery(params)}`);
  },

  getPerson(personId: string | number) {
    return apiClient.get(`/persons/${personId}`);
  },

  updatePerson(personId: string | number, payload: unknown) {
    return apiClient.put(`/persons/${personId}`, payload);
  },

  listRelationships(personId: string | number) {
    return apiClient.get(`/persons/${personId}/relationships`);
  },

  listSourceBindings(personId: string | number) {
    return apiClient.get(`/source-bindings/target/person/${personId}`);
  },

  listEvents(personId: string | number) {
    return apiClient.get(`/persons/${personId}/events`);
  }
};
