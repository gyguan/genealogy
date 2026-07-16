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
