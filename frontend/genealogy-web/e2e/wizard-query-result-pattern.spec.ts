import { expect, test, type Page } from '@playwright/test';

function ok(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) };
}

const clans = [{ id: 1, clanName: '黄氏宗族', surname: '黄', status: 'active' }];
const branches = [{ id: 2, clanId: 1, branchName: '长沙支', level: 1, dataStatus: 'official' }];
const schemes = [
  { id: 3, clanId: 1, branchId: 2, schemeName: '长沙支字辈', dataStatus: 'official' },
  { id: 7, clanId: 1, branchId: 2, schemeName: '待维护字辈', dataStatus: 'draft' }
];
const persons = [
  { id: 4, clanId: 1, branchId: 2, name: '黄德明', gender: 'male', generationNo: 10, generationWord: '德', dataStatus: 'official' },
  { id: 8, clanId: 1, branchId: 2, name: '黄德华', gender: 'male', generationNo: 10, generationWord: '德', dataStatus: 'official' }
];
const relationships = [{ id: 5, personId: 4, relativePersonId: 8, relationType: 'sibling', dataStatus: 'official' }];
const sources = [{ id: 6, clanId: 1, sourceName: '民国族谱', sourceType: 'genealogy_book', dataStatus: 'official' }];
const links = [{ id: 9, sourceId: 6, targetType: 'person', targetId: 4, createdAt: '2026-07-22 10:00' }];

const stepTitles: Record<string, string> = {
  clan: '宗族',
  branch: '支派',
  generation: '字辈',
  person: '人物',
  relationship: '关系',
  source: '来源'
};

async function mockWizardApi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('genealogy.workspace.clanId', '1');
    localStorage.setItem('genealogy.mvp1Wizard.session', JSON.stringify({
      version: 1,
      savedAt: '2026-07-22T10:00:00.000Z',
      activeStep: 'clan',
      workspace: {
        clanId: '1',
        branchId: '2',
        generationSchemeId: '3',
        personId: '4',
        relationshipId: '5',
        sourceId: '6',
        reviewTaskId: ''
      },
      skipped: { relationship: false, source: false },
      drafts: {}
    }));
  });

  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'wizard_admin', displayName: '建谱管理员', status: 'active' }));
    if (path === '/clans') return route.fulfill(ok(clans));
    if (path === '/clans/1/branches') return route.fulfill(ok(branches));
    if (path === '/clans/1/generation-schemes') return route.fulfill(ok(schemes));
    if (path === '/generation-schemes/3/items') return route.fulfill(ok([{ id: 31, generationNo: 10, word: '德' }]));
    if (path === '/generation-schemes/7/items') return route.fulfill(ok([{ id: 71, generationNo: 11, word: '厚' }]));
    if (path === '/clans/1/persons') return route.fulfill(ok(persons));
    if (path === '/persons/4/relationships' || path === '/persons/8/relationships') return route.fulfill(ok(relationships));
    if (path === '/clans/1/sources') return route.fulfill(ok(sources));
    if (path === '/source-bindings/sources/6') return route.fulfill(ok(links));
    if (path === '/clans/1/review-tasks/pending') return route.fulfill(ok([]));
    return route.fulfill(ok([]));
  });
}

async function mockClanDeleteFailureApi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('genealogy.workspace.clanId', '8');
    localStorage.removeItem('genealogy.mvp1Wizard.session');
  });

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'wizard_admin', displayName: '建谱管理员', status: 'active' }));
    if (path === '/clans' && request.method() === 'GET') {
      return route.fulfill(ok([{ id: 8, clanName: '受限宗族', surname: '黄', status: 'draft', allowedActions: ['delete'] }]));
    }
    if (path === '/clans/8' && request.method() === 'DELETE') {
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          code: 'CLAN_HAS_BRANCHES',
          message: '宗族下存在支派，不能删除',
          timestamp: '2026-07-22T16:01:21.9904462'
        })
      });
    }
    return route.fulfill(ok([]));
  });
}

async function openWizardStep(page: Page, step: string) {
  await page.goto(`/?view=mvp1Wizard&step=${step}`);
  const resumeDialog = page.getByRole('dialog', { name: '继续上次建谱？' });
  try {
    await resumeDialog.waitFor({ state: 'visible', timeout: 5000 });
    await resumeDialog.getByRole('button', { name: /继\s*续/ }).click();
    await expect(resumeDialog).toBeHidden();
  } catch {
    // The dialog is only shown when a stored wizard session is restorable.
  }
  await expect(page.locator('.wizard-step-content')).toHaveAttribute('aria-label', `${stepTitles[step]}步骤内容`);
  await expect(page.locator('.wizard-step-content .wizard-query-result-card').first()).toBeVisible();
}

async function expectStrictResultTables(page: Page, minimumCount = 1) {
  const cards = page.locator('.wizard-step-content .wizard-query-result-card');
  await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(minimumCount);
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    await expect(card.locator(':scope > .query-result-outer-card__header')).toHaveCount(1);
    await expect(card.locator(':scope > .ant-table-wrapper')).toHaveCount(1);
    await expect(card.locator(':scope > .ant-card-body')).toHaveCount(0);
    await expect(card.locator('.business-result-card')).toHaveCount(0);
    await expect(card.locator(':scope > .query-result-outer-card__header').getByText('查询结果', { exact: true })).toBeVisible();
  }
}

test('all active genealogy wizard nodes use query result card plus direct table', async ({ page }) => {
  await mockWizardApi(page);

  for (const step of ['clan', 'branch', 'generation', 'person', 'relationship', 'source']) {
    await openWizardStep(page, step);
    await expectStrictResultTables(page);
  }

  await openWizardStep(page, 'generation');
  await page.getByRole('button', { name: '维护字辈' }).click();
  const modalResult = page.locator('.ant-modal .wizard-query-result-card');
  await expect(modalResult).toHaveCount(1);
  await expect(modalResult.locator(':scope > .query-result-outer-card__header')).toHaveCount(1);
  await expect(modalResult.locator(':scope > .ant-table-wrapper')).toHaveCount(1);
  await expect(modalResult.locator(':scope > .ant-card-body')).toHaveCount(0);
});

test('draft clan delete failure shows the backend business message', async ({ page }) => {
  await mockClanDeleteFailureApi(page);
  await openWizardStep(page, 'clan');

  await expect(page.getByText('受限宗族', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '删除草稿' }).click();
  await page.getByRole('button', { name: '确认删除' }).click();

  const errorAlert = page.locator('.clan-step-query-results .ant-alert-error');
  await expect(errorAlert).toBeVisible();
  await expect(errorAlert.getByText('宗族删除失败', { exact: true })).toBeVisible();
  await expect(errorAlert.getByText('宗族下存在支派，不能删除', { exact: true })).toBeVisible();
  await expect(page.getByText('受限宗族', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '删除草稿' })).toBeVisible();
});
