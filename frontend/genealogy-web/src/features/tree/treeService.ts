import { apiClient } from '../../shared/api/client';
import type {
  TreeDataView,
  TreeDirection,
  TreeGraphResponse,
  TreeRelationScope
} from '../../shared/api/generated/tree-types';
import { readSearchPage, toPersonSearchItem, type PersonSearchItem, type SearchPage } from './lineageRequestState';

export type GenericRow = Record<string, unknown>;
export type BranchRow = GenericRow & { id?: string | number; branchName?: string; parentId?: string | number };
export type ClanRow = GenericRow & { id?: string | number; clanName?: string; surname?: string };

function asRecord(value: unknown): GenericRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as GenericRow : {};
}

function rows(data: unknown): GenericRow[] {
  if (Array.isArray(data)) return data.map(asRecord);
  const record = asRecord(data);
  for (const key of ['records', 'items', 'content']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(asRecord);
  }
  return [];
}

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export async function loadClans() {
  return rows(await apiClient.get('/clans')) as ClanRow[];
}

export async function loadBranches(clanId: string) {
  return rows(await apiClient.get(`/clans/${clanId}/branches`)) as BranchRow[];
}

export async function searchPersons(input: {
  clanId: string;
  branchId?: string;
  keyword: string;
  pageNo: number;
  pageSize?: number;
  branches: BranchRow[];
}): Promise<SearchPage<PersonSearchItem>> {
  const branchNames = new Map(input.branches.map(item => [String(item.id || ''), item.branchName || '未命名支派']));
  const query = queryString({
    clanId: input.clanId,
    branchId: input.branchId,
    keyword: input.keyword.trim() || undefined,
    pageNo: input.pageNo,
    pageSize: input.pageSize || 20
  });
  const payload = await apiClient.get(`/persons/search?${query}`);
  return readSearchPage(payload, value => toPersonSearchItem(value, branchNames));
}

export async function loadPersonLineage(input: {
  personId: string;
  direction: TreeDirection;
  relationScopes: TreeRelationScope[];
  dataView: TreeDataView;
  depth: string;
}) {
  const query = queryString({
    direction: input.direction,
    relationScopes: input.relationScopes.join(','),
    dataView: input.dataView,
    maxDepth: input.depth,
    maxNodes: 500,
    maxEdges: 1000
  });
  return apiClient.get<TreeGraphResponse>(`/tree/person/${input.personId}?${query}`);
}

export async function loadBranchLineage(input: {
  clanId: string;
  branchId: string;
  relationScopes: TreeRelationScope[];
  dataView: TreeDataView;
  includeSubBranches: boolean;
  depth: string;
}) {
  const query = queryString({
    relationScopes: input.relationScopes.join(','),
    dataView: input.dataView,
    includeSubBranches: input.includeSubBranches,
    maxDepth: input.depth,
    maxNodes: 500,
    maxEdges: 1000
  });
  return apiClient.get<TreeGraphResponse>(`/tree/clans/${input.clanId}/branches/${input.branchId}/lineage?${query}`);
}
