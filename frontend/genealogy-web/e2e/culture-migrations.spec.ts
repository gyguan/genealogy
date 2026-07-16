import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const migration = {
  id: 41,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  sequenceNo: 2,
  fromLocation: '江西吉安',
  toLocation: '湖南长沙',
  migrationTimeText: '明洪武年间',
  founderPersonId: 91,
  founderPersonName: '黄公讳德昌',
  reason: '迁居开基',
  confidenceLevel: 'high',
  privacyLevel: 'clan_only',
  sensitiveLevel: 'normal',
  dataStatus: 'official',
  sourceCount: 1,
  allowedActions: ['view', 'request_update'],
  version: 2,
  createdAt: '2026-07-01T08:00:00',
  updatedAt: '2026-07-15T08:00:00'
};

const migrationDetail = {
  ...migration,
  description: '始迁祖由江西吉安迁入湖南长沙。',
  sources: [{ sourceId: 71, sourceName: '黄氏族谱迁徙记', sourceType: 'genealogy_book', excerpt: '洪武年间自吉安迁长沙。', confidenceLevel: 'high', bindingStatus: 'official' }],
  review: { reviewTaskId: 101, status: 'approved' }
};

async function mockMigrationApi(page: Page, requestedPaths: string[], submittedBodies: unknown[] = []) {
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    requestedPaths.push(path);
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'migration_admin', displayName: '迁徙管理员', status: 'active' }));
    if (path === '/clans') return route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/branches') return route.fulfill(ok([{ id: 2, branchName: '长沙支' }]));
    if (path === '/persons/search') return route.fulfill(ok({ records: [{ id: 91, name: '黄公讳德昌', branchId: 2, branchName: '长沙支', generationNo: 8, generationWord: '德' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
    if (path === '/clans/1/migration-events') return route.fulfill(ok({ items: [migration], page: { pageNo: 1, pageSize: 10, totalElements: 1, totalPages: 1 } }));
    if (path === '/migration-events/41' && request.method() === 'GET') return route.fulfill(ok(migrationDetail));
    if (path === '/migration-events/41' && request.method() === 'PUT') {
      submittedBodies.push(request.postDataJSON());
      return route.fulfill(ok({ ...migrationDetail, review: { reviewTaskId: 102, status: 'pending' } }));
    }
    if (path === '/tracking/objects/migration_event/41/trace') return route.fulfill(ok({
      objectSummary: { objectType: 'migration_event', objectId: 41, displayName: '江西吉安 → 湖南长沙', status: 'official' },
      currentStatus: 'official',
      timeline: [{ eventKey: 'review-101', title: '迁徙事件审核已处理', occurredAt: '2026-07-13T09:00:00' }],
      revisions: [], reviewTasks: [], sourceBindings: [], operationLogs: [], allowedActions: ['view'],
      traceCoverage: { level: 'complete', complete: true, truncatedSegments: [], missingSegments: [], notes: [] }
    }));
    return route.fulfill(ok({}));
  });
}

test('migration tab supports direct URL and does not mount other culture domains', async ({ page }) => {
  const requestedPaths: string[] = [];
  await mockMigrationApi(page, requestedPaths);
  await page.goto('/?view=culture&tab=migrations&migrationKeyword=%E6%B9%96%E5%B9%BF&migrationItem=41');

  await expect(page.getByRole('heading', { name: '宗族文化' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '迁徙脉络' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('关键词')).toHaveValue('湖广');
  await expect(page.getByText('江西吉安 → 湖南长沙').first()).toBeVisible();
  const drawer = page.getByRole('dialog', { name: /江西吉安.*湖南长沙/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('黄氏族谱迁徙记')).toBeVisible();
  await expect(drawer.getByText('迁徙事件审核已处理')).toBeVisible();
  await expect(drawer.getByText(/人物\s*#?\s*91/)).toHaveCount(0);

  expect(requestedPaths.filter(path => path.includes('culture-overview'))).toHaveLength(0);
  expect(requestedPaths.filter(path => path.includes('culture-quality'))).toHaveLength(0);
  expect(requestedPaths.filter(path => path.includes('culture-items'))).toHaveLength(0);
  expect(requestedPaths.filter(path => path.includes('culture-sites'))).toHaveLength(0);
});

test('migration editor uses an independent URL page and business person selection', async ({ page }) => {
  const requestedPaths: string[] = [];
  const submittedBodies: unknown[] = [];
  await mockMigrationApi(page, requestedPaths, submittedBodies);
  await page.goto('/?view=culture&tab=migrations&cultureEditor=migration&cultureEditorMode=edit&cultureEditorId=41');

  await expect(page.getByRole('heading', { name: '提交正式迁徙变更申请' })).toBeVisible();
  await expect(page.getByText('正式迁徙事件不会被直接覆盖')).toBeVisible();
  await expect(page.getByRole('dialog', { name: '提交正式迁徙变更申请' })).toHaveCount(0);
  await expect(page.getByLabel('迁出地')).toHaveValue('江西吉安');
  await expect(page.getByLabel('迁入地')).toHaveValue('湖南长沙');
  await expect(page.getByText('黄公讳德昌').first()).toBeVisible();
  await expect(page.getByText(/人物\s*ID|人物\s*#?\s*91/)).toHaveCount(0);

  const founder = page.getByRole('combobox', { name: '始迁祖' });
  await founder.fill('德昌');
  await expect(page.getByText('黄公讳德昌 · 长沙支 · 第8世 · 德字辈')).toBeVisible();

  await page.getByRole('button', { name: '提交变更申请' }).click();
  await expect.poll(() => submittedBodies.length).toBe(1);
  expect(submittedBodies[0]).toMatchObject({ founderPersonId: 91, branchId: 2, version: 2 });
  await expect(page).not.toHaveURL(/cultureEditor=/);
  await expect(page.getByRole('dialog', { name: /江西吉安.*湖南长沙/ })).toBeVisible();
});

test('migration editor restores after browser refresh', async ({ page }) => {
  const requestedPaths: string[] = [];
  await mockMigrationApi(page, requestedPaths);
  await page.goto('/?view=culture&tab=migrations&migrationKeyword=%E6%B9%96%E5%B9%BF&cultureEditor=migration&cultureEditorMode=edit&cultureEditorId=41');
  await expect(page.getByRole('heading', { name: '提交正式迁徙变更申请' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '提交正式迁徙变更申请' })).toBeVisible();
  await expect(page).toHaveURL(/migrationKeyword=/);
  await expect(page).toHaveURL(/cultureEditorId=41/);
});
