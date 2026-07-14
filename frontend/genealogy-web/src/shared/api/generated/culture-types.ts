/* eslint-disable */
/**
 * Auto-generated culture-domain DTOs from the effective OpenAPI contract.
 * Do not edit manually.
 */

export type GenealogyTargetType = "person" | "relationship" | "branch" | "clan" | "generation_scheme" | "generation_word" | "source" | "source_binding" | "source_attachment" | "import_job" | "review_task" | "culture_item" | "migration_event" | "culture_site";

export type CultureCategory = "surname_origin" | "hall_name" | "commandery" | "family_instruction" | "ancestor_instruction" | "clan_rule" | "genealogy_preface" | "genealogy_rule" | "person_story" | "custom_tradition" | "other";

export type CultureSiteType = "ancestral_hall" | "ancestral_home" | "cemetery" | "memorial" | "other";

export type CultureDataStatus = "draft" | "pending_review" | "official" | "rejected" | "archived";

export type CultureConfidenceLevel = "high" | "medium" | "low" | "unknown";

export type CulturePrivacyLevel = "public" | "clan_only" | "branch_only" | "relatives_only" | "private" | "sealed";

export type CultureSensitiveLevel = "normal" | "sensitive" | "highly_sensitive";

export type CultureScopeResponse = {
  clanId: number;
  clanName: string;
  branchId?: number | null;
  branchName?: string | null;
};

export type CultureSourceSummaryResponse = {
  sourceId: number;
  sourceName: string;
  sourceType: string;
  excerpt?: string | null;
  confidenceLevel?: CultureConfidenceLevel;
  bindingStatus: CultureDataStatus;
};

export type CultureAttachmentSummaryResponse = {
  attachmentId: number;
  fileName: string;
  contentType?: string | null;
  fileSize: number;
  canPreview: boolean;
  canDownload: boolean;
};

export type CultureReviewSummaryResponse = {
  reviewTaskId?: number | null;
  status?: string | null;
  submitterName?: string | null;
  reviewerName?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectedReason?: string | null;
};

export type CulturePageMetadata = {
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
};

export type CultureItemCreateRequest = {
  branchId?: number | null;
  category: CultureCategory;
  title: string;
  summary?: string | null;
  content?: string | null;
  historicalPeriod?: string | null;
  locationText?: string | null;
  confidenceLevel: CultureConfidenceLevel;
  privacyLevel: CulturePrivacyLevel;
  sensitiveLevel: CultureSensitiveLevel;
  featuredOnHome?: boolean;
  sortOrder?: number;
};

export type CultureItemUpdateRequest = CultureItemCreateRequest & { version: number; };

export type CultureItemSummaryResponse = {
  id: number;
  scope: CultureScopeResponse;
  category: CultureCategory;
  title: string;
  summary?: string | null;
  historicalPeriod?: string | null;
  locationText?: string | null;
  confidenceLevel: CultureConfidenceLevel;
  privacyLevel: CulturePrivacyLevel;
  sensitiveLevel: CultureSensitiveLevel;
  dataStatus: CultureDataStatus;
  featuredOnHome: boolean;
  sortOrder: number;
  sourceCount: number;
  attachmentCount: number;
  allowedActions: string[];
  version: number;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CultureItemDetailResponse = CultureItemSummaryResponse & { content?: string | null; sources: CultureSourceSummaryResponse[]; attachments: CultureAttachmentSummaryResponse[]; review: CultureReviewSummaryResponse; };

export type CultureItemPage = {
  items: CultureItemSummaryResponse[];
  page: CulturePageMetadata;
};

export type MigrationEventCreateRequest = {
  branchId: number;
  sequenceNo: number;
  fromLocation?: string | null;
  toLocation?: string | null;
  migrationTimeText?: string | null;
  founderPersonId?: number | null;
  reason?: string | null;
  description?: string | null;
  confidenceLevel: CultureConfidenceLevel;
  privacyLevel: CulturePrivacyLevel;
  sensitiveLevel: CultureSensitiveLevel;
};

export type MigrationEventUpdateRequest = MigrationEventCreateRequest & { version: number; };

export type MigrationEventSummaryResponse = {
  id: number;
  scope: CultureScopeResponse;
  sequenceNo: number;
  fromLocation?: string | null;
  toLocation?: string | null;
  migrationTimeText?: string | null;
  founderPersonId?: number | null;
  founderPersonName?: string | null;
  reason?: string | null;
  confidenceLevel: CultureConfidenceLevel;
  privacyLevel: CulturePrivacyLevel;
  sensitiveLevel: CultureSensitiveLevel;
  dataStatus: CultureDataStatus;
  sourceCount: number;
  allowedActions: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type MigrationEventDetailResponse = MigrationEventSummaryResponse & { description?: string | null; sources: CultureSourceSummaryResponse[]; review: CultureReviewSummaryResponse; };

export type MigrationEventPage = {
  items: MigrationEventSummaryResponse[];
  page: CulturePageMetadata;
};

export type CultureSiteCreateRequest = {
  branchId?: number | null;
  siteType: CultureSiteType;
  siteName: string;
  addressText?: string | null;
  foundedPeriod?: string | null;
  currentStatus?: string | null;
  summary?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confidenceLevel: CultureConfidenceLevel;
  privacyLevel: CulturePrivacyLevel;
  sensitiveLevel: CultureSensitiveLevel;
  featuredOnHome?: boolean;
  sortOrder?: number;
};

export type CultureSiteUpdateRequest = CultureSiteCreateRequest & { version: number; };

export type CultureSiteSummaryResponse = {
  id: number;
  scope: CultureScopeResponse;
  siteType: CultureSiteType;
  siteName: string;
  addressText?: string | null;
  foundedPeriod?: string | null;
  currentStatus?: string | null;
  summary?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confidenceLevel: CultureConfidenceLevel;
  privacyLevel: CulturePrivacyLevel;
  sensitiveLevel: CultureSensitiveLevel;
  dataStatus: CultureDataStatus;
  featuredOnHome: boolean;
  sortOrder: number;
  sourceCount: number;
  attachmentCount: number;
  allowedActions: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CultureSiteDetailResponse = CultureSiteSummaryResponse & { description?: string | null; sources: CultureSourceSummaryResponse[]; attachments: CultureAttachmentSummaryResponse[]; review: CultureReviewSummaryResponse; };

export type CultureSitePage = {
  items: CultureSiteSummaryResponse[];
  page: CulturePageMetadata;
};

export type CultureOverviewStatistics = {
  officialItemCount: number;
  pendingReviewCount: number;
  sourceCoverageRate: number;
};

export type CultureOverviewResponse = {
  clanId: number;
  clanName: string;
  statistics: CultureOverviewStatistics;
  featuredItems: CultureItemSummaryResponse[];
  migrationHighlights: MigrationEventSummaryResponse[];
  siteHighlights: CultureSiteSummaryResponse[];
  missingHints: string[];
};

export type CultureSubmitReviewRequest = {
  comment?: string | null;
};

export type CultureArchiveRequest = {
  reason: string;
};

export type CultureCommandResponse = {
  targetType: GenealogyTargetType;
  targetId: number;
  status: string;
  reviewTaskId?: number | null;
  message?: string | null;
};
