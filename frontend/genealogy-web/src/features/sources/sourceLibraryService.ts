import { apiClient } from '../../shared/api/client';
import type { PageResponse } from '../../shared/api/client';

export type SourceRecord = {
  id?: number;
  clanId?: number;
  sourceName?: string;
  sourceType?: string;
  providerName?: string;
  bookTitle?: string;
  volumeNo?: string;
  pageNo?: string;
  sourceDate?: string;
  excerpt?: string;
  description?: string;
  verificationStatus?: string;
  confidenceLevel?: string;
  privacyLevel?: string;
  sensitiveLevel?: string;
  bindingCount?: number;
  attachmentCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SourcePermissionView = {
  canEdit?: boolean;
  canDelete?: boolean;
  canBind?: boolean;
  canSubmitReview?: boolean;
  canUploadAttachment?: boolean;
  canPreviewAttachment?: boolean;
  canDownloadAttachment?: boolean;
};

export type SourceBindingSummary = {
  id?: number;
  targetType?: string;
  targetId?: number;
  targetDisplayName?: string;
  targetBranchName?: string;
  targetSummary?: string;
  bindingReason?: string;
  excerpt?: string;
  confidenceLevel?: string;
  bindingStatus?: string;
  hasPendingRevision?: boolean;
  pendingChangeType?: string;
  createdBy?: number;
  createdAt?: string;
};

export type SourceAttachmentRecord = {
  id?: number;
  sourceId?: number;
  clanId?: number;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  privacyLevel?: string;
  sensitiveLevel?: string;
  uploadStatus?: string;
  previewAllowed?: boolean;
  downloadAllowed?: boolean;
  uploadedBy?: number;
  uploadedAt?: string;
};

export type SourceDetail = {
  source?: SourceRecord;
  permissions?: SourcePermissionView;
  bindingSummaries?: SourceBindingSummary[];
  attachmentSummaries?: SourceAttachmentRecord[];
};

export type PersonOption = {
  id?: number;
  name?: string;
  genealogyName?: string;
  personCode?: string;
  branchName?: string;
  generationWord?: string;
  generationNo?: number;
};

export type BranchOption = {
  id?: number;
  branchName?: string;
  branchPath?: string;
};

export type GenerationSchemeOption = {
  id?: number;
  clanId?: number;
  branchId?: number;
  schemeName?: string;
  status?: string;
};

export type GenerationWordOption = {
  id?: number;
  generationNo?: number;
  word?: string;
  description?: string;
  sortOrder?: number;
};

export type BindingRevisionSubmitPayload = {
  binding: {
    sourceId: number;
    targetType: string;
    targetId: number;
    bindingReason?: string;
    excerpt?: string;
    confidenceLevel?: string;
  };
  changeReason?: string;
};

export type BindingRevisionResponse = {
  revisionId?: number;
  reviewTaskId?: number;
  clanId?: number;
  bindingId?: number;
  changeType?: string;
  status?: string;
  diffSummary?: string;
  submitterId?: number;
  submitTime?: string;
  approvedAt?: string;
  rejectedReason?: string;
};

export type SourceSearchParams = {
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  sourceType?: string;
  verificationStatus?: string;
  privacyLevel?: string;
  targetType?: string;
  hasAttachment?: boolean;
  hasBinding?: boolean;
  sort?: string;
};

function cleanParams(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

export function toRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const record = data as any;
  if (Array.isArray(record?.records)) return record.records as T[];
  if (Array.isArray(record?.items)) return record.items as T[];
  if (Array.isArray(record?.content)) return record.content as T[];
  return [];
}

export async function listClans(): Promise<Array<{ id?: number; clanName?: string; surname?: string }>> {
  return toRows(await apiClient.get('/clans'));
}

export async function listSources(clanId: string, params: SourceSearchParams) {
  const query = cleanParams({ pageNo: params.pageNo || 1, pageSize: params.pageSize || 10, sort: params.sort || 'updatedAt,desc', ...params });
  return apiClient.get<PageResponse<SourceRecord>>(`/clans/${clanId}/sources?${query}`);
}

export async function getSourceDetail(sourceId: number) {
  return apiClient.get<SourceDetail>(`/sources/${sourceId}`);
}

export async function listSourceBindings(sourceId: number, pageNo = 1, pageSize = 10) {
  return apiClient.get<PageResponse<SourceBindingSummary>>(`/sources/${sourceId}/bindings?pageNo=${pageNo}&pageSize=${pageSize}`);
}

export async function listSourceAttachments(sourceId: number, pageNo = 1, pageSize = 10) {
  return apiClient.get<PageResponse<SourceAttachmentRecord>>(`/sources/${sourceId}/attachments?pageNo=${pageNo}&pageSize=${pageSize}`);
}

export async function uploadSourceAttachment(sourceId: number, file: File, privacyLevel: string, sensitiveLevel: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (privacyLevel) formData.append('privacyLevel', privacyLevel);
  if (sensitiveLevel) formData.append('sensitiveLevel', sensitiveLevel);
  return apiClient.upload<SourceAttachmentRecord>(`/sources/${sourceId}/attachments`, formData);
}

export async function deleteSourceAttachment(attachmentId: number) {
  return apiClient.delete(`/source-attachments/${attachmentId}`);
}

export function previewAttachmentUrl(attachmentId: number) {
  return `/source-attachments/${attachmentId}/preview`;
}

export function downloadAttachmentUrl(attachmentId: number) {
  return `/source-attachments/${attachmentId}/download`;
}

export async function downloadAttachment(attachmentId: number) {
  return apiClient.download(downloadAttachmentUrl(attachmentId));
}

export async function previewAttachment(attachmentId: number) {
  return apiClient.download(previewAttachmentUrl(attachmentId));
}

export async function listPersons(clanId: string, keyword?: string) {
  const query = cleanParams({ clanId, keyword, pageNo: 1, pageSize: 30, dataStatus: 'official' });
  const data = await apiClient.get<PageResponse<PersonOption>>(`/persons/search?${query}`);
  return toRows<PersonOption>(data);
}

export async function listBranches(clanId: string) {
  return toRows<BranchOption>(await apiClient.get(`/clans/${clanId}/branches`));
}

export async function listGenerationSchemes(clanId: string) {
  const rows = toRows<GenerationSchemeOption>(await apiClient.get(`/clans/${clanId}/generation-schemes`));
  return rows.filter(row => String(row.status || '').toLowerCase() === 'official');
}

export async function listGenerationWords(schemeId: number | string) {
  return toRows<GenerationWordOption>(await apiClient.get(`/generation-schemes/${schemeId}/items`));
}

export async function submitCreateBindingRevision(clanId: string, payload: BindingRevisionSubmitPayload) {
  return apiClient.post<BindingRevisionResponse>(`/clans/${clanId}/source-bindings/revisions`, payload);
}

export async function submitReplaceBindingRevision(bindingId: number, payload: BindingRevisionSubmitPayload) {
  return apiClient.post<BindingRevisionResponse>(`/source-bindings/${bindingId}/replace-revision`, payload);
}

export async function submitDeleteBindingRevision(bindingId: number, changeReason?: string) {
  return apiClient.post<BindingRevisionResponse>(`/source-bindings/${bindingId}/delete-revision`, { changeReason });
}
