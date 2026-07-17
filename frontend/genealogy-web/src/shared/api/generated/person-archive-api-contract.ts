/* eslint-disable */
/**
 * Auto-generated Person Archive API operations from docs/api/openapi.person-archive-query.json.
 * Do not edit manually.
 */

export const PERSON_ARCHIVE_API_OPERATIONS = {
  "GET /api/v1/clans/{clanId}/exports/persons/search.csv": {
    "operationId": "exportPersonSearchResult",
    "method": "GET",
    "path": "/api/v1/clans/{clanId}/exports/persons/search.csv",
    "pathParams": [
      "clanId"
    ],
    "queryParams": [
      "branchId",
      "dataStatus",
      "gender",
      "generationNo",
      "generationWord",
      "keyword",
      "name",
      "sort"
    ],
    "response": null
  },
  "GET /api/v1/persons/search": {
    "operationId": "searchPersons",
    "method": "GET",
    "path": "/api/v1/persons/search",
    "pathParams": [],
    "queryParams": [
      "branchId",
      "clanId",
      "dataStatus",
      "gender",
      "generationNo",
      "generationWord",
      "keyword",
      "name",
      "pageNo",
      "pageSize",
      "sort"
    ],
    "response": "ApiResponsePersonArchivePage"
  }
} as const;

export type PersonArchiveApiOperation = keyof typeof PERSON_ARCHIVE_API_OPERATIONS;
export type PersonArchiveApiPath<K extends PersonArchiveApiOperation = PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['path'];
export type PersonArchiveApiPathParamName<K extends PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['pathParams'][number];
export type PersonArchiveApiQueryParamName<K extends PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['queryParams'][number];
export type PersonArchiveApiPathParams<K extends PersonArchiveApiOperation> = [PersonArchiveApiPathParamName<K>] extends [never] ? never : Record<PersonArchiveApiPathParamName<K>, string | number>;
export type PersonArchiveApiQueryParams<K extends PersonArchiveApiOperation> = [PersonArchiveApiQueryParamName<K>] extends [never] ? never : Partial<Record<PersonArchiveApiQueryParamName<K>, string | number | boolean | readonly string[] | undefined>>;
export type PersonArchiveApiResponseSchema<K extends PersonArchiveApiOperation> = typeof PERSON_ARCHIVE_API_OPERATIONS[K]['response'];
