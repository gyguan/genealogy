export type EntityNavigationGuardState = {
  dirty: boolean;
  busy: boolean;
};

export type EntityNavigationDecision = 'allow' | 'confirm_dirty' | 'block_busy';

export const EMPTY_ENTITY_NAVIGATION_GUARD: EntityNavigationGuardState = {
  dirty: false,
  busy: false
};

export function entityNavigationDecision(state: EntityNavigationGuardState): EntityNavigationDecision {
  if (state.busy) return 'block_busy';
  if (state.dirty) return 'confirm_dirty';
  return 'allow';
}

export function entityNavigationPrompt() {
  return '当前修改尚未保存，返回后将无法恢复。是否放弃修改并离开？';
}
