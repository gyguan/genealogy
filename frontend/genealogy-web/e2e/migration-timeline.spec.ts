import { expect, test, type Page, type Route } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const migration = {
  id: 71,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  sequenceNo: 2,
  fromLocation: '江西吉安',
  toLocation: '湖南长沙',
  migrationTimeText: '清乾隆年间',
  founderPersonId: 9,
  founderPersonName: '黄启迁',
  reason: '经商定居',
  confidenceLevel: 'high',
  privacyLevel: 'clan_only',
  sensitiveLevel: 'normal',
  dataStatus: 'official',
  sourceCount: 1,
  allowedActions: ['view', 'request_update', 'request_archive', 'request_delete'],
  version: 3,
  createdAt: '2026-07-01T08:00:00',
  updatedAt: '2026-07-14T10:00:00'
};

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'culture_admin', displayName: '文化管理员' }));
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支' }]));
    if (path === '/clans/1/persons') return route.fulfill(ok({ records: [{ id: 9, displayName: '黄启迁' }], total: 1, pageNo: 1, pageSize: 100, totalPages: 1 }));
    if (path === '/clans/1/culture-overview') return route.fulfill(ok({ clanId: 1, clanName: '黄氏宗族', statistics: { officialItemCount: 0, pendingReviewCount: 0, sourceCoverageRate: 0 }, featuredItems: [], migrationHighlights: [migration], siteHighlights: [], missingHints: [] }));
    if (path === '/clans/1/culture-items') return route.fulfill(ok({ items: [], page: { pageNo: 1, pageSize: 10, totalElements: 0, totalPages: 0 } }));
    if (path === '/clans/1/migration-events') return route.fulfill(ok({ items: [migration], page: { pageNo: 1, pageSize: 10, totalElements: 1, totalPages: 1 } }));
    if (path === '/migration-events/71') return route.fulfill(ok({ ...migration, description: '由吉安迁居长沙并形成支派。', sources: [{ sourceId: 21, sourceName: '黄氏族谱卷二', sourceType: 'genealogy_book', excerpt: '乾隆年间迁长沙。', confidenceLevel: 'high', bindingStatus: 'official' }], review: { reviewTaskId: 41, status: 'approved' } }));
    if (path === '/tracking/objects/migration_event/71/trace') return route.fulfill(ok({ timeline: [{ title: '审核通过', summary: '迁徙事件发布为正式记录' }] }));
    return route.fulfill(ok({}));
  });
}

test('migration timeline uses structured events and never invents routes', async ({ page }) => {
  await mockApi(page);
  await page.goto('/?view=culture&migrationKeyword=%E5%90%89%E5%AE%89&migrationEvent=71');
  await expect(page.getByText('迁徙脉络')).toBeVisible();
  await expect(page.getByLabel('迁徙关键词')).toHaveValue('吉安');
  await expect(page.getByText('江西吉安 → 湖南长沙').first()).toBeVisible();
  await expect(page.getByText(/清乾隆年间/).first()).toBeVisible();
  await expect(page.getByRole('dialog', { name: /江西吉安 → 湖南长沙/ })).toBeVisible();
  await expect(page.getByText('黄氏族谱卷二')).toBeVisible();
  await expect(page.getByText('迁徙事件发布为正式记录')).toBeVisible();
  await expect(page.getByText(/仅展示真实迁徙事件/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /新增迁徙事件/ })).toBeVisible();
});
