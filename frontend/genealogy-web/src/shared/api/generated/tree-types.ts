/* eslint-disable */
/**
 * Auto-generated Tree DTOs from docs/api/openapi.tree.json.
 * Do not edit manually.
 */

export type TreeDirection = "family" | "ancestors" | "descendants" | "both";

export type TreeDataView = "official" | "editing";

export type TreeRelationScope = "blood" | "ritual" | "marriage" | "status";

export type TreeNodeVisibility = "visible" | "masked";

export type TreeEdgeVisibility = "visible" | "masked";

export type TreeMaskReason = "privacy_restricted" | "branch_scope_restricted" | "status_restricted";

export type TreeRelationCategory = "blood" | "ritual" | "marriage" | "status";

export type TreeRelationType = "parent_child" | "spouse" | "adoptive" | "successor" | "out_adoption" | "in_adoption" | "dual_successor" | "heir_son" | "no_descendant" | "other";

export type TreeRitualRelationType = "adoptive" | "successor" | "out_adoption" | "in_adoption" | "dual_successor" | "heir_son" | "no_descendant" | "other";

export type TreeDataStatus = "draft" | "pending_review" | "official" | "rejected" | "archived";

export type TreePrivacyLevel = "public" | "clan_only" | "branch_only" | "relatives_only" | "private" | "sealed";

export type TreeConfidenceLevel = "high" | "medium" | "low" | "unknown";

export type TreeReviewState = "none" | "pending" | "approved" | "rejected" | "mixed";

export type TreeRiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type TreeAnomalyCode = "generation_mismatch" | "relationship_conflict" | "possible_duplicate" | "missing_source" | "isolated_person" | "other";

export type TreeWarningCode = "cycle_detected" | "duplicate_edge" | "depth_limit_reached" | "node_limit_reached" | "edge_limit_reached" | "root_filtered" | "partial_visibility" | "isolated_nodes";

export type TreeTruncationReason = "max_depth" | "max_nodes" | "max_edges";

export type TreeEvidenceSummary = {
  bindingCount: number;
  officialBindingCount: number;
  confidenceLevel?: TreeConfidenceLevel;
  missingOfficialEvidence: boolean;
};

export type TreeReviewSummary = {
  state: TreeReviewState;
  pendingTaskCount: number;
  rejectedTaskCount: number;
};

export type TreeAnomalySummary = {
  codes: TreeAnomalyCode[];
  count: number;
  highestRisk: TreeRiskLevel;
};

export type TreeNodeResponse = {
  nodeId: string;
  personId?: number | null;
  displayName: string;
  visibility: TreeNodeVisibility;
  maskReason?: TreeMaskReason;
  gender?: "male" | "female" | "unknown";
  generationNo?: number;
  generationWord?: string;
  branchId?: number;
  branchName?: string;
  birthText?: string;
  deathText?: string;
  dataStatus?: TreeDataStatus;
  privacyLevel?: TreePrivacyLevel;
  evidenceSummary?: TreeEvidenceSummary;
  reviewSummary?: TreeReviewSummary;
  anomalySummary?: TreeAnomalySummary;
};

export type TreeEdgeResponse = {
  edgeId: string;
  relationshipId?: number | null;
  fromNodeId: string;
  toNodeId: string;
  relationType: TreeRelationType;
  relationLabel?: string;
  relationCategory: TreeRelationCategory;
  ritualRelationType?: TreeRitualRelationType;
  visibility: TreeEdgeVisibility;
  isLineageRelation?: boolean;
  isBiological?: boolean;
  isPrimary?: boolean;
  dataStatus?: TreeDataStatus;
  confidenceLevel?: TreeConfidenceLevel;
  evidenceSummary?: TreeEvidenceSummary;
  reviewSummary?: TreeReviewSummary;
  anomalySummary?: TreeAnomalySummary;
};

export type TreeGraphWarning = {
  code: TreeWarningCode;
  message: string;
  count: number;
};

export type TreeGraphMeta = {
  requestedDepth: number;
  appliedDepth: number;
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
  truncationReasons: TreeTruncationReason[];
  cycleDetected: boolean;
  duplicateEdgeCount: number;
  generatedAt: string;
};

export type TreeGraphResponse = {
  rootNodeId: string | null;
  direction: TreeDirection;
  dataView: TreeDataView;
  nodes: TreeNodeResponse[];
  edges: TreeEdgeResponse[];
  meta: TreeGraphMeta;
  warnings: TreeGraphWarning[];
};

export type ApiResponseTreeGraphResponse = {
  success: boolean;
  code: string;
  message: string;
  data: TreeGraphResponse;
  traceId: string;
};

export type TreeErrorResponse = {
  success: false;
  code: string;
  message: string;
  traceId: string;
};
