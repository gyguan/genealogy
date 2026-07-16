/* eslint-disable */
/**
 * Auto-generated home-dashboard DTOs from the effective OpenAPI contract.
 * Do not edit manually.
 */

export type HomeDashboardBucketResponse = {
  key: string;
  label: string;
  count: number;
};

export type HomeDashboardCompletenessResponse = {
  generationMaintainedCount: number;
  generationMaintainedRate: number;
  vitalDatesMaintainedCount: number;
  vitalDatesMaintainedRate: number;
  biographyMaintainedCount: number;
  biographyMaintainedRate: number;
};

export type HomeDashboardBranchCoverageResponse = {
  coveredBranchCount: number;
  totalBranchCount: number;
  coverageRate: number;
};

export type HomeDashboardTrendPointResponse = {
  date: string;
  peopleCreatedCount: number;
  sourceCreatedCount: number;
  reviewCompletedCount: number;
};

export type HomeDashboardRiskResponse = {
  key: string;
  label: string;
  count: number;
  severity: string;
  reason: string;
  targetView: string;
  targetQuery: string;
};

export type HomeDashboardActivityResponse = {
  type: string;
  action: string;
  objectName: string;
  actorName: string;
  occurredAt: string;
  status: string;
  targetView: string;
  targetQuery: string;
};

export type HomeDashboardResponse = {
  clanId: number;
  asOf: string;
  peopleTotal: number;
  branchCount: number;
  sourceCount: number;
  pendingReviewCount: number;
  genderDistribution: HomeDashboardBucketResponse[];
  livingDistribution: HomeDashboardBucketResponse[];
  generationDistribution: HomeDashboardBucketResponse[];
  branchDistribution: HomeDashboardBucketResponse[];
  sourceTypeDistribution: HomeDashboardBucketResponse[];
  completeness: HomeDashboardCompletenessResponse;
  branchCoverage: HomeDashboardBranchCoverageResponse;
  trendPoints: HomeDashboardTrendPointResponse[];
  risks: HomeDashboardRiskResponse[];
  recentActivities: HomeDashboardActivityResponse[];
};
