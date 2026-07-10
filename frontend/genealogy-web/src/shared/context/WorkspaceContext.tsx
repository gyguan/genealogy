import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type WorkspaceState = {
  clanId: string;
  branchId: string;
  personId: string;
  relationshipId: string;
  sourceId: string;
  sourceFocusReason: string;
  attachmentId: string;
  reviewTaskId: string;
  setClanId: (value: string) => void;
  setBranchId: (value: string) => void;
  setPersonId: (value: string) => void;
  setRelationshipId: (value: string) => void;
  setSourceId: (value: string) => void;
  setSourceFocusReason: (value: string) => void;
  setAttachmentId: (value: string) => void;
  setReviewTaskId: (value: string) => void;
  patch: (values: Partial<Pick<WorkspaceState, 'clanId' | 'branchId' | 'personId' | 'relationshipId' | 'sourceId' | 'sourceFocusReason' | 'attachmentId' | 'reviewTaskId'>>) => void;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

const CLAN_ID_STORAGE_KEY = 'genealogy.workspace.clanId';

function loadClanId() {
  return localStorage.getItem(CLAN_ID_STORAGE_KEY) || '';
}

function saveClanId(value: string) {
  localStorage.setItem(CLAN_ID_STORAGE_KEY, value || '');
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [clanId, updateClanId] = useState(loadClanId);
  const [branchId, updateBranchId] = useState('');
  const [personId, updatePersonId] = useState('');
  const [relationshipId, updateRelationshipId] = useState('');
  const [sourceId, updateSourceId] = useState('');
  const [sourceFocusReason, updateSourceFocusReason] = useState('');
  const [attachmentId, updateAttachmentId] = useState('');
  const [reviewTaskId, updateReviewTaskId] = useState('');

  function setClanId(value: string) { updateClanId(value); saveClanId(value); }
  function setBranchId(value: string) { updateBranchId(value); }
  function setPersonId(value: string) { updatePersonId(value); }
  function setRelationshipId(value: string) { updateRelationshipId(value); }
  function setSourceId(value: string) { updateSourceId(value); }
  function setSourceFocusReason(value: string) { updateSourceFocusReason(value); }
  function setAttachmentId(value: string) { updateAttachmentId(value); }
  function setReviewTaskId(value: string) { updateReviewTaskId(value); }

  const value = useMemo<WorkspaceState>(() => ({
    clanId,
    branchId,
    personId,
    relationshipId,
    sourceId,
    sourceFocusReason,
    attachmentId,
    reviewTaskId,
    setClanId,
    setBranchId,
    setPersonId,
    setRelationshipId,
    setSourceId,
    setSourceFocusReason,
    setAttachmentId,
    setReviewTaskId,
    patch: values => {
      if (values.clanId !== undefined) setClanId(values.clanId);
      if (values.branchId !== undefined) setBranchId(values.branchId);
      if (values.personId !== undefined) setPersonId(values.personId);
      if (values.relationshipId !== undefined) setRelationshipId(values.relationshipId);
      if (values.sourceId !== undefined) setSourceId(values.sourceId);
      if (values.sourceFocusReason !== undefined) setSourceFocusReason(values.sourceFocusReason);
      if (values.attachmentId !== undefined) setAttachmentId(values.attachmentId);
      if (values.reviewTaskId !== undefined) setReviewTaskId(values.reviewTaskId);
    }
  }), [clanId, branchId, personId, relationshipId, sourceId, sourceFocusReason, attachmentId, reviewTaskId]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return value;
}
