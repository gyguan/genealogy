export type PersonStatusActionKey = 'submit_review' | 'withdraw_review' | 'archive' | 'restore';

export type PersonStatusAction = {
  key: PersonStatusActionKey;
  label: string;
  endpoint: (personId: string | number) => string;
  primary: boolean;
  dangerous: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
};

const actionAliases: Record<PersonStatusActionKey, string[]> = {
  submit_review: ['submit_review', 'submit-review', 'person.submit_review'],
  withdraw_review: ['withdraw_review', 'withdraw-review', 'person.withdraw_review'],
  archive: ['archive', 'person.archive'],
  restore: ['restore', 'person.restore']
};

export const personStatusActionContract: Record<PersonStatusActionKey, PersonStatusAction> = {
  submit_review: {
    key: 'submit_review',
    label: '提交审核',
    endpoint: personId => `/persons/${personId}/submit-review`,
    primary: true,
    dangerous: false
  },
  withdraw_review: {
    key: 'withdraw_review',
    label: '撤回审核',
    endpoint: personId => `/persons/${personId}/withdraw-review`,
    primary: false,
    dangerous: true,
    confirmTitle: '确认撤回审核？',
    confirmDescription: '撤回后档案将返回可编辑状态，需要重新提交审核。'
  },
  archive: {
    key: 'archive',
    label: '归档档案',
    endpoint: personId => `/persons/${personId}/archive`,
    primary: false,
    dangerous: true,
    confirmTitle: '确认归档人物档案？',
    confirmDescription: '归档后档案将退出日常编辑与审核流程。'
  },
  restore: {
    key: 'restore',
    label: '恢复档案',
    endpoint: personId => `/persons/${personId}/restore`,
    primary: false,
    dangerous: true,
    confirmTitle: '确认恢复人物档案？',
    confirmDescription: '恢复后档案将重新进入可维护状态。'
  }
};

function normalizedStatus(value: unknown) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'pending') return 'pending_review';
  if (status === 'active' || status === 'approved') return 'official';
  return status || 'draft';
}

function allowedSet(value: unknown) {
  if (!Array.isArray(value)) return null;
  return new Set(value.map(item => String(item || '').trim().toLowerCase()).filter(Boolean));
}

export function legalPersonStatusActions(statusValue: unknown): PersonStatusActionKey[] {
  const status = normalizedStatus(statusValue);
  if (status === 'draft' || status === 'rejected') return ['submit_review'];
  if (status === 'pending_review') return ['withdraw_review'];
  if (status === 'official') return ['archive'];
  if (status === 'archived') return ['restore'];
  return [];
}

export function isPersonStatusActionAllowed(action: PersonStatusActionKey, allowedActions: unknown) {
  const allowed = allowedSet(allowedActions);
  if (!allowed) return false;
  return actionAliases[action].some(alias => allowed.has(alias));
}

export function disabledPersonStatusActionReason(action: PersonStatusActionKey, statusValue: unknown, allowedActions: unknown) {
  if (!legalPersonStatusActions(statusValue).includes(action)) return '当前档案状态不允许执行此操作';
  if (!Array.isArray(allowedActions)) return '后端尚未提供该状态动作的权限与接口能力';
  if (!isPersonStatusActionAllowed(action, allowedActions)) return '当前账号无权执行此操作';
  return '';
}

export function visiblePersonStatusActions(statusValue: unknown, allowedActions: unknown) {
  const legal = legalPersonStatusActions(statusValue);
  if (!Array.isArray(allowedActions)) {
    return legal.map(key => ({ action: personStatusActionContract[key], enabled: false, reason: disabledPersonStatusActionReason(key, statusValue, allowedActions) }));
  }
  return legal
    .filter(key => isPersonStatusActionAllowed(key, allowedActions))
    .map(key => ({ action: personStatusActionContract[key], enabled: true, reason: '' }));
}
