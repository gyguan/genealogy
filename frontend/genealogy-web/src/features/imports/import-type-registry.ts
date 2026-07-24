export type ImportTypeKey = 'person' | 'relationship' | 'generation' | 'source';
export type ImportFileFormat = 'csv' | 'xlsx';

export type ImportTypeDefinition = {
  key: ImportTypeKey;
  title: string;
  description: string;
  availability: 'available' | 'planned';
  supportedFormats: ImportFileFormat[];
  templateDefinition: string;
  parser: string;
  rowValidator: string;
  correctionSchema: string;
  draftCreator: string;
  reviewApplyHandler: string;
};

export const importTypeRegistry: ImportTypeDefinition[] = [
  {
    key: 'person',
    title: '人物导入',
    description: '批量导入人物基础信息，支持预览、查重、失败行修正和审核入谱。',
    availability: 'available',
    supportedFormats: ['csv', 'xlsx'],
    templateDefinition: 'PersonImportTemplateDefinition',
    parser: 'person-import-parser',
    rowValidator: 'person-import-validator',
    correctionSchema: 'PersonImportRowRetryRequest',
    draftCreator: 'person-draft-creator',
    reviewApplyHandler: 'person-import-review-apply'
  },
  {
    key: 'relationship',
    title: '人物关系导入',
    description: '批量建立父子、母子和配偶关系，支持严格模板、失败行修正和审核生效。',
    availability: 'available',
    supportedFormats: ['csv', 'xlsx'],
    templateDefinition: 'RelationshipImportTemplateDefinition',
    parser: 'relationship-import-parser',
    rowValidator: 'relationship-import-validator',
    correctionSchema: 'RelationshipImportRowRetryRequest',
    draftCreator: 'relationship-draft-creator',
    reviewApplyHandler: 'relationship-import-review-apply'
  },
  {
    key: 'generation',
    title: '字辈导入',
    description: '批量维护世次与字辈映射。',
    availability: 'planned',
    supportedFormats: ['csv', 'xlsx'],
    templateDefinition: 'GenerationImportTemplateDefinition',
    parser: 'generation-import-parser',
    rowValidator: 'generation-import-validator',
    correctionSchema: 'GenerationImportRowRetryRequest',
    draftCreator: 'generation-draft-creator',
    reviewApplyHandler: 'generation-import-review-apply'
  },
  {
    key: 'source',
    title: '来源资料导入',
    description: '批量登记谱书、地方志、照片和口述记录等来源资料元数据，附件和引用绑定后续单独处理。',
    availability: 'available',
    supportedFormats: ['csv', 'xlsx'],
    templateDefinition: 'SourceImportTemplateDefinition',
    parser: 'source-import-parser',
    rowValidator: 'source-import-validator',
    correctionSchema: 'SourceImportRowRetryRequest',
    draftCreator: 'source-draft-creator',
    reviewApplyHandler: 'source-import-review-apply'
  }
];

export const importTypeOptions = importTypeRegistry.map(item => ({ value: item.key, label: item.title }));

export const importFileFormatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' }
] as const;

export function importTypeText(value?: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/_(csv|xlsx)$/, '') as ImportTypeKey;
  return importTypeRegistry.find(item => item.key === normalized)?.title || value || '-';
}

export function importFileFormatText(value?: string, legacyImportType?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'csv') return 'CSV';
  if (normalized === 'xlsx') return 'Excel';
  const legacy = String(legacyImportType || '').trim().toLowerCase();
  if (legacy.endsWith('_xlsx')) return 'Excel';
  if (legacy.endsWith('_csv')) return 'CSV';
  return '-';
}

