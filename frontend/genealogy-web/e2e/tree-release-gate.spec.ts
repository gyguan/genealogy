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
  await expect(page.getByRole('heading', { name: '中国式世系关系工作台' })).toBeVisible();
  const searchInput = page.locator('input[placeholder="输入姓名、谱名或字号"]');
  const searchButton = page.getByRole('button', { name: '搜索', exact: true });
  await expect(searchInput).toBeVisible();
  await expect(searchButton).toBeVisible();
  await expect(page.getByLabel('人物搜索范围')).toHaveCount(0);
  await expect(page.getByLabel('数据视图')).toHaveCount(0);
  await expect(page.locator('.lineage-workbench-summary')).toHaveCount(0);
  await expect(page.locator('.lineage-logic-card .lineage-graph-mode-bar')).toContainText('人物中心');

  const inputBox = await searchInput.boundingBox();
  const buttonBox = await searchButton.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(inputBox!.width).toBeLessThanOrEqual(420);
  expect(Math.abs(inputBox!.y - buttonBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(inputBox!.height - buttonBox!.height)).toBeLessThanOrEqual(1);
}

async function chooseLabelledSelect(page: Page, label: string, optionName: string | RegExp) {
  await page.locator(`[aria-label="${label}"]`).click();
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
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText('共匹配 1 位人物')).toBeVisible();
  const result = page.locator('.lineage-search-result-item').filter({ hasText: keyword }).first();
  await expect(result).toBeVisible();
  const setCenter = result.getByRole('button', { name: '设为中心' });
  if (await setCenter.count()) await setCenter.click();
  else await result.click();
  await expect(page.getByRole('heading', { name: new RegExp(`${keyword}.*中心世系拓扑`) })).toBeVisible();
}

async function closeDrawer(page: Page) {
  const drawer = page.locator('.ant-drawer:visible');
  await expect(drawer).toBeVisible();
  await drawer.locator('.ant-drawer-close').click();
  await expect(drawer).toBeHidden();
}

