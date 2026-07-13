export const AUTH_REMEMBERED_USERNAME_KEY = 'genealogy.rememberedUsername';

/** @typedef {'login'|'forgot'|'reset'|'invite'} AuthMode */

function scheduleSensitiveQueryCleanup(params) {
  if (!params.get('resetToken') && !params.get('invitationToken')) return;
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  queueMicrotask(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('resetToken');
    url.searchParams.delete('invitationToken');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  });
}

/**
 * Resolve the authentication task from a URL query string without coupling the
 * page component to router state. Unknown values deliberately fall back to login.
 * One-time credentials are read during the current render and removed from the
 * visible URL in a microtask so they do not remain in browser history.
 * @param {string} search
 * @returns {AuthMode}
 */
export function authModeFromLocation(search) {
  const params = new URLSearchParams(search || '');
  scheduleSensitiveQueryCleanup(params);
  const mode = params.get('auth');
  if (mode === 'forgot' || mode === 'reset' || mode === 'invite') return mode;
  if (params.get('resetToken')) return 'reset';
  if (params.get('invitationToken')) return 'invite';
  return 'login';
}

export function resetTokenFromLocation(search) {
  return new URLSearchParams(search || '').get('resetToken') || '';
}

export function invitationTokenFromLocation(search) {
  return new URLSearchParams(search || '').get('invitationToken') || '';
}
