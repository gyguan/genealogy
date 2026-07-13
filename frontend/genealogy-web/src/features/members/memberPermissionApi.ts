import { apiClient, type PageResponse } from '../../shared/api/client';

export type MemberCandidate = {
  userId: number;
  displayName: string;
  maskedAccount: string;
  alreadyMember: boolean;
};

export type GrantableRole = {
  roleCode: string;
  roleName: string;
  description?: string;
  allowedScopeTypes: string[];
  riskLevel: 'high' | 'normal' | string;
};

export type MemberGrant = {
  grantId: number;
  roleCode: string;
  roleName: string;
  scopeType: string;
  scopeId: number;
  scopeName: string;
  grantStatus: string;
  grantedBy?: number;
  grantedAt?: string;
  updatedAt?: string;
  canEditGrant: boolean;
  canRevokeGrant: boolean;
};

export type MemberAllowedActions = {
  canGrantRole: boolean;
  canEditGrant: boolean;
  canRevokeGrant: boolean;
  canDisableMember: boolean;
  canViewHistory: boolean;
};

export type MemberAggregate = {
  membershipId: number;
  userId: number;
  displayName: string;
  maskedAccount: string;
  membershipStatus: string;
  joinedAt?: string;
  updatedAt?: string;
  grants: MemberGrant[];
  allowedActions: MemberAllowedActions;
};

export type MemberGrantPayload = {
  userId?: number;
  roleCode: string;
  scopeType: string;
  scopeId: number;
  reason: string;
};

export type MemberPermissionAudit = {
  auditId: number;
  actorId: number;
  actorDisplayName: string;
  actorMaskedAccount: string;
  actionType: string;
  membershipId: number;
  grantId?: number;
  targetMemberDisplayName: string;
  targetMemberMaskedAccount: string;
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
  changedAt: string;
};

export type MemberAuditQuery = {
  membershipId?: number;
  grantId?: number;
  actorId?: number;
  actionType?: string;
  startTime?: string;
  endTime?: string;
  pageNo?: number;
  pageSize?: number;
};

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export const memberPermissionApi = {
  listMembers(clanId: string, params: Record<string, string | number | undefined>) {
    return apiClient.get<PageResponse<MemberAggregate>>(`/clans/${clanId}/members?${queryString(params)}`);
  },
  searchCandidates(clanId: string, keyword: string) {
    return apiClient.get<PageResponse<MemberCandidate>>(`/clans/${clanId}/member-candidates?${queryString({ keyword, pageNo: 1, pageSize: 20 })}`);
  },
  grantableRoles(clanId: string) {
    return apiClient.get<GrantableRole[]>(`/clans/${clanId}/grantable-roles`);
  },
  createGrant(clanId: string, payload: MemberGrantPayload & { userId: number }) {
    return apiClient.post<MemberGrant>(`/clans/${clanId}/member-grants`, payload);
  },
  updateGrant(clanId: string, grantId: number, payload: MemberGrantPayload) {
    return apiClient.put<MemberGrant>(`/clans/${clanId}/member-grants/${grantId}`, payload);
  },
  revokeGrant(clanId: string, grantId: number, reason: string) {
    return apiClient.post<void>(`/clans/${clanId}/member-grants/${grantId}/revoke`, { reason });
  },
  updateMemberStatus(clanId: string, membershipId: number, status: string, reason: string) {
    return apiClient.patch<MemberAggregate>(`/clans/${clanId}/members/${membershipId}/status`, { status, reason });
  },
  listAudits(clanId: string, params: MemberAuditQuery) {
    return apiClient.get<PageResponse<MemberPermissionAudit>>(
      `/clans/${clanId}/member-permission-audits?${queryString(params as Record<string, string | number | undefined>)}`
    );
  }
};
