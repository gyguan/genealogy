/* eslint-disable */
/**
 * Auto-generated Tree API operations from docs/api/openapi.tree.json.
 * Do not edit manually.
 */

export const TREE_API_OPERATIONS = {
  "GET /api/v1/tree/ancestors": {
    "operationId": "getPersonAncestorGraph",
    "method": "GET",
    "path": "/api/v1/tree/ancestors",
    "pathParams": [],
    "queryParams": [
      "dataView",
      "maxDepth",
      "maxEdges",
      "maxNodes",
      "personId",
      "relationScopes"
    ],
    "requestBody": null,
    "response": "ApiResponseTreeGraphResponse",
    "deprecated": true
  },
  "GET /api/v1/tree/clans/{clanId}/branches/{branchId}/lineage": {
    "operationId": "getBranchLineageGraph",
    "method": "GET",
    "path": "/api/v1/tree/clans/{clanId}/branches/{branchId}/lineage",
    "pathParams": [
      "branchId",
      "clanId"
    ],
    "queryParams": [
      "dataView",
      "includeSubBranches",
      "maxDepth",
      "maxEdges",
      "maxNodes",
      "relationScopes"
    ],
    "requestBody": null,
    "response": "ApiResponseTreeGraphResponse",
    "deprecated": false
  },
  "GET /api/v1/tree/descendants": {
    "operationId": "getPersonDescendantGraph",
    "method": "GET",
    "path": "/api/v1/tree/descendants",
    "pathParams": [],
    "queryParams": [
      "dataView",
      "maxDepth",
      "maxEdges",
      "maxNodes",
      "relationScopes",
      "rootPersonId"
    ],
    "requestBody": null,
    "response": "ApiResponseTreeGraphResponse",
    "deprecated": true
  },
  "GET /api/v1/tree/person/{personId}": {
    "operationId": "getPersonLineageGraph",
    "method": "GET",
    "path": "/api/v1/tree/person/{personId}",
    "pathParams": [
      "personId"
    ],
    "queryParams": [
      "dataView",
      "direction",
      "maxDepth",
      "maxEdges",
      "maxNodes",
      "relationScopes"
    ],
    "requestBody": null,
    "response": "ApiResponseTreeGraphResponse",
    "deprecated": false
  },
  "GET /api/v1/tree/person/{personId}/family": {
    "operationId": "getPersonFamilyGraph",
    "method": "GET",
    "path": "/api/v1/tree/person/{personId}/family",
    "pathParams": [
      "personId"
    ],
    "queryParams": [
      "dataView",
      "maxEdges",
      "maxNodes",
      "relationScopes"
    ],
    "requestBody": null,
    "response": "ApiResponseTreeGraphResponse",
    "deprecated": true
  }
} as const;

export type TreeApiOperation = keyof typeof TREE_API_OPERATIONS;
export type TreeApiMethod<K extends TreeApiOperation = TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['method'];
export type TreeApiPath<K extends TreeApiOperation = TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['path'];
export type TreeApiPathParamName<K extends TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['pathParams'][number];
export type TreeApiQueryParamName<K extends TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['queryParams'][number];
export type TreeApiPathParams<K extends TreeApiOperation> = [TreeApiPathParamName<K>] extends [never] ? never : Record<TreeApiPathParamName<K>, string | number>;
export type TreeApiQueryParams<K extends TreeApiOperation> = [TreeApiQueryParamName<K>] extends [never] ? never : Partial<Record<TreeApiQueryParamName<K>, string | number | boolean | readonly string[] | undefined>>;
export type TreeApiResponseSchema<K extends TreeApiOperation> = typeof TREE_API_OPERATIONS[K]['response'];
