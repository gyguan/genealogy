import { ApiRequestError, apiClient } from '../../shared/api/client';
import type {
  CultureArchiveRequest,
  CultureCommandResponse,
  CultureItemCreateRequest,
  CultureItemDetailResponse,
  CultureItemPage,
  CultureItemUpdateRequest,
  CultureOverviewResponse,
  CultureQualityResponse,
  CultureSubmitReviewRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { listBranches, listClans } from '../sources/sourceLibraryService';
import { buildCultureQueryString, cultureSearchKey } from './cultureUrlState';
import type { CultureSearchState } from './cultureUrlState';

export type CultureClanOption = Awaited<ReturnType<typeof listClans>>[number];
type RawCultureBranchOption = Awaited<ReturnType<typeof listBranches>>[number];
export type CultureBranchOption = RawCultureBranchOption & { name: string };

const cultureItemPageCache = new Map<string, CultureItemPage>();
const cultureItemRefreshListeners = new Set<(message?: string) => void>();

function refreshErrorText(error: unknown) {
  return error instanceof Error && error.message ? error.message : '文化资料刷新失败';
}

function publishCultureItemRefresh(message?: string) {
  cultureItemRefreshListeners.forEach(listener => listener(message));
}

export function subscribeCultureItemRefresh(listener: (message?: string) => void) {
  cultureItemRefreshListeners.add(listener);
  return () => {
    cultureItemRefreshListeners.delete(listener);
  };
}

export function listCultureClans() {
  return listClans();
}

export function listCultureBranches(clanId: string): Promise<CultureBranchOption[]> {
  return listBranches(clanId).then(rows => rows.map(row => ({
    ...row,
    name: row.branchName || row.branchPath || '未命名支派'
  })));
}

export function getCultureOverview(clanId: string) {
  return apiClient.get<CultureOverviewResponse>(`/clans/${clanId}/culture-overview`);
}

export function getCultureQuality(clanId: string) {
  return apiClient.get<CultureQualityResponse>(`/clans/${clanId}/culture-quality`);
}

export function listCultureItems(clanId: string, search: CultureSearchState) {
  const query = buildCultureQueryString(search);
  const cacheKey = cultureSearchKey(clanId, search);
  publishCultureItemRefresh(undefined);
  return apiClient.get<CultureItemPage>(`/clans/${clanId}/culture-items?${query}`)
    .then(page => {
      cultureItemPageCache.set(cacheKey, page);
      return page;
    })
    .catch(error => {
      if (error instanceof ApiRequestError && error.status === 403) throw error;
      const cached = cultureItemPageCache.get(cacheKey);
      if (!cached) throw error;
      publishCultureItemRefresh(refreshErrorText(error));
      return cached;
    });
}

export function getCultureItem(cultureItemId: number) {
  return apiClient.get<CultureItemDetailResponse>(`/culture-items/${cultureItemId}`);
}

export function createCultureItem(clanId: string, request: CultureItemCreateRequest) {
  return apiClient.post<CultureItemDetailResponse>(`/clans/${clanId}/culture-items`, request);
}

export function updateCultureItem(cultureItemId: number, request: CultureItemUpdateRequest) {
  return apiClient.put<CultureItemDetailResponse>(`/culture-items/${cultureItemId}`, request);
}

export function submitCultureItemReview(cultureItemId: number, request: CultureSubmitReviewRequest) {
  return apiClient.post<CultureCommandResponse>(`/culture-items/${cultureItemId}/submit-review`, request);
}

export function archiveCultureItem(cultureItemId: number, request: CultureArchiveRequest) {
  return apiClient.post<CultureCommandResponse>(`/culture-items/${cultureItemId}/archive`, request);
}

export function deleteCultureItem(cultureItemId: number) {
  return apiClient.delete<CultureCommandResponse>(`/culture-items/${cultureItemId}`);
}

export function getCultureTrace(clanId: string, cultureItemId: number) {
  return apiClient.get<TrackingTraceDetailResponse>(
    `/tracking/objects/culture_item/${cultureItemId}/trace?clanId=${encodeURIComponent(clanId)}`
  );
}

export function previewCultureAttachment(attachmentId: number) {
  return apiClient.download(`/source-attachments/${attachmentId}/preview`);
}

export function downloadCultureAttachment(attachmentId: number) {
  return apiClient.download(`/source-attachments/${attachmentId}/download`);
}
