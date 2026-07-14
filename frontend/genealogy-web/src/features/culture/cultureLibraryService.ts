import { apiClient } from '../../shared/api/client';
import type {
  CultureArchiveRequest,
  CultureCommandResponse,
  CultureItemCreateRequest,
  CultureItemDetailResponse,
  CultureItemPage,
  CultureItemUpdateRequest,
  CultureOverviewResponse,
  CultureSubmitReviewRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { listBranches, listClans } from '../sources/sourceLibraryService';
import type { CultureSearchState } from './cultureUrlState';

export type CultureClanOption = Awaited<ReturnType<typeof listClans>>[number];
export type CultureBranchOption = Awaited<ReturnType<typeof listBranches>>[number];

function queryString(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}

export function listCultureClans() {
  return listClans();
}

export function listCultureBranches(clanId: string) {
  return listBranches(clanId);
}

export function getCultureOverview(clanId: string) {
  return apiClient.get<CultureOverviewResponse>(`/clans/${clanId}/culture-overview`);
}

export function listCultureItems(clanId: string, search: CultureSearchState) {
  const query = queryString({
    keyword: search.keyword,
    category: search.category,
    branchId: search.branchId,
    dataStatus: search.dataStatus,
    privacyLevel: search.privacyLevel,
    hasSource: search.hasSource,
    featuredOnHome: search.featuredOnHome,
    sort: search.sort,
    pageNo: search.pageNo,
    pageSize: search.pageSize
  });
  return apiClient.get<CultureItemPage>(`/clans/${clanId}/culture-items?${query}`);
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
