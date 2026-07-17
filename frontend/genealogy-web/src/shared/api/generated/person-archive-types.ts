/* eslint-disable */
/**
 * Auto-generated Person Archive DTOs from docs/api/openapi.person-archive-query.json.
 * Do not edit manually.
 */

export type PersonArchiveItem = { id?: number; clanId?: number; branchId?: number | null; name?: string; aliasName?: string | null; gender?: string; generationNo?: number | null; generationWord?: string | null; birthDate?: string | null; deathDate?: string | null; isLiving?: boolean | null; dataStatus?: string; };

export type PersonArchivePage = { records?: PersonArchiveItem[]; total?: number; pageNo?: number; pageSize?: number; };

export type ApiResponsePersonArchivePage = { success?: boolean; data?: PersonArchivePage; message?: string | null; };
