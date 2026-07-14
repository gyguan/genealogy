import assert from 'node:assert/strict';
import {
  buildTrackingDeepLink,
  navigateToTracking,
  normalizeTrackingTarget,
  normalizeTrackingTargetType
} from './trackingDeepLink.js';

assert.equal(normalizeTrackingTargetType('relationships'), 'relationship');
assert.equal(normalizeTrackingTargetType('SOURCE'), 'source');
assert.equal(normalizeTrackingTargetType('review_task'), '');
assert.equal(normalizeTrackingTarget({ clanId: 1, targetType: 'person', targetId: 9 })?.targetId, '9');
assert.equal(normalizeTrackingTarget({ clanId: '', targetType: 'person', targetId: 9 }), null);
assert.equal(normalizeTrackingTarget({ clanId: 1, targetType: 'person', targetId: 0 }), null);
assert.equal(normalizeTrackingTarget({ clanId: 'abc', targetType: 'person', targetId: 9 }), null);
assert.equal(normalizeTrackingTarget({ clanId: 1, targetType: 'person', targetId: '../9' }), null);
assert.equal(normalizeTrackingTarget({ clanId: 1, targetType: 'person', targetId: 9, reviewTaskId: 'invalid' })?.reviewTaskId, '');

const href = buildTrackingDeepLink(
  'https://example.test/app?view=personArchive&keyword=%E5%BC%A0%E4%B8%89#detail',
  { clanId: 7, targetType: 'persons', targetId: 88, reviewTaskId: 31 }
);
const url = new URL(href, 'https://example.test');
assert.equal(url.pathname, '/app');
assert.equal(url.hash, '#detail');
assert.equal(url.searchParams.get('view'), 'auditTrace');
assert.equal(url.searchParams.get('tab'), 'object');
assert.equal(url.searchParams.get('clanId'), '7');
assert.equal(url.searchParams.get('targetType'), 'person');
assert.equal(url.searchParams.get('targetId'), '88');
assert.equal(url.searchParams.get('reviewTaskId'), '31');
assert.equal(url.searchParams.get('keyword'), '张三');
assert.equal(url.searchParams.get('traceType'), null);

const events = [];
const browser = {
  location: { href: 'https://example.test/app?view=reviewCenter' },
  history: {
    state: { source: 'test' },
    pushState(state, _title, nextHref) {
      events.push({ type: 'push', state, href: nextHref });
      this.state = state;
    }
  },
  PopStateEvent: class {
    constructor(type) { this.type = type; }
  },
  dispatchEvent(event) { events.push({ type: event.type }); }
};
assert.equal(navigateToTracking({ clanId: 5, targetType: 'branch', targetId: 12 }, browser), true);
assert.equal(events[0].type, 'push');
assert.match(events[0].href, /view=auditTrace/);
assert.match(events[0].href, /targetType=branch/);
assert.deepEqual(events[1], { type: 'popstate' });

console.log('trackingDeepLink tests passed');
