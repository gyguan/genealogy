export const cultureTabKeys = ['items', 'migrations', 'sites'] as const;

export type CultureTabKey = typeof cultureTabKeys[number];

export const defaultCultureTab: CultureTabKey = 'items';

function isCultureTab(value: string | null): value is CultureTabKey {
  return cultureTabKeys.some(tab => tab === value);
}

export function readCultureTabLocation(href = window.location.href) {
  const url = new URL(href, 'https://genealogy.local');
  const requested = url.searchParams.get('tab');
  const tab = isCultureTab(requested) ? requested : defaultCultureTab;
  return {
    tab,
    needsNormalization: requested !== tab
  };
}

export function buildCultureTabLocation(href: string, tab: CultureTabKey) {
  const url = new URL(href, 'https://genealogy.local');
  url.searchParams.set('tab', tab);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveCultureTabMounts(activeTab: CultureTabKey) {
  return {
    items: activeTab === 'items',
    migrations: activeTab === 'migrations',
    sites: activeTab === 'sites'
  };
}
