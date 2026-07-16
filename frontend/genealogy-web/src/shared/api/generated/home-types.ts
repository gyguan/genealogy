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
  completeness: HomeDashboardCompletenessResponse;
  branchCoverage: HomeDashboardBranchCoverageResponse;
};
