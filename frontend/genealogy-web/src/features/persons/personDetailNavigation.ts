import { commitNavigation } from '../../shared/navigation/navigationEvents';
import { buildViewUrl } from '../../shared/navigation/urlState';

export type PersonDetailRoute = {
  personId: string;
};

const PERSON_DETAIL_PATH = /^\/persons\/([^/]+)\/?$/;

function currentAppUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function readPersonDetailRoute(pathname = window.location.pathname): PersonDetailRoute | null {
  const matched = pathname.match(PERSON_DETAIL_PATH);
  if (!matched?.[1]) return null;
  try {
    return { personId: decodeURIComponent(matched[1]) };
  } catch {
    return null;
  }
}

export function navigateToPersonDetail(personId: string | number) {
  const normalizedId = String(personId ?? '').trim();
  if (!normalizedId) return;

  const returnUrl = currentAppUrl();
  const next = buildViewUrl('personArchive', window.location.href, {
    pathname: `/persons/${encodeURIComponent(normalizedId)}`
  });
  commitNavigation(next, {
    mode: 'push',
    state: { ...(window.history.state || {}), genealogyPersonDetailReturnUrl: returnUrl }
  });
}

export function navigateBackFromPersonDetail() {
  const returnUrl = window.history.state?.genealogyPersonDetailReturnUrl;
  if (typeof returnUrl === 'string' && returnUrl) {
    window.history.back();
    return;
  }

  const next = buildViewUrl('personArchive', window.location.href);
  commitNavigation(next, { mode: 'replace', state: window.history.state });
}
