export type DraftDeleteObject = {
  dataStatus?: unknown;
  status?: unknown;
  verificationStatus?: unknown;
  allowedActions?: unknown;
};

export function objectLifecycleStatus(object: DraftDeleteObject | null | undefined) {
  return String(object?.dataStatus ?? object?.verificationStatus ?? object?.status ?? '')
    .trim()
    .toLowerCase();
}

export function allowedActionList(object: DraftDeleteObject | null | undefined) {
  return Array.isArray(object?.allowedActions)
    ? object.allowedActions.map(value => String(value).trim()).filter(Boolean)
    : [];
}

export function canDirectDeleteDraft(object: DraftDeleteObject | null | undefined) {
  const actions = allowedActionList(object);
  if (actions.length) return actions.includes('delete');
  return objectLifecycleStatus(object) === 'draft';
}

export function canRequestDelete(object: DraftDeleteObject | null | undefined) {
  return allowedActionList(object).includes('request_delete');
}

export function draftDeleteConfirmTitle(objectName: unknown, objectType: string) {
  const name = String(objectName ?? '').trim() || `该${objectType}`;
  return `确认删除${objectType}“${name}”？`;
}

export function draftDeleteConfirmDescription(objectType: string) {
  return `仅草稿${objectType}可直接删除。删除后不可恢复，正式数据请通过审核流程处理。`;
}
