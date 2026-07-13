export type MemberFilters = {
  keyword: string;
  roleCode: string;
  scopeType: string;
  status: string;
};

export type MemberQuery = MemberFilters & {
  pageNo: number;
  pageSize: number;
};

export type BranchOption = {
  id: number;
  branchName: string;
};

export type RoleOption = {
  roleCode: string;
  description?: string;
};

export const EMPTY_MEMBER_FILTERS: Readonly<MemberFilters>;
export function createMemberQuery(filters: Partial<MemberFilters>, pageNo: number, pageSize: number): MemberQuery;
export function resetMemberQuery(pageSize?: number): MemberQuery;
export function memberPermissionErrorMessage(error: unknown, fallback?: string): string;
export function roleCapabilityText(role?: RoleOption): string;
export function scopePreview(scopeType: string, scopeId: number | undefined, clanName: string, branches: BranchOption[]): string;
export function formatAuditValue(value: string | undefined, branches?: BranchOption[]): string;
export function auditActionText(actionType?: string): string;