test('real PostgreSQL tree supports explicit query, compact search, location and resilient interaction', async ({ page }) => {
  await openTree(page);

  await searchAndSelect(page, '准出人物129');
  await expect(page).toHaveURL(/personId=\d+/);
  await expect(page.getByText('实线箭头：血缘亲子').first()).toBeVisible();
  await expect(page.getByText('虚线空心箭头：承嗣宗法').first()).toBeVisible();
  const personCard = page.locator('.lineage-logic-card--person');
  const personNodes = personCard.locator('.lineage-graph-node');
  await expect(personNodes.first()).toBeVisible();
  expect(await personNodes.count()).toBeGreaterThanOrEqual(2);

  let personQueryRequests = 0;
  page.on('request', request => {
    if (request.method() === 'GET' && request.url().includes('/api/v1/tree/person/')) personQueryRequests += 1;
  });
  const requestCountBeforeConditionChange = personQueryRequests;
  await chooseLabelledSelect(page, '人物中心展开深度', '上下各 2 代');
  await chooseLabelledSelect(page, '人物中心展开深度', '上下各 5 代');
  await expect.poll(() => personQueryRequests).toBe(requestCountBeforeConditionChange);
  await page.getByRole('button', { name: '查询图谱', exact: true }).click();
  await expect.poll(() => personQueryRequests).toBeGreaterThan(requestCountBeforeConditionChange);
  await expect(page).toHaveURL(/personDepth=5/);
  await expect(page.getByText(/人物图加载失败/)).toHaveCount(0);

  const percent = personCard.locator('.lineage-graph-toolbar .ant-tag').filter({ hasText: '%' }).first();
  const beforeZoom = await percent.textContent();
  await personCard.getByRole('button', { name: '放大' }).click();
  await expect(percent).not.toHaveText(beforeZoom || '');

  const collapse = personCard.getByRole('button', { name: '折叠后代' }).first();
  if (await collapse.count()) {
    await activateGraphControl(collapse);
    await expect(personCard.getByRole('button', { name: '展开后代' }).first()).toBeVisible();
  }

  const locateSelect = page.locator('.lineage-locate-select');
  await locateSelect.click();
  const locateDropdown = page.locator('.ant-select-dropdown:visible');
  const locateOption = locateDropdown.locator('.ant-select-item-option').nth(1);
  const locatedName = (await locateOption.textContent())?.trim() || '';
  await locateOption.click();
  await expect(page.locator('.ant-drawer:visible')).toHaveCount(0);
  await expect(locateSelect.locator('.ant-select-selection-item')).toContainText(locatedName.split('·')[0].trim());

  const secondaryNode = personNodes.filter({ hasNot: page.locator('.is-active') }).nth(1);
  if (await secondaryNode.count()) {
    await activateGraphControl(secondaryNode);
    await expect(personCard.locator('.lineage-graph-node.is-selected')).toBeVisible();
    await expect(page.locator('.ant-drawer:visible')).toBeVisible();
    await closeDrawer(page);
  }

  await searchAndSelect(page, '准出始祖');
  await expect(page).toHaveURL(/mode=person/);
  const activeNode = page.locator('.lineage-logic-card--person .lineage-graph-node.is-active').first();
  await activateGraphControl(activeNode);
  const personDrawer = page.locator('.ant-drawer:visible');
  await expect(personDrawer.getByText('来源证据', { exact: true }).first()).toBeVisible();
  await expect(personDrawer.getByText(/1\/1 条正式/)).toBeVisible();
  await expect(personDrawer.getByText(/待审核/).first()).toBeVisible();
  await expect(personDrawer.getByRole('button', { name: '查看来源证据' })).toBeVisible();
  await closeDrawer(page);

  await page.getByText('支派全局', { exact: true }).click();
  await expect(page).toHaveURL(/mode=branch/);
  const branchCard = page.locator('.lineage-logic-card--branch');
  await expect(branchCard.getByRole('heading', { name: '支派全局拓扑' })).toBeVisible();
  const ritualEdge = branchCard.locator('.lineage-graph-edge--ritual').first();
  await expect(ritualEdge).toBeAttached();
  await activateGraphControl(ritualEdge);
  const edgeDrawer = page.locator('.ant-drawer:visible');
  await expect(edgeDrawer.locator('.lineage-edge-pop-head p')).toContainText('宗法承嗣关系');
  await expect(edgeDrawer.getByText('关系类别', { exact: true })).toBeVisible();
  await closeDrawer(page);

  await page.getByText('人物中心', { exact: true }).click();
  await page.route('**/api/v1/tree/person/**', route => route.abort(), { times: 1 });
  await chooseLabelledSelect(page, '人物中心展开深度', '上下各 3 代');
  await page.getByRole('button', { name: '查询图谱', exact: true }).click();
  await expect(page.getByText(/人物图加载失败/)).toBeVisible();
  await page.getByRole('button', { name: '重试' }).last().click();
  await expect(page.getByText(/人物图加载失败/)).toHaveCount(0);
  await expect(page.locator('.lineage-logic-card--person .lineage-graph-node').first()).toBeVisible();

  const urlBeforeReload = page.url();
  await page.reload();
  await expect(page).toHaveURL(urlBeforeReload);
  await expect(page.getByRole('heading', { name: /准出始祖.*中心世系拓扑/ })).toBeVisible();
});

test('minimal viewer receives real graph without internal summaries or protected identities', async ({ page }) => {
  await openTree(page, 'tree_viewer');
  await searchAndSelect(page, '准出始祖');
  await expect(page.getByText('封存秘名')).toHaveCount(0);
  await expect(page.getByText('在世私密')).toHaveCount(0);

  const activeNode = page.locator('.lineage-logic-card--person .lineage-graph-node.is-active').first();
  await activateGraphControl(activeNode);
  const drawer = page.locator('.ant-drawer:visible');
  await expect(drawer.getByText('来源证据', { exact: true })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: '查看来源证据' })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: '进入审核中心' })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: '进入修谱工作台' })).toHaveCount(0);
});
