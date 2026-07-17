/* eslint-disable */
/**
 * Auto-generated Workbench API operations from docs/api/openapi.workbench-query.json.
 * Do not edit manually.
 */

export const WORKBENCH_API_OPERATIONS = {
  "GET /api/v1/workbench/tasks": {
    "operationId": "listWorkbenchTasks",
    "method": "GET",
    "path": "/api/v1/workbench/tasks",
    "pathParams": [],
    "queryParams": [
      "branchId",
      "clanId",
      "createdFrom",
      "createdTo",
      "creator",
      "keyword",
      "pageNo",
      "pageSize",
      "risk",
      "status",
      "taskName",
      "type"
    ],
    "response": "ApiResponseWorkbenchTaskPage"
  }
} as const;

export type WorkbenchApiOperation = keyof typeof WORKBENCH_API_OPERATIONS;
export type WorkbenchApiPath<K extends WorkbenchApiOperation = WorkbenchApiOperation> = typeof WORKBENCH_API_OPERATIONS[K]['path'];
export type WorkbenchApiQueryParamName<K extends WorkbenchApiOperation> = typeof WORKBENCH_API_OPERATIONS[K]['queryParams'][number];
export type WorkbenchApiQueryParams<K extends WorkbenchApiOperation> = [WorkbenchApiQueryParamName<K>] extends [never] ? never : Partial<Record<WorkbenchApiQueryParamName<K>, string | number | boolean | readonly string[] | undefined>>;
export type WorkbenchApiResponseSchema<K extends WorkbenchApiOperation> = typeof WORKBENCH_API_OPERATIONS[K]['response'];
