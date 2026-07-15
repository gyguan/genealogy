import { apiClient } from '../../shared/api/client';
import type {
  CultureArchiveRequest,
  CultureCommandResponse,
  CultureSubmitReviewRequest,
  MigrationEventCreateRequest,
  MigrationEventDetailResponse,
  MigrationEventPage,
  MigrationEventUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';

export type MigrationSearchState = {
  keyword: string;
  branchId?: number;
  fromLocation: string;
  toLocation: string;
  migrationTimeText: string;
  founderPersonId?: number;
  dataStatus?: string;
  privacyLevel?: string;
  hasSource?: boolean;
  sort: string;
  pageNo: number;
  pageSize: number;
};

export type MigrationBranchOption = {
  id: number;
  branchName?: string;
  branchPath?: string;
};

export type MigrationPersonOption = {
  id: number;
  name: string;
  branchId?: number | null;
};

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listMigrationEvents(clanId: string, search: MigrationSearchState) {
  return apiClient.get<MigrationEventPage>(`/clans/${clanId}/migration-events${queryString({
    keyword: search.keyword.trim() || undefined,
    branchId: search.branchId,
    fromLocation: search.fromLocation.trim() || undefined,
    toLocation: search.toLocation.trim() || undefined,
    migrationTimeText: search.migrationTimeText.trim() || undefined,
    founderPersonId: search.founderPersonId,
    dataStatus: search.dataStatus,
    privacyLevel: search.privacyLevel,
    hasSource: search.hasSource,
    sort: search.sort,
    pageNo: search.pageNo,
    pageSize: search.pageSize
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
  return apiClient.get<TrackingTraceDetailResponse>(
    `/tracking/objects/migration_event/${id}/trace${queryString({ clanId })}`
  );
}

export async function listMigrationBranches(clanId: string): Promise<MigrationBranchOption[]> {
  const data = await apiClient.get<unknown>(`/clans/${clanId}/branches`);
  if (Array.isArray(data)) return data as MigrationBranchOption[];
  const record = data && typeof data === 'object' ? data as { records?: MigrationBranchOption[] } : {};
  return record.records || [];
}

export async function listMigrationPersons(clanId: string, branchId?: number): Promise<MigrationPersonOption[]> {
  const data = await apiClient.get<unknown>(`/clans/${clanId}/persons${queryString({
    branchId,
    pageNo: 1,
    pageSize: 100
  })}`);
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const rows = Array.isArray(data) ? data : Array.isArray(record.records) ? record.records : [];
  return rows.flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const person = value as Record<string, unknown>;
    const id = Number(person.id);
    const name = String(person.name || person.genealogyName || person.fullName || person.personName || '').trim();
    const candidateBranchId = Number(person.branchId);
    if (!Number.isFinite(id) || id <= 0 || !name) return [];
    return [{
      id,
      name,
      branchId: Number.isFinite(candidateBranchId) && candidateBranchId > 0 ? candidateBranchId : null
    } satisfies MigrationPersonOption];
  });
}
