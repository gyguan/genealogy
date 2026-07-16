import type { CultureTabKey } from './cultureTabState';

export type CulturePagePattern = {
  tab: CultureTabKey;
  label: string;
  primaryAction: string;
  editorTarget?: 'migration' | 'site';
  mobileClass: string;
};

export const culturePagePatterns: Record<CultureTabKey, CulturePagePattern> = {
  items: {
    tab: 'items',
    label: '文化资料',
    primaryAction: '新增资料',
    mobileClass: 'culture-tab-items'
  },
  migrations: {
    tab: 'migrations',
    label: '迁徙脉络',
    primaryAction: '新增迁徙事件',
    editorTarget: 'migration',
    mobileClass: 'culture-tab-migrations'
  },
  sites: {
    tab: 'sites',
    label: '文化场所',
    primaryAction: '新增场所',
    editorTarget: 'site',
    mobileClass: 'culture-tab-sites'
  }
};

export const cultureTabItems = (Object.keys(culturePagePatterns) as CultureTabKey[]).map(key => ({
  key,
  label: culturePagePatterns[key].label
}));

export function culturePrimaryAction(tab: CultureTabKey) {
  return culturePagePatterns[tab].primaryAction;
}

export function cultureEditorTarget(tab: CultureTabKey) {
  return culturePagePatterns[tab].editorTarget;
}

export function cultureMobileClass(tab: CultureTabKey) {
  return culturePagePatterns[tab].mobileClass;
}
