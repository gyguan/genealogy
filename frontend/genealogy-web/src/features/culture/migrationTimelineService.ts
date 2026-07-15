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
  keyword?: string;
  branchId?: number;
  fromLocation?: string;
  toLocation?: string;
  migrationTimeText?: string;
  dataStatus?: string;
  privacyLevel?: string;
  sort: string;
  pageNo: number;
  pageSize: number;
};

function queryString(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}

export function listMigrationEvents(clanId: string, search: MigrationSearchState) {
  const query = queryString(search);
  return apiClient.get<MigrationEventPage>(`/clans/${clanId}/migration-events?${query}`);
}

export function getMigrationEvent(eventId: number) {
  return apiClient.get<MigrationEventDetailResponse>(`/migration-events/${eventId}`);
}

export function createMigrationEvent(clanId: string, request: MigrationEventCreateRequest) {
  return apiClient.post<MigrationEventDetailResponse>(`/clans/${clanId}/migration-events`, request);
}

export function updateMigrationEvent(eventId: number, request: MigrationEventUpdateRequest) {
  return apiClient.put<MigrationEventDetailResponse>(`/migration-events/${eventId}`, request);
}

export function submitMigrationEventReview(eventId: number, request: CultureSubmitReviewRequest) {
  return apiClient.post<CultureCommandResponse>(`/migration-events/${eventId}/submit-review`, request);
}

export function archiveMigrationEvent(eventId: number, request: CultureArchiveRequest) {
  return apiClient.post<CultureCommandResponse>(`/migration-events/${eventId}/archive`, request);
}

export function deleteMigrationEvent(eventId: number) {
  return apiClient.delete<CultureCommandResponse>(`/migration-events/${eventId}`);
}

export function getMigrationTrace(clanId: string, eventId: number) {
  return apiClient.get<TrackingTraceDetailResponse>(
    `/tracking/objects/migration_event/${eventId}/trace?clanId=${encodeURIComponent(clanId)}`
  );
}
