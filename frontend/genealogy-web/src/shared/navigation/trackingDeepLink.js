export const TRACKABLE_TARGET_TYPES = Object.freeze([
  'person',
  'relationship',
  'source',
  'branch',
  'culture_item',
  'migration_event'
]);

const TARGET_TYPE_ALIASES = Object.freeze({
  person: 'person',
  persons: 'person',
  relationship: 'relationship',
  relationships: 'relationship',
  source: 'source',
  sources: 'source',
  branch: 'branch',
  branches: 'branch',
  culture_item: 'culture_item',
  culture_items: 'culture_item',
  migration_event: 'migration_event',
  migration_events: 'migration_event'
});

const TRACKING_QUERY_KEYS = Object.freeze([
  'view',
  'tab',
  'trackingTab',
  'clanId',
  'targetType',
  'targetId',
  'reviewTaskId',
  'traceType',
  'traceId',
  'auditLog'
]);

function positiveId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) return '';
  return Number(normalized) > 0 ? normalized : '';
}

export function normalizeTrackingTargetType(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/-/g, '_');
  return TARGET_TYPE_ALIASES[normalized] || '';
}

export function normalizeTrackingTarget(input = {}) {
  const clanId = positiveId(input.clanId);
  const targetType = normalizeTrackingTargetType(input.targetType);
  const targetId = positiveId(input.targetId);
  const reviewTaskId = positiveId(input.reviewTaskId);
  if (!clanId || !targetType || !targetId) return null;
  return { clanId, targetType, targetId, reviewTaskId };
}

export function buildTrackingDeepLink(currentHref, input) {
  const target = normalizeTrackingTarget(input);
  if (!target) return '';
  const url = new URL(String(currentHref || '/'), 'https://genealogy.local');
  TRACKING_QUERY_KEYS.forEach(key => url.searchParams.delete(key));
  url.searchParams.set('view', 'auditTrace');
  url.searchParams.set('tab', 'object');
  url.searchParams.set('clanId', target.clanId);
  url.searchParams.set('targetType', target.targetType);
  url.searchParams.set('targetId', target.targetId);
  if (target.reviewTaskId) url.searchParams.set('reviewTaskId', target.reviewTaskId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigateToTracking(input, browser = window) {
  const href = buildTrackingDeepLink(browser.location.href, input);
  if (!href) return false;
  browser.history.pushState(browser.history.state, '', href);
  const event = typeof browser.PopStateEvent === 'function'
    ? new browser.PopStateEvent('popstate')
    : new Event('popstate');
  browser.dispatchEvent(event);
  return true;
}
