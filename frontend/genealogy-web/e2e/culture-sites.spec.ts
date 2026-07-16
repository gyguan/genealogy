import { expect, test, type Page, type Route } from '@playwright/test';

const site = {
  id: 61,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  siteType: 'ancestral_hall',
  name: '敦本堂宗祠',
  addressText: '湖南省长沙市某村',
  foundedPeriod: '清乾隆年间',
  currentStatus: '存续并完成修缮',
  summary: '黄氏长沙支重要祭祖与修谱场所。',
  latitude: 28.2282,
  longitude: 112.9388,
  relatedPersonId: 91,
  relatedPersonName: '黄公讳德昌',
  confidenceLevel: 'high',
  privacyLevel: 'clan_only',
  sensitiveLevel: 'normal',
  dataStatus: 'official',
  featuredOnHome: true,
  sortOrder: 1,
  sourceCount: 1,
  attachmentCount: 1,
  allowedActions: ['view', 'request_update', 'request_archive', 'request_delete', 'request_feature', 'view_sensitive'],
  version: 2,
  createdAt: '2026-07-01T08:00:00',
  updatedAt: '2026-07-15T08:00:00'
};

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function mockSiteApi(page: Page, requestedPaths: string[]) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    requestedPaths.push(path);
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'site_admin', displayName: '场所管理员', status: 'active' }));
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
    if (path === '/clans/1/culture-sites' && request.method() === 'GET') return route.fulfill(ok({ items: [site], page: { pageNo: 1, pageSize: 10, totalElements: 1, totalPages: 1 } }));
    if (path === '/culture-sites/61' && request.method() === 'GET') return route.fulfill(ok({
      ...site,
      description: '宗祠保留清代木构与历次修缮碑记。',
      sources: [{ sourceId: 71, sourceName: '敦本堂重修碑记', sourceType: 'inscription', excerpt: '乾隆年间创建，民国与近年重修。', confidenceLevel: 'high', bindingStatus: 'official' }],
      attachments: [{ attachmentId: 81, fileName: '敦本堂正门.jpg', contentType: 'image/jpeg', fileSize: 4096, canPreview: true, canDownload: true }],
      review: { reviewTaskId: 101, status: 'approved', submitterName: '场所管理员', reviewerName: '宗族审核员', submittedAt: '2026-07-12T09:00:00', reviewedAt: '2026-07-13T09:00:00' }
    }));
    if (path === '/tracking/objects/culture_site/61/trace') return route.fulfill(ok({
      objectSummary: { objectType: 'culture_site', objectId: 61, displayName: site.name, branchName: '长沙支', status: 'official', changedAt: site.updatedAt },
      currentStatus: 'official',
      timeline: [{ eventKey: 'review-101', eventType: 'review_decided', sourceType: 'review_task', sourceId: 101, title: '文化场所审核已处理', summary: '审核通过', occurredAt: '2026-07-13T09:00:00', actorDisplayName: '宗族审核员', resultStatus: 'approved' }],
      changeChains: [], revisions: [], reviewTasks: [], sourceBindings: [], operationLogs: [], allowedActions: ['view'],
      traceCoverage: { level: 'complete', complete: true, truncatedSegments: [], missingSegments: [], notes: [] }
    }));
    if (path === '/culture-sites/61' && request.method() === 'PUT') return route.fulfill(ok({ ...site, sources: [], attachments: [], review: { status: 'pending' } }));
    return route.fulfill(ok({}));
  });
}

function expectOnlySiteTabRequests(requestedPaths: string[]) {
  expect(requestedPaths.filter(path => path.includes('culture-overview'))).toHaveLength(0);
  expect(requestedPaths.filter(path => path.includes('culture-quality'))).toHaveLength(0);
  expect(requestedPaths.filter(path => path.includes('culture-items'))).toHaveLength(0);
  expect(requestedPaths.filter(path => path.includes('migration-events'))).toHaveLength(0);
}

test('culture site tab supports direct URL, detail, governance and mobile layout', async ({ page }) => {
  const requestedPaths: string[] = [];
  await mockSiteApi(page, requestedPaths);
  await page.goto('/?view=culture&tab=sites&siteItem=61');

  await expect(page.getByRole('heading', { name: '宗族文化' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '祠堂与文化场所' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('敦本堂宗祠').first()).toBeVisible();
  await expect(page.getByText('湖南省长沙市某村').first()).toBeVisible();

  const drawer = page.getByRole('dialog', { name: '文化场所详情' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('黄公讳德昌')).toBeVisible();
  await expect(drawer.getByText('敦本堂重修碑记')).toBeVisible();
  await expect(drawer.getByText('敦本堂正门.jpg')).toBeVisible();
  await expect(drawer.getByText('文化场所审核已处理')).toBeVisible();
  await expect(drawer.getByRole('button', { name: /打\s*开\s*完\s*整\s*追\s*踪/ })).toBeVisible();

  await drawer.getByRole('button', { name: /编\s*辑/ }).click();
  const dialog = page.getByRole('dialog', { name: '提交正式场所变更申请' });
  await expect(dialog.getByText('正式场所不会被直接覆盖')).toBeVisible();
  await expect(dialog.getByLabel('场所名称')).toHaveValue('敦本堂宗祠');
  await dialog.getByRole('button', { name: /取\s*消/ }).click();

  expectOnlySiteTabRequests(requestedPaths);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /新\s*增\s*场\s*所/ })).toBeVisible();
  await expect(page.getByText('敦本堂宗祠').first()).toBeVisible();
});

test('forbidden culture site list never discloses sealed site identity', async ({ page }) => {
  const requestedPaths: string[] = [];
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    requestedPaths.push(path);
    if (path === '/auth/me') return route.fulfill(ok({ id: 8, username: 'viewer', displayName: '受限成员', status: 'active' }));
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([]));
    if (path === '/clans/1/culture-sites') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: '当前账号无权查看文化场所' } }) });
    return route.fulfill(ok({}));
  });
  await page.goto('/?view=culture&tab=sites');
  await expect(page.getByText('当前账号无权查看文化场所')).toBeVisible();
  await expect(page.getByText('封存祖墓精确地址')).toHaveCount(0);
  expectOnlySiteTabRequests(requestedPaths);
});
