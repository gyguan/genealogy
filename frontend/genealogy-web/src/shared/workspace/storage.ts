import { defaultWorkspace, WorkspaceContext } from './types';

const KEY = 'genealogy.workspace';

export function loadWorkspace(): WorkspaceContext {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWorkspace;
    return { ...defaultWorkspace, ...JSON.parse(raw) };
  } catch {
    return defaultWorkspace;
  }
}

export function saveWorkspace(workspace: WorkspaceContext) {
  localStorage.setItem(KEY, JSON.stringify(workspace));
}
