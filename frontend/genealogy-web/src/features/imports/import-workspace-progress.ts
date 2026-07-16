export type ImportWorkspaceProgress = {
  hasFile: boolean;
  previewReady: boolean;
  batchCreated: boolean;
};

export const emptyImportWorkspaceProgress: ImportWorkspaceProgress = {
  hasFile: false,
  previewReady: false,
  batchCreated: false
};

export function importStepIndex(branchSelected: boolean, progress: ImportWorkspaceProgress) {
  if (!branchSelected) return 0;
  if (!progress.hasFile) return 1;
  if (!progress.previewReady) return 2;
  return 3;
}

export function canCreateImportBatch(options: {
  branchSelected: boolean;
  hasFile: boolean;
  previewReady: boolean;
  errorCount: number;
  duplicateCount: number;
  duplicatesConfirmed: boolean;
}) {
  return options.branchSelected
    && options.hasFile
    && options.previewReady
    && options.errorCount === 0
    && (options.duplicateCount === 0 || options.duplicatesConfirmed);
}
