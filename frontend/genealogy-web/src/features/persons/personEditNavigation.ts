import { commitNavigation } from '../../shared/navigation/navigationEvents';
import { buildViewUrl } from '../../shared/navigation/urlState';

export type PersonEditRoute = {
  personId: string;
};

const PERSON_EDIT_PATH = /^\/persons\/([^/]+)\/edit\/?$/;

function currentAppUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function readPersonEditRoute(pathname = window.location.pathname): PersonEditRoute | null {
  const matched = pathname.match(PERSON_EDIT_PATH);
  if (!matched?.[1]) return null;
  try {
    return { personId: decodeURIComponent(matched[1]) };
  } catch {
    return null;
  }
}

export function navigateToPersonEdit(personId: string | number) {
  const normalizedId = String(personId ?? '').trim();
  if (!normalizedId) return;

  const returnUrl = currentAppUrl();
  const next = buildViewUrl('personArchive', window.location.href, {
    pathname: `/persons/${encodeURIComponent(normalizedId)}/edit`
  });
  commitNavigation(next, {
    mode: 'push',
    state: { ...(window.history.state || {}), genealogyPersonEditReturnUrl: returnUrl }
  });
}

export function navigateBackFromPersonEdit() {
  const returnUrl = window.history.state?.genealogyPersonEditReturnUrl;
  if (typeof returnUrl === 'string' && returnUrl) {
    window.history.back();
    return;
  }

  const next = buildViewUrl('personArchive', window.location.href);
  commitNavigation(next, { mode: 'replace', state: window.history.state });
}
