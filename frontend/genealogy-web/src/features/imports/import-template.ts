import { apiClient } from '../../shared/api/client';
import { saveDownloadedBlob } from '../../shared/utils/download';
import type { ImportFileFormat, ImportTypeKey } from './import-type-registry';

export const IMPORT_TEMPLATE_VERSION = '2026.07';
export const IMPORT_TEMPLATE_UPDATED_AT = '2026-07-16';

const templateSlugs: Partial<Record<ImportTypeKey, string>> = {
  person: 'persons',
  relationship: 'relationships',
  source: 'sources'
};

export function importTemplateSlug(type: ImportTypeKey) {
  return templateSlugs[type] || '';
}

export async function downloadImportTemplate(templateSlug: string, format: ImportFileFormat) {
  const blob = await apiClient.download(`/imports/templates/${templateSlug}.${format}`);
  saveDownloadedBlob(blob, `${templateSlug}-import-template-${IMPORT_TEMPLATE_VERSION}.${format}`);
}
