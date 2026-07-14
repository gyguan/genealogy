import { expect, test, type Page, type Route } from '@playwright/test';

const item = {
  id: 11,
  scope: { clanId: 1, clanName: '黄氏宗族', branchId: 2, branchName: '长沙支' },
  category: 'hall_name',
  title: '敦本堂堂号源流',
  summary: '记录敦本堂堂号的历史来源。',
  historicalPeriod: '清代中期',
  locationText: '湖南长沙',
  confidenceLevel: 'high',
  privacyLevel: 'clan_only',
  sensitiveLevel: 'normal',
  dataStatus: 'official',
  featuredOnHome: true,
  sortOrder: 1,
  sourceCount: 1,
  attachmentCount: 1,
  reviewCount: 2,
  allowedActions: ['view', 'request_update', 'request_archive', 'request_delete', 'request_feature', 'view_sensitive'],
  version: 3,
  createdByName: '文化管理员',
  createdAt: '2026-07-01T08:00:00',
  updatedAt: '2026-07-14T10:00:00'
};

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

async function mockCultureApi(page: Page) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');

    if (path === '/auth/me') {
      await route.fulfill(ok({ id: 7, username: 'culture_admin', displayName: '文化管理员', status: 'active' }));
      return;
    }
    if (path === '/clans') {
      await route.fulfill(ok({ records: [{ id: 1, clanName: '黄氏宗族', surname: '黄' }], total: 1, pageNo: 1, pageSize: 20, totalPages: 1 }));
      return;
    }
    if (path === '/clans/1/branches') {
      await route.fulfill(ok([{ id: 2, branchName: '长沙支', branchPath: '黄氏宗族/长沙支' }]));
      return;
    }
    if (path === '/clans/1/culture-overview') {
      await route.fulfill(ok({
        clanId: 1,
        clanName: '黄氏宗族',
        statistics: { officialItemCount: 8, pendingReviewCount: 2, sourceCoverageRate: 0.75 },
        featuredItems: [item],
        migrationHighlights: [],
        siteHighlights: [],
        missingHints: ['家训资料尚未形成正式记录']
      }));
      return;
    }
    if (path === '/clans/1/culture-items' && request.method() === 'GET') {
      const keyword = url.searchParams.get('keyword') || '';
      const responseItem = keyword.includes('家训') ? { ...item, id: 12, category: 'family_instruction', title: '黄氏家训' } : item;
      await route.fulfill(ok({
        items: [responseItem],
        page: { pageNo: Number(url.searchParams.get('pageNo') || 1), pageSize: Number(url.searchParams.get('pageSize') || 10), totalElements: 1, totalPages: 1 }
      }));
      return;
    }
    if (path === '/culture-items/11') {
      await route.fulfill(ok({
        ...item,
        content: '敦本务实，敬宗睦族。',
        sources: [{ sourceId: 21, sourceName: '黄氏族谱卷一', sourceType: 'genealogy_book', excerpt: '堂号曰敦本堂。', confidenceLevel: 'high', bindingStatus: 'official' }],
        attachments: [{ attachmentId: 31, fileName: '敦本堂谱页.jpg', contentType: 'image/jpeg', fileSize: 2048, canPreview: true, canDownload: true }],
        review: { reviewTaskId: 41, status: 'approved', submitterName: '文化管理员', reviewerName: '宗族审核员', submittedAt: '2026-07-10T09:00:00', reviewedAt: '2026-07-11T09:00:00' }
      }));
      return;
    }
    if (path === '/tracking/objects/culture_item/11/trace') {
      await route.fulfill(ok({
        objectSummary: { objectType: 'culture_item', objectId: 11, displayName: item.title, branchName: '长沙支', status: 'official', changedAt: item.updatedAt },
        currentStatus: 'official',
        timeline: [{ eventKey: 'revision-1', eventType: 'REVIEW_APPROVED', sourceType: 'review_task', sourceId: 41, title: '审核通过', summary: '文化资料发布为正式内容', occurredAt: '2026-07-11T09:00:00', actorDisplayName: '宗族审核员', resultStatus: 'approved' }],
        revisions: [], reviewTasks: [], sourceBindings: [], operationLogs: [], allowedActions: ['view'],
        traceCoverage: { level: 'complete', complete: true, truncatedSegments: [], missingSegments: [], notes: ['已聚合版本、审核、来源和操作记录'] }
      }));
      return;
    }
    if (path.startsWith('/culture-items/') && request.method() === 'PUT') {
      await route.fulfill(ok({ ...item, content: '敦本务实，敬宗睦族。', sources: [], attachments: [], review: { status: 'pending' } }));
      return;
    }
    await route.fulfill(ok({}));
  });
}

test('culture library restores URL state and uses real detail, governance and responsive layout', async ({ page }) => {
  await mockCultureApi(page);
  await page.goto('/?view=culture&cultureKeyword=%E5%A0%82%E5%8F%B7&cultureItem=11');

  await expect(page.getByRole('heading', { name: '宗族文化资料库' })).toBeVisible();
  await expect(page.getByLabel('关键词')).toHaveValue('堂号');
  await expect(page.getByText('正式资料').first()).toBeVisible();
  await expect(page.getByText('敦本堂堂号源流').first()).toBeVisible();
  const drawer = page.getByRole('dialog', { name: '敦本堂堂号源流' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('敦本务实，敬宗睦族。')).toBeVisible();

  await drawer.getByRole('tab', { name: /来源与附件/ }).click();
  await expect(drawer.getByText('黄氏族谱卷一')).toBeVisible();
  await expect(drawer.getByText('敦本堂谱页.jpg')).toBeVisible();

  await drawer.getByRole('tab', { name: /审核与追踪/ }).click();
  await expect(drawer.getByText('文化资料发布为正式内容')).toBeVisible();
  await expect(drawer.getByRole('button', { name: '完整追踪' })).toBeVisible();

  await drawer.getByRole('button', { name: /编\s*辑/ }).click();
  const editDialog = page.getByRole('dialog', { name: '申请变更正式文化资料' });
  await expect(editDialog).toBeVisible();
  await expect(editDialog.getByText('正式资料不会被直接覆盖')).toBeVisible();
  await editDialog.getByRole('button', { name: /取\s*消/ }).click();

  await drawer.getByRole('button', { name: 'Close' }).click();
  await page.getByLabel('关键词').fill('家训');
  await page.getByRole('button', { name: /查\s*询/ }).click();
  await expect(page).toHaveURL(/cultureKeyword=%E5%AE%B6%E8%AE%AD/);
  await expect(page.getByText('黄氏家训')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('文化资料检索')).toBeVisible();
  await expect(page.getByRole('button', { name: /新\s*增\s*资\s*料/ })).toBeVisible();
});
