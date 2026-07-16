export type PersonDetailRoute = {
  personId: string;
};

const PERSON_DETAIL_PATH = /^\/persons\/([^/]+)\/?$/;

function currentAppUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function emitRouteChange() {
  window.dispatchEvent(new PopStateEvent('popstate'));
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
  const url = new URL(window.location.href);
  url.pathname = `/persons/${encodeURIComponent(normalizedId)}`;
  url.searchParams.set('view', 'personArchive');
  url.hash = '';
  window.history.pushState(
    { ...(window.history.state || {}), genealogyPersonDetailReturnUrl: returnUrl },
    '',
    `${url.pathname}${url.search}`
  );
  emitRouteChange();
}

export function navigateBackFromPersonDetail() {
  const returnUrl = window.history.state?.genealogyPersonDetailReturnUrl;
  if (typeof returnUrl === 'string' && returnUrl) {
    window.history.back();
    return;
  }

  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.set('view', 'personArchive');
  url.hash = '';
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  emitRouteChange();
}
