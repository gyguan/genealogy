export type ImportValidationStatus = 'valid' | 'warning' | 'duplicate' | 'error';

export type ImportPreviewRowBase = {
  rowNo?: number;
  validationStatus?: ImportValidationStatus;
  warningMessages?: string[];
  duplicated?: boolean;
  errorMessage?: string;
  rawData?: string;
};

export type ImportPreviewResult<Row extends ImportPreviewRowBase = ImportPreviewRowBase> = {
  templateVersion?: string;
  totalCount?: number;
  validCount?: number;
  warningCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  rows?: Row[];
};

export function importValidationStatus(row: ImportPreviewRowBase): ImportValidationStatus {
  if (row.validationStatus) return row.validationStatus;
  if (row.duplicated) return 'duplicate';
  if (row.errorMessage) return 'error';
  return 'valid';
}

export function importPreviewCounts<Row extends ImportPreviewRowBase>(preview?: ImportPreviewResult<Row> | null) {
  const rows = preview?.rows || [];
  if (rows.length) {
    const counts = { valid: 0, warning: 0, duplicate: 0, error: 0 };
    rows.forEach(row => { counts[importValidationStatus(row)] += 1; });
    return { total: rows.length, ...counts };
  }
  return {
    total: Number(preview?.totalCount || 0),
    valid: Number(preview?.validCount || 0),
    warning: Number(preview?.warningCount || 0),
    duplicate: Number(preview?.duplicateCount || 0),
    error: Number(preview?.errorCount || 0)
  };
}

export function filterImportPreviewRows<Row extends ImportPreviewRowBase>(
  rows: Row[] | undefined,
  filter: 'all' | ImportValidationStatus
) {
  if (filter === 'all') return rows || [];
  return (rows || []).filter(row => importValidationStatus(row) === filter);
}

export function importPreviewMessage(row: ImportPreviewRowBase) {
  if (row.errorMessage) return row.errorMessage;
  if (row.warningMessages?.length) return row.warningMessages.join('；');
  if (importValidationStatus(row) === 'duplicate') return '发现疑似重复数据，请核对后确认。';
  return '';
}
