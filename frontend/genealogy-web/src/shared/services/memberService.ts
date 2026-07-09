import { apiClient } from '../api/client';

const memberManagementBase = '/member-management';

export type MemberPayload = {
  userId: number;
  roleCode: string;
  memberName: string;
  scopeType: string;
  scopeId: number;
  branchId: number | null;
};

export type MemberUpdatePayload = {
  roleCode: string;
  memberStatus: string;
  scopeType: string;
  scopeId: number | string | undefined;
  branchId: number | string | null | undefined;
};

export const memberService = {
  listClans() {
    return apiClient.get('/clans');
  },

  listBranches(clanId: string) {
    return apiClient.get(`/clans/${clanId}/branches`);
  },

  listUsers() {
    return apiClient.get(`${memberManagementBase}/users`);
  },

  listRoles() {
    return apiClient.get(`${memberManagementBase}/roles`);
  },

  listMembers(clanId: string) {
    return apiClient.get(`${memberManagementBase}/clans/${clanId}/members`);
  },

  createMember(clanId: string, payload: MemberPayload) {
    return apiClient.post(`${memberManagementBase}/clans/${clanId}/members`, payload);
  },

  updateMember(clanId: string, memberId: string | number, payload: MemberUpdatePayload) {
    return apiClient.put(`${memberManagementBase}/clans/${clanId}/members/${memberId}`, payload);
  },

  revokeMember(clanId: string, memberId: string | number) {
    return apiClient.delete(`${memberManagementBase}/clans/${clanId}/members/${memberId}`);
  }
};
