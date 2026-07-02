import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type WorkspaceState = {
  clanId: string;
  branchId: string;
  personId: string;
  relationshipId: string;
  sourceId: string;
  attachmentId: string;
  reviewTaskId: string;
  setClanId: (value: string) => void;
  setBranchId: (value: string) => void;
  setPersonId: (value: string) => void;
  setRelationshipId: (value: string) => void;
  setSourceId: (value: string) => void;
  setAttachmentId: (value: string) => void;
  setReviewTaskId: (value: string) => void;
  patch: (values: Partial<Pick<WorkspaceState, 'clanId' | 'branchId' | 'personId' | 'relationshipId' | 'sourceId' | 'attachmentId' | 'reviewTaskId'>>) => void;
};

declare global {
  interface Window {
    __genealogyWorkspace?: WorkspaceState;
  }
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

function load(key: string) {
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function save(key: string, value: string) {
  localStorage.setItem(`genealogy.workspace.${key}`, value || '');
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [clanId, updateClanId] = useState(load('clanId'));
  const [branchId, updateBranchId] = useState(load('branchId'));
  const [personId, updatePersonId] = useState(load('personId'));
  const [relationshipId, updateRelationshipId] = useState(load('relationshipId'));
  const [sourceId, updateSourceId] = useState(load('sourceId'));
  const [attachmentId, updateAttachmentId] = useState(load('attachmentId'));
  const [reviewTaskId, updateReviewTaskId] = useState(load('reviewTaskId'));

  function setClanId(value: string) { updateClanId(value); save('clanId', value); }
  function setBranchId(value: string) { updateBranchId(value); save('branchId', value); }
  function setPersonId(value: string) { updatePersonId(value); save('personId', value); }
  function setRelationshipId(value: string) { updateRelationshipId(value); save('relationshipId', value); }
  function setSourceId(value: string) { updateSourceId(value); save('sourceId', value); }
  function setAttachmentId(value: string) { updateAttachmentId(value); save('attachmentId', value); }
  function setReviewTaskId(value: string) { updateReviewTaskId(value); save('reviewTaskId', value); }

  const value = useMemo<WorkspaceState>(() => ({
    clanId,
    branchId,
    personId,
    relationshipId,
    sourceId,
    attachmentId,
    reviewTaskId,
    setClanId,
    setBranchId,
    setPersonId,
    setRelationshipId,
    setSourceId,
    setAttachmentId,
    setReviewTaskId,
    patch: values => {
      if (values.clanId !== undefined) setClanId(values.clanId);
      if (values.branchId !== undefined) setBranchId(values.branchId);
      if (values.personId !== undefined) setPersonId(values.personId);
      if (values.relationshipId !== undefined) setRelationshipId(values.relationshipId);
      if (values.sourceId !== undefined) setSourceId(values.sourceId);
      if (values.attachmentId !== undefined) setAttachmentId(values.attachmentId);
      if (values.reviewTaskId !== undefined) setReviewTaskId(values.reviewTaskId);
    }
  }), [clanId, branchId, personId, relationshipId, sourceId, attachmentId, reviewTaskId]);

  useEffect(() => {
    window.__genealogyWorkspace = value;
    return () => {
      if (window.__genealogyWorkspace === value) delete window.__genealogyWorkspace;
    };
  }, [value]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return value;
}
