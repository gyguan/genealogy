import { expect, test, type Locator, type Page } from '@playwright/test';

const PASSWORD = 'TreeGate!2026';

async function login(page: Page, username: string) {
  const response = await page.request.post('/api/v1/auth/login', {
    data: { username, password: PASSWORD, rememberMe: false }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function openTree(page: Page, username = 'tree_editor') {
  await login(page, username);
  await page.goto('/?view=treeProduct');
  await expect(page.getByText('世系图谱').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '一、支派全局拓扑' })).toBeVisible();
  await expect(page.locator('input[placeholder="输入姓名、谱名或字号"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /展开结果/ })).toBeVisible();
  await expect(page.locator('#lineage-person-search-results')).toHaveCount(0);
}

async function chooseComboboxOption(page: Page, comboboxIndex: number, optionName: string | RegExp) {
  await page.getByRole('combobox').nth(comboboxIndex).click();
  const dropdown = page.locator('.ant-select-dropdown:visible');
  await expect(dropdown).toBeVisible();
  await dropdown.locator('.ant-select-item-option').filter({ hasText: optionName }).first().click();
}

async function activateGraphControl(control: Locator) {
  await control.focus();
  await control.press('Enter');
}

async function searchAndSelect(page: Page, keyword: string) {
  const searchInput = page.locator('input[placeholder="输入姓名、谱名或字号"]');
  await searchInput.fill(keyword);
  await page.getByRole('button', { name: /搜\s*索/ }).click();
  await expect(page.getByText('共匹配 1 位人物')).toBeVisible();

  const results = page.locator('#lineage-person-search-results');
  await expect(results).toBeVisible();
  await expect(page.getByRole('button', { name: '收起结果' })).toBeVisible();
  const resultItem = results.locator('.ant-list-item').filter({ hasText: keyword }).first();
  await expect(resultItem).toBeVisible();
  await resultItem.getByRole('button', { name: '设为中心' }).click();

  await expect(results).toHaveCount(0);
  await expect(page.getByRole('button', { name: /展开结果/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp(keyword) })).toBeVisible();
}

test('real PostgreSQL tree supports 120+ search, semantics, summaries and resilient interaction', async ({ page }) => {
  await openTree(page);

  await searchAndSelect(page, '准出人物129');
  await expect(page.getByText('实线箭头：血缘亲子').first()).toBeVisible();
  await expect(page.getByText('虚线空心箭头：承嗣宗法').first()).toBeVisible();
  const personNodes = page.locator('.lineage-logic-card--person .lineage-graph-node');
  await expect(personNodes.first()).toBeVisible();
  expect(await personNodes.count()).toBeGreaterThanOrEqual(2);

  await chooseComboboxOption(page, 3, '上下各 2 代');
  await chooseComboboxOption(page, 3, '上下各 5 代');
  await expect(page.getByText('上下各 5 代', { exact: true }).last()).toBeVisible();
  await expect(page.getByText(/人物图加载失败/)).toHaveCount(0);

  const personCard = page.locator('.lineage-logic-card--person');
  const percent = personCard.locator('.lineage-graph-toolbar .ant-tag');
  const beforeZoom = await percent.textContent();
  await personCard.getByRole('button', { name: '＋' }).click();
  await expect(percent).not.toHaveText(beforeZoom || '');

  const collapse = personCard.getByRole('button', { name: '折叠后代' }).first();
  if (await collapse.count()) {
    await activateGraphControl(collapse);
    await expect(personCard.getByRole('button', { name: '展开后代' }).first()).toBeVisible();
  }

  await searchAndSelect(page, '准出始祖');
  const activeNode = page.locator('.lineage-logic-card--person .lineage-graph-node.is-active').first();
  await activateGraphControl(activeNode);
  await expect(page.getByText('来源证据', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/1\/1 条正式/)).toBeVisible();
  await expect(page.getByText('待审核', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '查看来源证据' })).toBeVisible();
  await page.getByRole('button', { name: '关闭' }).click();

  const ritualEdge = page.locator('.lineage-logic-card--branch .lineage-graph-edge--ritual').first();
  await expect(ritualEdge).toBeAttached();
  await activateGraphControl(ritualEdge);
  const edgeDetail = page.locator('.lineage-person-pop').filter({ hasText: '关系类别' }).last();
  await expect(edgeDetail).toBeVisible();
  await expect(edgeDetail.locator('.lineage-edge-pop-head p')).toContainText('宗法承嗣关系');
  await expect(edgeDetail.getByText('关系类别', { exact: true })).toBeVisible();
  await edgeDetail.getByRole('button', { name: '关闭' }).click();

  await page.route('**/api/v1/tree/person/**', route => route.abort(), { times: 1 });
  await chooseComboboxOption(page, 3, '上下各 3 代');
  await expect(page.getByText(/人物图加载失败/)).toBeVisible();
  await page.getByRole('button', { name: '重试' }).last().click();
  await expect(page.getByText(/人物图加载失败/)).toHaveCount(0);
  await expect(page.locator('.lineage-logic-card--person .lineage-graph-node').first()).toBeVisible();
});

test('minimal viewer receives real graph without internal summaries or protected identities', async ({ page }) => {
  await openTree(page, 'tree_viewer');
  await searchAndSelect(page, '准出始祖');
  await expect(page.getByText('封存秘名')).toHaveCount(0);
  await expect(page.getByText('在世私密')).toHaveCount(0);

  const activeNode = page.locator('.lineage-logic-card--person .lineage-graph-node.is-active').first();
  await activateGraphControl(activeNode);
  await expect(page.getByText('来源证据', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看来源证据' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '进入审核中心' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '进入修谱工作台' })).toHaveCount(0);
});
