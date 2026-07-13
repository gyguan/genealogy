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

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = apiClient.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiClient.getBaseUrl()}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.errorMessage || `HTTP ${response.status}`);
  }
  return (payload?.data ?? payload) as T;
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
    return patch<MemberAggregate>(`/clans/${clanId}/members/${membershipId}/status`, { status, reason });
  }
};
