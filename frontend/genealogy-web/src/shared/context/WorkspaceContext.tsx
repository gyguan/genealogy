import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from 'antd';
import {
  dependencyImpactText,
  planWizardDependencyChange,
  wizardSelectionFields,
  type WizardSelectionField,
  type WizardSelections
} from '../../features/mvp1/domain/wizardDependencies';
import type { Mvp1StepKey } from '../../features/mvp1/domain/wizardStepState';

import { confirmAction } from '../ui/Feedback';

export type WorkspaceSelectionKey = keyof WizardSelections;
export type WorkspacePatch = Partial<Pick<WorkspaceState,
  | 'clanId'
  | 'branchId'
  | 'generationSchemeId'
  | 'personId'
  | 'relationshipId'
  | 'sourceId'
  | 'sourceFocusReason'
  | 'attachmentId'
  | 'reviewTaskId'
>>;

export type WorkspaceState = {
  clanId: string;
  branchId: string;
  generationSchemeId: string;
  personId: string;
  relationshipId: string;
  sourceId: string;
  sourceFocusReason: string;
  attachmentId: string;
  reviewTaskId: string;
  setClanId: (value: string) => void;
  setBranchId: (value: string) => void;
  setGenerationSchemeId: (value: string) => void;
  setPersonId: (value: string) => void;
  setRelationshipId: (value: string) => void;
  setSourceId: (value: string) => void;
  setSourceFocusReason: (value: string) => void;
  setAttachmentId: (value: string) => void;
  setReviewTaskId: (value: string) => void;
  patch: (values: WorkspacePatch) => void;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);
const CLAN_ID_STORAGE_KEY = 'genealogy.workspace.clanId';
const stepOrder: Mvp1StepKey[] = ['clan', 'branch', 'generation', 'person', 'relationship', 'source', 'review'];

function loadClanId() {
  return localStorage.getItem(CLAN_ID_STORAGE_KEY) || '';
}

function saveClanId(value: string) {
  localStorage.setItem(CLAN_ID_STORAGE_KEY, value || '');
}

function activeWizardStep(): Mvp1StepKey {
  const candidate = new URLSearchParams(window.location.search).get('step') as Mvp1StepKey | null;
  return candidate && stepOrder.includes(candidate) ? candidate : 'clan';
}

function editableControls() {
  const root = document.querySelector('.wizard-step-content');
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea'
  )).filter(control => !control.disabled && (control instanceof HTMLSelectElement || !control.readOnly));
}

type ControlSnapshot = Array<{ index: number; value: string | boolean }>;

function captureControlSnapshot(): ControlSnapshot {
  return editableControls().map((control, index) => ({
    index,
    value: control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')
      ? control.checked
      : control.value
  }));
}

