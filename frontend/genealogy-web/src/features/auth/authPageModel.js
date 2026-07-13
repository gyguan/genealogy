export const AUTH_REMEMBERED_USERNAME_KEY = 'genealogy.rememberedUsername';

/** @typedef {'login'|'forgot'|'reset'|'invite'} AuthMode */

/**
 * Resolve the authentication task from a URL query string without coupling the
 * page component to router state. Unknown values deliberately fall back to login.
 * @param {string} search
 * @returns {AuthMode}
 */
export function authModeFromLocation(search) {
  const params = new URLSearchParams(search || '');
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
