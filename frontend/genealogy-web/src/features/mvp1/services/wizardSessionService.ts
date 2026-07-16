import type { Mvp1StepKey } from '../domain/wizardStepState';

export const WIZARD_SESSION_VERSION = 1;
export const WIZARD_SESSION_STORAGE_KEY = 'genealogy.mvp1Wizard.session';

export type WizardControlDraft = string | boolean;
export type WizardStepDraft = Record<string, WizardControlDraft>;

export type WizardSession = {
  version: number;
  savedAt: string;
  activeStep: Mvp1StepKey;
  workspace: {
    clanId: string;
    branchId: string;
    personId: string;
    relationshipId: string;
    sourceId: string;
    reviewTaskId: string;
  };
  skipped: {
    relationship: boolean;
    source: boolean;
  };
  drafts: Partial<Record<Mvp1StepKey, WizardStepDraft>>;
};

const STEP_KEYS: Mvp1StepKey[] = ['clan', 'branch', 'generation', 'person', 'relationship', 'source', 'review'];

export function isWizardStepKey(value: unknown): value is Mvp1StepKey {
  return typeof value === 'string' && STEP_KEYS.includes(value as Mvp1StepKey);
}

export function readWizardStepFromUrl(url: URL): Mvp1StepKey | undefined {
  const value = url.searchParams.get('step');
  return isWizardStepKey(value) ? value : undefined;
}

export function writeWizardStepToUrl(url: URL, step: Mvp1StepKey): string {
  const next = new URL(url.toString());
  next.searchParams.set('view', 'mvp1Wizard');
  next.searchParams.set('step', step);
  return `${next.pathname}${next.search}${next.hash}`;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function validDrafts(value: unknown): WizardSession['drafts'] {
  if (!value || typeof value !== 'object') return {};
  const drafts: WizardSession['drafts'] = {};
  for (const step of STEP_KEYS) {
    const candidate = (value as Record<string, unknown>)[step];
    if (!candidate || typeof candidate !== 'object') continue;
    const fields: WizardStepDraft = {};
    for (const [key, fieldValue] of Object.entries(candidate as Record<string, unknown>)) {
      if (typeof fieldValue === 'string' || typeof fieldValue === 'boolean') fields[key] = fieldValue;
    }
    drafts[step] = fields;
  }
  return drafts;
}

export function parseWizardSession(raw: string | null): WizardSession | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Record<string, any>;
    if (value.version !== WIZARD_SESSION_VERSION || !isWizardStepKey(value.activeStep)) return undefined;
    return {
      version: WIZARD_SESSION_VERSION,
      savedAt: stringValue(value.savedAt),
      activeStep: value.activeStep,
      workspace: {
        clanId: stringValue(value.workspace?.clanId),
        branchId: stringValue(value.workspace?.branchId),
        personId: stringValue(value.workspace?.personId),
        relationshipId: stringValue(value.workspace?.relationshipId),
        sourceId: stringValue(value.workspace?.sourceId),
        reviewTaskId: stringValue(value.workspace?.reviewTaskId)
      },
      skipped: {
        relationship: Boolean(value.skipped?.relationship),
        source: Boolean(value.skipped?.source)
      },
      drafts: validDrafts(value.drafts)
    };
  } catch {
    return undefined;
  }
}

export interface WizardSessionStore {
  load(): WizardSession | undefined;
  save(session: WizardSession): void;
  clear(): void;
}

export function createLocalWizardSessionStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): WizardSessionStore {
  return {
    load() {
      const session = parseWizardSession(storage.getItem(WIZARD_SESSION_STORAGE_KEY));
      if (!session && storage.getItem(WIZARD_SESSION_STORAGE_KEY)) storage.removeItem(WIZARD_SESSION_STORAGE_KEY);
      return session;
    },
    save(session) {
      storage.setItem(WIZARD_SESSION_STORAGE_KEY, JSON.stringify(session));
    },
    clear() {
      storage.removeItem(WIZARD_SESSION_STORAGE_KEY);
    }
  };
}

function draftControls(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea'
  )).filter(control => !control.disabled && (control instanceof HTMLSelectElement || !control.readOnly));
}

function draftKey(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, index: number) {
  const explicit = control.getAttribute('data-wizard-draft-key') || control.getAttribute('name') || control.getAttribute('aria-label');
  return explicit || `${control.tagName.toLowerCase()}:${control instanceof HTMLInputElement ? control.type : 'value'}:${index}`;
}

export function captureWizardStepDraft(root: ParentNode): WizardStepDraft {
  const draft: WizardStepDraft = {};
  draftControls(root).forEach((control, index) => {
    const key = draftKey(control, index);
    draft[key] = control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')
      ? control.checked
      : control.value;
  });
  return draft;
}

function setNativeValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: WizardControlDraft) {
  if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    setter?.call(control, Boolean(value));
  } else {
    const prototype = control instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : control instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(control, String(value));
  }
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

export function restoreWizardStepDraft(root: ParentNode, draft: WizardStepDraft | undefined) {
  if (!draft) return 0;
  let restored = 0;
  draftControls(root).forEach((control, index) => {
    const key = draftKey(control, index);
    if (!(key in draft)) return;
    setNativeValue(control, draft[key]);
    restored += 1;
  });
  return restored;
}

export function createWizardSession(input: Omit<WizardSession, 'version' | 'savedAt'>, now = new Date()): WizardSession {
  return {
    ...input,
    version: WIZARD_SESSION_VERSION,
    savedAt: now.toISOString()
  };
}