function restoreControlSnapshot(snapshot: ControlSnapshot) {
  const controls = editableControls();
  for (const item of snapshot) {
    const control = controls[item.index];
    if (!control) continue;
    if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set?.call(control, Boolean(item.value));
    } else {
      const prototype = control instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : control instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLTextAreaElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(control, String(item.value));
    }
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function hasUnsavedWizardInput() {
  const tags = Array.from(document.querySelectorAll('.wizard-progress-card .ant-tag'));
  return tags.some(tag => /未保存|保存失败/.test(tag.textContent || ''));
}

function shouldHydrateDirectly(values: WorkspacePatch) {
  const selectionEntries = Object.entries(values).filter(([key]) =>
    [...wizardSelectionFields, 'reviewTaskId'].includes(key as WizardSelectionField | 'reviewTaskId')
  );
  if (!selectionEntries.length) return false;
  const nonEmpty = selectionEntries.filter(([, value]) => Boolean(value)).length;
  const allCleared = selectionEntries.length >= 6 && nonEmpty === 0;
  const restoringSession = values.reviewTaskId !== undefined && nonEmpty >= 2;
  return allCleared || restoringSession;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [clanId, updateClanId] = useState(loadClanId);
  const [branchId, updateBranchId] = useState('');
  const [generationSchemeId, updateGenerationSchemeId] = useState('');
  const [personId, updatePersonId] = useState('');
  const [relationshipId, updateRelationshipId] = useState('');
  const [sourceId, updateSourceId] = useState('');
  const [sourceFocusReason, updateSourceFocusReason] = useState('');
  const [attachmentId, updateAttachmentId] = useState('');
  const [reviewTaskId, updateReviewTaskId] = useState('');
  const [invalidatedSteps, setInvalidatedSteps] = useState<Mvp1StepKey[]>([]);
  const pendingChange = useRef(false);

  const selections = useMemo<WizardSelections>(() => ({
    clanId,
    branchId,
    generationSchemeId,
    personId,
    relationshipId,
    sourceId,
    reviewTaskId
  }), [clanId, branchId, generationSchemeId, personId, relationshipId, sourceId, reviewTaskId]);

  function applyRaw(values: WorkspacePatch) {
    if (values.clanId !== undefined) { updateClanId(values.clanId); saveClanId(values.clanId); }
    if (values.branchId !== undefined) updateBranchId(values.branchId);
    if (values.generationSchemeId !== undefined) updateGenerationSchemeId(values.generationSchemeId);
    if (values.personId !== undefined) updatePersonId(values.personId);
    if (values.relationshipId !== undefined) updateRelationshipId(values.relationshipId);
    if (values.sourceId !== undefined) updateSourceId(values.sourceId);
    if (values.sourceFocusReason !== undefined) updateSourceFocusReason(values.sourceFocusReason);
    if (values.attachmentId !== undefined) updateAttachmentId(values.attachmentId);
    if (values.reviewTaskId !== undefined) updateReviewTaskId(values.reviewTaskId);
  }

  function requestPatch(values: WorkspacePatch) {
    if (pendingChange.current || shouldHydrateDirectly(values)) {
      applyRaw(values);
      return;
    }

    const changedField = wizardSelectionFields.find(field =>
      values[field] !== undefined && Boolean(selections[field]) && selections[field] !== values[field]
    );
    if (!changedField) {
      applyRaw(values);
      return;
    }

    const plan = planWizardDependencyChange(selections, changedField, String(values[changedField] || ''));
    const activeStep = activeWizardStep();
    const affectsUnsavedInput = hasUnsavedWizardInput() && plan.affectedSteps.includes(activeStep);
    if (!plan.hasSelectedImpact && !affectsUnsavedInput) {
      applyRaw({ ...values, ...plan.patch });
      return;
    }

    const snapshot = captureControlSnapshot();
    pendingChange.current = true;
    confirmAction({
      title: `切换后将重新确认：${dependencyImpactText(plan)}`,
      content: affectsUnsavedInput
        ? `当前“${activeStep}”步骤存在未保存输入。确认后仅解除本次向导中的下游选择与缓存，不会删除任何已创建业务数据。`
        : '确认后仅解除本次向导中的下游选择与缓存，不会删除任何已创建业务数据。',
      okText: '确认切换',
      cancelText: '取消，保留当前内容',
      onOk: () => {
        applyRaw({ ...values, ...plan.patch });
        setInvalidatedSteps(current => Array.from(new Set([
          ...current.filter(step => step !== plan.changedStep),
          ...plan.affectedSteps
        ])));
        pendingChange.current = false;
      },
      onCancel: () => {
        pendingChange.current = false;
        window.requestAnimationFrame(() => restoreControlSnapshot(snapshot));
      }
    });
  }

  useEffect(() => {
    const clearCurrentInvalidation = (event: Event) => {
      const target = event.target as Element | null;
      if (!target?.closest('.wizard-step-content')) return;
      const active = activeWizardStep();
      setInvalidatedSteps(current => current.includes(active) ? current.filter(step => step !== active) : current);
    };
    document.addEventListener('input', clearCurrentInvalidation, true);
    document.addEventListener('change', clearCurrentInvalidation, true);
    return () => {
      document.removeEventListener('input', clearCurrentInvalidation, true);
      document.removeEventListener('change', clearCurrentInvalidation, true);
    };
  }, []);

  useEffect(() => {
    const markSteps = () => {
      const items = Array.from(document.querySelectorAll<HTMLElement>('.wizard-ant-steps .ant-steps-item'));
      items.forEach((item, index) => {
        item.querySelector('.wizard-dependency-invalid-tag')?.remove();
        item.removeAttribute('data-wizard-invalidated');
        const step = stepOrder[index];
        if (!step || !invalidatedSteps.includes(step)) return;
        item.setAttribute('data-wizard-invalidated', 'true');
        const title = item.querySelector('.wizard-step-title');
        if (!title) return;
        const tag = document.createElement('span');
        tag.className = 'wizard-dependency-invalid-tag';
        tag.textContent = '需重新确认';
        tag.setAttribute('role', 'status');
        title.appendChild(tag);
      });
    };
    markSteps();
    const observer = new MutationObserver(markSteps);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [invalidatedSteps]);

  const value = useMemo<WorkspaceState>(() => ({
    clanId,
    branchId,
    generationSchemeId,
    personId,
    relationshipId,
    sourceId,
    sourceFocusReason,
    attachmentId,
    reviewTaskId,
    setClanId: value => requestPatch({ clanId: value }),
    setBranchId: value => requestPatch({ branchId: value }),
    setGenerationSchemeId: value => requestPatch({ generationSchemeId: value }),
    setPersonId: value => requestPatch({ personId: value }),
    setRelationshipId: value => requestPatch({ relationshipId: value }),
    setSourceId: value => requestPatch({ sourceId: value }),
    setSourceFocusReason: updateSourceFocusReason,
    setAttachmentId: updateAttachmentId,
    setReviewTaskId: value => requestPatch({ reviewTaskId: value }),
    patch: requestPatch
  }), [selections, sourceFocusReason, attachmentId]);

  return (
    <WorkspaceContext.Provider value={value}>
      <style>{`
        .wizard-ant-steps .ant-steps-item[data-wizard-invalidated="true"] .ant-steps-item-icon {
          border-color: #faad14;
          background: #fffbe6;
        }
        .wizard-dependency-invalid-tag {
          display: inline-flex;
          align-items: center;
          min-height: 20px;
          padding: 0 7px;
          margin-inline-start: 4px;
          border: 1px solid #ffe58f;
          border-radius: 6px;
          color: #ad6800;
          background: #fffbe6;
          font-size: 12px;
          line-height: 18px;
          white-space: nowrap;
        }
      `}</style>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return value;
}
