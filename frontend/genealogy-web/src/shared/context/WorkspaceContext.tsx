import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type WorkspaceState = {
  clanId: string;
  branchId: string;
  personId: string;
  setClanId: (value: string) => void;
  setBranchId: (value: string) => void;
  setPersonId: (value: string) => void;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [clanId, updateClanId] = useState(localStorage.getItem('genealogy.workspace.clanId') || '');
  const [branchId, updateBranchId] = useState(localStorage.getItem('genealogy.workspace.branchId') || '');
  const [personId, updatePersonId] = useState(localStorage.getItem('genealogy.workspace.personId') || '');

  const value = useMemo<WorkspaceState>(() => ({
    clanId,
    branchId,
    personId,
    setClanId: value => {
      updateClanId(value);
      localStorage.setItem('genealogy.workspace.clanId', value);
    },
    setBranchId: value => {
      updateBranchId(value);
      localStorage.setItem('genealogy.workspace.branchId', value);
    },
    setPersonId: value => {
      updatePersonId(value);
      localStorage.setItem('genealogy.workspace.personId', value);
    }
  }), [clanId, branchId, personId]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return value;
}
