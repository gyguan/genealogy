import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.navigation-test/shared/navigation/navigationEvents.js');
const { APP_NAVIGATION_EVENT, commitNavigation, subscribeNavigation } = await import(pathToFileURL(modulePath).href);

class TestCustomEvent extends Event {
  constructor(type, init = {}) {
    super(type);
    this.detail = init.detail;
  }
}

function createWindow() {
  const target = new EventTarget();
  const history = {
    state: { trace: 'initial' },
    calls: [],
    pushState(state, _unused, url) {
      this.state = state;
      this.calls.push({ mode: 'push', state, url });
    },
    replaceState(state, _unused, url) {
      this.state = state;
      this.calls.push({ mode: 'replace', state, url });
    }
  };
  return Object.assign(target, { history });
}

test('commitNavigation writes history and emits one application navigation event', () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const testWindow = createWindow();
  globalThis.window = testWindow;
  globalThis.CustomEvent = TestCustomEvent;
  try {
    let detail;
    testWindow.addEventListener(APP_NAVIGATION_EVENT, event => { detail = event.detail; });
    const next = commitNavigation('/?view=sourceLibrary&pageNo=2', {
      mode: 'replace',
      state: { sourceLibraryScrollY: 120 }
    });
    assert.equal(next, '/?view=sourceLibrary&pageNo=2');
    assert.deepEqual(testWindow.history.calls, [{
      mode: 'replace',
      state: { sourceLibraryScrollY: 120 },
      url: '/?view=sourceLibrary&pageNo=2'
    }]);
    assert.deepEqual(detail, {
      url: '/?view=sourceLibrary&pageNo=2',
      mode: 'replace',
      state: { sourceLibraryScrollY: 120 }
    });
  } finally {
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});

test('subscribeNavigation handles browser and application navigation and unsubscribes cleanly', () => {
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const testWindow = createWindow();
  globalThis.window = testWindow;
  globalThis.CustomEvent = TestCustomEvent;
  try {
    let calls = 0;
    const unsubscribe = subscribeNavigation(() => { calls += 1; });
    testWindow.dispatchEvent(new Event('popstate'));
    commitNavigation('/?view=memberManage');
    assert.equal(calls, 2);
    unsubscribe();
    testWindow.dispatchEvent(new Event('popstate'));
    commitNavigation('/?view=reviewCenter');
    assert.equal(calls, 2);
  } finally {
    globalThis.window = previousWindow;
    globalThis.CustomEvent = previousCustomEvent;
  }
});
