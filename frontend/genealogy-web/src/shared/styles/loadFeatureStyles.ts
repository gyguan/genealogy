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
    import('../../mvp1-wizard-layout.css'),
    import('../../mvp1-wizard-generation.css'),
    import('../../mvp1-source-step.css'),
    import('../../mvp1-tree-step.css'),
    import('../../mvp1-person-step.css'),
    import('../../features/mvp1/wizard-form-system.css'),
    import('../../features/mvp1/wizard-control-height.css')
  ]),
  personArchive: async () => Promise.all([
    import('../../person-archive-layout.css'),
    import('../../person-archive-source.css'),
    import('../../person-edit-page.css'),
    import('../../person-detail-page.css'),
    import('../../features/persons/person-form-system.css')
  ]),
  treeProduct: async () => Promise.all([
    import('../../lineage-tree.css'),
    import('../../lineage-graph.css'),
    import('../../lineage-result-toolbar.css')
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
