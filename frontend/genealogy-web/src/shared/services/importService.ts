import { apiClient } from '../api/client';

export const importService = {
  listJobs(clanId: string) {
    return apiClient.get(`/clans/${clanId}/imports`);
  },

  previewPersons(clanId: string, query: string, formData: FormData) {
    return apiClient.upload(`/clans/${clanId}/imports/persons/preview?${query}`, formData);
  },

  importPersons(clanId: string, query: string, confirmDuplicates: boolean, formData: FormData) {
    const sep = query ? '&' : '';
    return apiClient.upload(`/clans/${clanId}/imports/persons?${query}${sep}confirmDuplicates=${confirmDuplicates}`, formData);
  },

  downloadClanPersons(clanId: string) {
    return apiClient.download(`/clans/${clanId}/exports/persons.csv`);
  },

  downloadClanRelations(clanId: string) {
    return apiClient.download(`/clans/${clanId}/exports/relations.csv`);
  },

  downloadClanBooklet(clanId: string) {
    return apiClient.download(`/clans/${clanId}/exports/booklet.html`);
  },

  downloadBranchPersons(clanId: string, branchId: string) {
    return apiClient.download(`/clans/${clanId}/branches/${branchId}/exports/persons.csv`);
  },

  downloadBranchRelations(clanId: string, branchId: string) {
    return apiClient.download(`/clans/${clanId}/branches/${branchId}/exports/relations.csv`);
  },

  downloadBranchBooklet(clanId: string, branchId: string) {
    return apiClient.download(`/clans/${clanId}/branches/${branchId}/exports/booklet.html`);
  }
};
