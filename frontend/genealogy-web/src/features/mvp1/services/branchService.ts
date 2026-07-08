import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';

export type BranchLike = {
  id?: number | string;
  branchName?: string;
  name?: string;
  parentId?: number | string;
  branchPath?: string;
  level?: number | string;
  sortOrder?: number | string;
  status?: string;
  dataStatus?: string;
};

export type CreateBranchPayload = {
  branchName: string;
  parentId?: number | null;
};

export async function loadBranches(clanId?: number | string): Promise<BranchLike[]> {
  if (!clanId) return [];
  const data = await apiClient.get(`/clans/${clanId}/branches`);
  return toRows<BranchLike>(data);
}

export async function createBranchApi(clanId: number | string, payload: CreateBranchPayload): Promise<BranchLike> {
  return apiClient.post(`/clans/${clanId}/branches`, payload);
}

export async function deleteBranchApi(branchId: number | string): Promise<void> {
  return apiClient.delete(`/branches/${branchId}`);
}
