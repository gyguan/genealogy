export type PersonEditRoute = {
  personId: string;
};

const PERSON_EDIT_PATH = /^\/persons\/([^/]+)\/edit\/?$/;

function currentAppUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function emitRouteChange() {
  window.dispatchEvent(new PopStateEvent('popstate'));
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
  const url = new URL(window.location.href);
  url.pathname = `/persons/${encodeURIComponent(normalizedId)}/edit`;
  url.searchParams.set('view', 'personArchive');
  url.hash = '';
  window.history.pushState(
    { ...(window.history.state || {}), genealogyPersonEditReturnUrl: returnUrl },
    '',
    `${url.pathname}${url.search}`
  );
  emitRouteChange();
}

export function navigateBackFromPersonEdit() {
  const returnUrl = window.history.state?.genealogyPersonEditReturnUrl;
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
