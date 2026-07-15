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
import type { MigrationSearchState } from './migrationEventUrlState';

export type { MigrationSearchState } from './migrationEventUrlState';

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

export function getMigrationEvent(id: number) {
  return apiClient.get<MigrationEventDetailResponse>(`/migration-events/${id}`);
}

export function createMigrationEvent(clanId: string, request: MigrationEventCreateRequest) {
  return apiClient.post<MigrationEventDetailResponse>(`/clans/${clanId}/migration-events`, request);
}

export function updateMigrationEvent(id: number, request: MigrationEventUpdateRequest) {
  return apiClient.put<MigrationEventDetailResponse>(`/migration-events/${id}`, request);
}

export function submitMigrationEventReview(id: number, request: CultureSubmitReviewRequest) {
  return apiClient.post<CultureCommandResponse>(`/migration-events/${id}/submit-review`, request);
}

export function archiveMigrationEvent(id: number, request: CultureArchiveRequest) {
  return apiClient.post<CultureCommandResponse>(`/migration-events/${id}/archive`, request);
}

export function deleteMigrationEvent(id: number) {
  return apiClient.delete<CultureCommandResponse>(`/migration-events/${id}`);
}

export function getMigrationEventTrace(clanId: string, id: number) {
  return apiClient.get<TrackingTraceDetailResponse>(
    `/tracking/objects/migration_event/${id}/trace?clanId=${encodeURIComponent(clanId)}`
  );
}
