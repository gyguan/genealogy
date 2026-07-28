export type NavigationMode = 'push' | 'replace';

export type NavigationDetail = {
  url: string;
  mode: NavigationMode;
  state: unknown;
};

export const APP_NAVIGATION_EVENT = 'genealogy:navigation';

function browserWindow() {
  return typeof window === 'undefined' ? undefined : window;
}

export function commitNavigation(
  url: string,
  options: { mode?: NavigationMode; state?: unknown } = {}
) {
  const target = browserWindow();
  if (!target) return url;

  const mode = options.mode || 'push';
  const state = options.state === undefined ? target.history.state : options.state;
  target.history[mode === 'replace' ? 'replaceState' : 'pushState'](state, '', url);
  target.dispatchEvent(new CustomEvent<NavigationDetail>(APP_NAVIGATION_EVENT, {
    detail: { url, mode, state }
  }));
  return url;
}

export function subscribeNavigation(listener: () => void) {
  const target = browserWindow();
  if (!target) return () => undefined;

  target.addEventListener('popstate', listener);
  target.addEventListener(APP_NAVIGATION_EVENT, listener);
  return () => {
    target.removeEventListener('popstate', listener);
    target.removeEventListener(APP_NAVIGATION_EVENT, listener);
  };
}
