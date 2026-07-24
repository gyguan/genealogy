export type WorkspaceContext = {
  clanId: string;
  branchId: string;
  personId: string;
  relationshipId: string;
  sourceId: string;
  attachmentId: string;
  reviewTaskId: string;
};

export const defaultWorkspace: WorkspaceContext = {
  clanId: '',
  branchId: '',
  personId: '',
  relationshipId: '',
  sourceId: '',
  attachmentId: '',
  reviewTaskId: ''
};

export type WorkspaceUpdater = (patch: Partial<WorkspaceContext>) => void;

export type FeatureProps = {

  workspace: WorkspaceContext;
  updateWorkspace: WorkspaceUpdater;
};
