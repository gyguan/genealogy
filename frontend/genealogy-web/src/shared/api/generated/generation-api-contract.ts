/* eslint-disable */
/**
 * Auto-generated Generation API operations from docs/api/openapi.generation.json.
 * Do not edit manually.
 */

export const GENERATION_API_OPERATIONS = {
  "DELETE /api/v1/generation-schemes/{schemeId}": {
    "operationId": "deleteGenerationScheme",
    "method": "DELETE",
    "path": "/api/v1/generation-schemes/{schemeId}",
    "pathParams": [
      "schemeId"
    ],
    "queryParams": []
  }
} as const;

export type GenerationApiOperation = keyof typeof GENERATION_API_OPERATIONS;
export type GenerationApiPath<K extends GenerationApiOperation = GenerationApiOperation> = typeof GENERATION_API_OPERATIONS[K]['path'];
export type GenerationApiPathParamName<K extends GenerationApiOperation> = typeof GENERATION_API_OPERATIONS[K]['pathParams'][number];
export type GenerationApiPathParams<K extends GenerationApiOperation> = [GenerationApiPathParamName<K>] extends [never]
  ? never
  : Record<GenerationApiPathParamName<K>, string | number>;
