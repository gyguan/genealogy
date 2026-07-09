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

export type ClanOptionDto = {
  id?: number | string;
  clanName?: string;
  name?: string;
  surname?: string;
  hallName?: string;
  isDefault?: boolean;
};

export type BranchOptionDto = {
  id?: number | string;
  branchName?: string;
  name?: string;
  parentId?: number | string;
};

export type GenerationSchemeDto = {
  id?: number | string;
  isDefault?: boolean;
};

export type GenerationSchemeItemDto = {
  id?: number | string;
  word?: string;
  generationWord?: string;
  generationNo?: number | string;
};

export type PersonArchiveDto = {
  id?: number | string;
  personId?: number | string;
  branchId?: number | string;
  branch?: BranchOptionDto;
  branchName?: string;
  personCode?: string;
  name?: string;
  personName?: string;
  displayName?: string;
  genealogyName?: string;
  courtesyName?: string;
  aliasName?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
  rankInFamily?: string;
  birthDate?: string;
  birthDatePrecision?: string;
  deathDate?: string;
  deathDatePrecision?: string;
  isLiving?: boolean;
  birthPlace?: string;
  residencePlace?: string;
  occupation?: string;
  education?: string;
  titleOrHonor?: string;
  biography?: string;
  tombPlace?: string;
  epitaph?: string;
  hasDescendant?: boolean;
  lineageStatus?: string;
  privacyLevel?: string;
  dataStatus?: string;
  status?: string;
};

export type PersonRelationshipDto = {
  id?: number | string;
  relationType?: string;
  relationLabel?: string;
  fromPersonName?: string;
  toPersonName?: string;
  personName?: string;
  confidenceLevel?: string;
  status?: string;
};

export type PersonSourceBindingDto = {
  id?: number | string;
  sourceName?: string;
  sourceTitle?: string;
  title?: string;
  fileName?: string;
  materialName?: string;
  sourceType?: string;
  type?: string;
  dataStatus?: string;
  status?: string;
};

export type PersonEventDto = {
  id?: number | string;
  eventType?: string;
  eventTitle?: string;
  eventDate?: string;
  eventPlace?: string;
  eventDescription?: string;
  sourceType?: string;
  sourceName?: string;
  sourceTitle?: string;
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
