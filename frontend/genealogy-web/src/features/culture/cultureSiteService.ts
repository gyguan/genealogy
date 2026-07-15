import { apiClient } from '../../shared/api/client';
import type {
  CultureArchiveRequest,
  CultureCommandResponse,
  CultureSiteCreateRequest,
  CultureSiteDetailResponse,
  CultureSitePage,
  CultureSiteUpdateRequest,
  CultureSubmitReviewRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';

export type CultureSiteSearchState = {
  keyword?: string;
  siteType?: string;
  branchId?: number;
  addressText?: string;
  foundedPeriod?: string;
  currentStatus?: string;
  relatedPersonId?: number;
  dataStatus?: string;
  privacyLevel?: string;
  featuredOnHome?: boolean;
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

export function listCultureSites(clanId: string, search: CultureSiteSearchState) {
  return apiClient.get<CultureSitePage>(`/clans/${clanId}/culture-sites?${queryString(search)}`);
}

export function getCultureSite(siteId: number) {
  return apiClient.get<CultureSiteDetailResponse>(`/culture-sites/${siteId}`);
}

export function createCultureSite(clanId: string, request: CultureSiteCreateRequest) {
  return apiClient.post<CultureSiteDetailResponse>(`/clans/${clanId}/culture-sites`, request);
}

export function updateCultureSite(siteId: number, request: CultureSiteUpdateRequest) {
  return apiClient.put<CultureSiteDetailResponse>(`/culture-sites/${siteId}`, request);
}

export function submitCultureSiteReview(siteId: number, request: CultureSubmitReviewRequest) {
  return apiClient.post<CultureCommandResponse>(`/culture-sites/${siteId}/submit-review`, request);
}

export function archiveCultureSite(siteId: number, request: CultureArchiveRequest) {
  return apiClient.post<CultureCommandResponse>(`/culture-sites/${siteId}/archive`, request);
}

export function deleteCultureSite(siteId: number) {
  return apiClient.delete<CultureCommandResponse>(`/culture-sites/${siteId}`);
}

export function getCultureSiteTrace(clanId: string, siteId: number) {
  return apiClient.get<TrackingTraceDetailResponse>(
    `/tracking/objects/culture_site/${siteId}/trace?clanId=${encodeURIComponent(clanId)}`
  );
}

export function previewCultureSiteAttachment(attachmentId: number) {
  return apiClient.download(`/source-attachments/${attachmentId}/preview`);
}

export function downloadCultureSiteAttachment(attachmentId: number) {
  return apiClient.download(`/source-attachments/${attachmentId}/download`);
}
