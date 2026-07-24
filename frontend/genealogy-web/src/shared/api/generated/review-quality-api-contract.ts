/* eslint-disable */
/** Auto-generated from docs/api/openapi.review-quality.json. Do not edit manually. */
export const REVIEW_QUALITY_API_OPERATIONS = {
  "GET /api/v1/clans/{clanId}/review-quality-checks/{checkId}": {
    "operationId": "getReviewQualityCheck",
    "method": "GET",
    "path": "/api/v1/clans/{clanId}/review-quality-checks/{checkId}",
    "pathParams": ["checkId", "clanId"],
    "queryParams": [],
    "requestBody": null,
    "response": "ApiResponseReviewQualityCheckResponse"
  },
  "GET /api/v1/clans/{clanId}/review-tasks/{reviewTaskId}/quality-check": {
    "operationId": "getLatestReviewTaskQualityCheck",
    "method": "GET",
    "path": "/api/v1/clans/{clanId}/review-tasks/{reviewTaskId}/quality-check",
    "pathParams": ["clanId", "reviewTaskId"],
    "queryParams": [],
    "requestBody": null,
    "response": "ApiResponseReviewQualityCheckResponse"
  },
  "POST /api/v1/clans/{clanId}/review-quality-checks": {
    "operationId": "triggerReviewQualityCheck",
    "method": "POST",
    "path": "/api/v1/clans/{clanId}/review-quality-checks",
    "pathParams": ["clanId"],
    "queryParams": [],
    "requestBody": "ReviewQualityCheckTriggerRequest",
    "response": "ApiResponseReviewQualityCheckAcceptedResponse"
  }
} as const;
export type ReviewQualityApiOperation = keyof typeof REVIEW_QUALITY_API_OPERATIONS;
