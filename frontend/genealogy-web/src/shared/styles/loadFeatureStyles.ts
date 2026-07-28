export type FeatureStyleKey =
  | 'mvp1Wizard'
  | 'personArchive'
  | 'treeProduct'
  | 'memberManage'
  | 'auditTrace';

const loaded = new Set<FeatureStyleKey>();

const loaders: Record<FeatureStyleKey, () => Promise<unknown>> = {
  mvp1Wizard: async () => Promise.all([
    import('../../mvp1-wizard.css'),
    import('../../mvp1-wizard-simplified.css'),
    import('../../mvp1-wizard-enhancements.css'),
    import('../../mvp1-source-step.css'),
    import('../../mvp1-tree-step.css'),
    import('../../mvp1-person-step.css')
  ]),
  personArchive: async () => Promise.all([
    import('../../person-archive-tweaks.css'),
    import('../../person-archive-source.css'),
    import('../../person-edit-page.css'),
    import('../../person-detail-page.css')
  ]),
  treeProduct: async () => Promise.all([
    import('../../lineage-tree.css'),
    import('../../lineage-graph.css'),
    import('../../lineage-workbench-overrides.css'),
    import('../../lineage-result-toolbar-refinement.css')
  ]),
  memberManage: () => import('../../member-permission-page.css'),
  auditTrace: () => import('../../audit-trace.css')
};

export async function loadFeatureStyles(key: string) {
  if (!(key in loaders)) return;
  const styleKey = key as FeatureStyleKey;
  if (loaded.has(styleKey)) return;
  await loaders[styleKey]();
  loaded.add(styleKey);
}
