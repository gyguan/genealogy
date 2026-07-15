import { apiClient, type PageResponse } from '../../shared/api/client';
import type {
  CultureArchiveRequest,
  CultureCommandResponse,
  CultureSubmitReviewRequest,
  MigrationEventCreateRequest,
  MigrationEventDetailResponse,
  MigrationEventPage,
  MigrationEventUpdateRequest
} from '../../shared/api/generated/culture-types';

export type MigrationSearchState = {
  keyword: string;
  branchId?: number;
  dataStatus?: string;
  pageNo: number;
  pageSize: number;
};

export type MigrationBranchOption = { id: number; branchName?: string; branchPath?: string };
export type MigrationPersonOption = { id: number; displayName?: string; fullName?: string; personName?: string };

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listMigrationEvents(clanId: string, search: MigrationSearchState) {
  return apiClient.get<MigrationEventPage>(`/clans/${clanId}/migration-events${queryString({
    keyword: search.keyword.trim() || undefined,
    branchId: search.branchId,
    dataStatus: search.dataStatus,
    pageNo: search.pageNo,
    pageSize: search.pageSize,
    sort: 'sequenceNo,asc'
  })}`);
}

export function getMigrationEvent(id: number) {
  return apiClient.get<MigrationEventDetailResponse>(`/migration-events/${id}`);
}

export function createMigrationEvent(clanId: string, body: MigrationEventCreateRequest) {
  return apiClient.post<MigrationEventDetailResponse>(`/clans/${clanId}/migration-events`, body);
}

export function updateMigrationEvent(id: number, body: MigrationEventUpdateRequest) {
  return apiClient.put<MigrationEventDetailResponse>(`/migration-events/${id}`, body);
}

export function submitMigrationEventReview(id: number, body: CultureSubmitReviewRequest) {
  return apiClient.post<CultureCommandResponse>(`/migration-events/${id}/submit-review`, body);
}

export function archiveMigrationEvent(id: number, body: CultureArchiveRequest) {
  return apiClient.post<CultureCommandResponse>(`/migration-events/${id}/archive`, body);
}

export function deleteMigrationEvent(id: number) {
  return apiClient.delete<CultureCommandResponse>(`/migration-events/${id}`);
}

export function getMigrationTrace(clanId: string, id: number) {
  return apiClient.get(`/tracking/objects/migration_event/${id}/trace?clanId=${encodeURIComponent(clanId)}`);
}

export async function listMigrationBranches(clanId: string): Promise<MigrationBranchOption[]> {
  const data = await apiClient.get<unknown>(`/clans/${clanId}/branches`);
  if (Array.isArray(data)) return data as MigrationBranchOption[];
  const record = data as { records?: MigrationBranchOption[] };
  return record.records || [];
}

export async function listMigrationPersons(clanId: string): Promise<MigrationPersonOption[]> {
  const data = await apiClient.get<PageResponse<MigrationPersonOption> | MigrationPersonOption[]>(`/clans/${clanId}/persons?pageNo=1&pageSize=100`);
  return Array.isArray(data) ? data : data.records || [];
}
