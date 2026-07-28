import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { functionalRunId, loginThroughUi } from './support/auth';
import { csrfHeaders, requiredNumberEnv, responseData, responsePayload } from './support/api';

async function resetBrowserSession(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

async function okData(response: APIResponse) {
  const payload = await responsePayload(response);
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
  expect(payload?.success).not.toBe(false);
  return responseData(payload);
}

function idOf(value: any, label: string) {
  const id = Number(value?.id ?? value?.taskId ?? value?.reviewTaskId ?? value?.revisionId);
  expect(id, `${label} 必须返回有效 ID`).toBeGreaterThan(0);
  return id;
}

function statusOf(value: any) {
  return String(value?.dataStatus ?? value?.taskStatus ?? value?.status ?? '').toLowerCase();
}

function recordsOf(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

async function approve(page: Page, headers: Record<string, string>, taskId: number, comment: string) {
  const result = await okData(await page.request.post(`/api/v1/review-tasks/${taskId}/approve`, {
    headers,
    data: { reviewerId: null, comment }
  }));
  expect(statusOf(result)).toBe('approved');
  return result;
}

test.describe('查询展示、文化与审计追溯一致性', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-QUERY-001~006 / FT-AUDIT-003~005 完整查询与追溯链', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const rootPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_ROOT_PERSON_ID');
    const runId = functionalRunId();
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-10) || String(Date.now());
    const personName = `黄查询追溯-${runId}`;
    const sourceName = `查询追溯来源-${runId}`;

    await loginThroughUi(page, 'EDITOR');
    let editorHeaders = await csrfHeaders(page);

    const person = await okData(await page.request.post(`/api/v1/clans/${clanId}/persons`, {
      headers: editorHeaders,
      data: {
        branchId,
        personCode: `QA-${suffix}`,
        name: personName,
        genealogyName: `追溯谱名${suffix}`,
        courtesyName: null,
        aliasName: null,
        gender: 'male',
        generationNo: 4,
        generationWord: null,
        rankInFamily: null,
        birthDate: '1991-02-03',
        birthDatePrecision: 'day',
        deathDate: null,
        deathDatePrecision: null,
        isLiving: true,
        birthPlace: '长沙',
        residencePlace: '多伦多',
        occupation: '工程师',
        education: 'university',
        titleOrHonor: null,
        biography: '#835 查询展示与审计追溯测试人物',
        tombPlace: null,
        epitaph: null,
        hasDescendant: false,
        lineageStatus: 'normal',
        privacyLevel: 'clan_only',
        dataStatus: 'draft',
        confirmDuplicate: true
      }
    }));
    const personId = idOf(person, '人物');

    const source = await okData(await page.request.post(`/api/v1/clans/${clanId}/sources`, {
      headers: editorHeaders,
      data: {
        sourceName,
        sourceType: 'genealogy_book',
        providerName: '#835 测试提供者',
        bookTitle: '查询追溯测试谱',
        volumeNo: '卷一',
        pageNo: '第835页',
        sourceDate: '2026',
        excerpt: `${personName}，查询追溯测试。`,
        description: '#835 来源详情与状态一致性',
        confidenceLevel: 'high',
        privacyLevel: 'clan_only',
        sensitiveLevel: 'normal',
        submitReview: false
      }
    }));
    const sourceId = idOf(source, '来源');

    const personTask = await okData(await page.request.post(`/api/v1/persons/${personId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: '#835 提交查询展示测试人物' }
    }));
    const sourceTask = await okData(await page.request.post(`/api/v1/sources/${sourceId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: '#835 提交查询展示测试来源' }
    }));
    const personTaskId = idOf(personTask, '人物审核任务');
    const sourceTaskId = idOf(sourceTask, '来源审核任务');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    const reviewerHeaders = await csrfHeaders(page);

    const taskDetail = await okData(await page.request.get(`/api/v1/review-tasks/${personTaskId}`));
    const taskDiff = await okData(await page.request.get(`/api/v1/review-tasks/${personTaskId}/diff`));
    expect(Number(taskDetail?.task?.id ?? taskDetail?.id)).toBe(personTaskId);
    expect(Number(taskDiff.reviewTaskId)).toBe(personTaskId);
    expect(Number(taskDiff.targetId)).toBe(personId);
    expect(taskDiff.targetType).toBe('person');
    expect(Array.isArray(taskDiff.fields)).toBeTruthy();
    expect(Number(taskDiff.revisionId)).toBeGreaterThan(0);
    expect(taskDiff.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldName: 'dataStatus',
        beforeValue: 'draft',
        afterValue: 'pending_review',
        changeType: 'modified'
      })
    ]));

    await approve(page, reviewerHeaders, personTaskId, '#835 人物审核通过');
    await approve(page, reviewerHeaders, sourceTaskId, '#835 来源审核通过');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');

    const officialPerson = await okData(await page.request.get(`/api/v1/persons/${personId}`));
    const officialSource = await okData(await page.request.get(`/api/v1/sources/${sourceId}`));
    expect(statusOf(officialPerson)).toBe('official');
    expect(officialPerson.name).toBe(personName);
    expect(officialSource.sourceName).toBe(sourceName);

    const firstPage = await okData(await page.request.get(
      `/api/v1/persons/search?clanId=${clanId}&name=${encodeURIComponent(personName)}&dataStatus=official&pageNo=1&pageSize=1&sort=updatedAt,desc`
    ));
    expect(Number(firstPage.total)).toBe(1);
    expect(recordsOf(firstPage)[0]?.name).toBe(personName);

    const emptySecondPage = await okData(await page.request.get(
      `/api/v1/persons/search?clanId=${clanId}&name=${encodeURIComponent(personName)}&dataStatus=official&pageNo=2&pageSize=1&sort=updatedAt,desc`
    ));
    expect(Number(emptySecondPage.total)).toBe(1);
    expect(recordsOf(emptySecondPage)).toHaveLength(0);

    const tree = await okData(await page.request.get(
      `/api/v1/tree/person/${rootPersonId}?direction=descendants&dataView=official&maxDepth=6&maxNodes=100&maxEdges=200`
    ));
    expect(Array.isArray(tree.nodes)).toBeTruthy();
    expect(Array.isArray(tree.edges)).toBeTruthy();

    const reviewRecords = await okData(await page.request.get(`/api/v1/persons/${personId}/review-records`));
    expect(recordsOf(reviewRecords).some((item: any) => statusOf(item) === 'approved')).toBeTruthy();
    expect(JSON.stringify(reviewRecords)).toContain(String(personTaskId));

    await page.getByRole('menuitem', { name: '人物档案', exact: true }).click();
    await page.getByPlaceholder('请输入姓名').fill(personName);
    await page.getByRole('button', { name: /^查\s*询$/ }).click();
    await expect(page).toHaveURL(new RegExp(`view=personArchive.*name=${encodeURIComponent(personName)}`));
    await expect(page.getByRole('button', { name: personName, exact: true }).first()).toBeVisible();

    const queryUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(queryUrl);
    await expect(page.getByRole('button', { name: personName, exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: personName, exact: true }).first().click();
    await expect(page.getByText(personName, { exact: true }).first()).toBeVisible();
    expect(page.url()).toContain(String(personId));
    const detailUrl = page.url();

    await page.goBack();
    await expect(page).toHaveURL(queryUrl);
    await expect(page.getByRole('button', { name: personName, exact: true }).first()).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(detailUrl);
    await expect(page.getByText(personName, { exact: true }).first()).toBeVisible();

    await page.getByRole('menuitem', { name: '来源资料库', exact: true }).click();
    await expect(page).toHaveURL(/view=sourceLibrary/);
    await expect(page.getByText('来源资料', { exact: false }).first()).toBeVisible();

    await page.getByRole('menuitem', { name: '世系图谱', exact: true }).click();
    await expect(page).toHaveURL(/view=treeProduct/);
    await expect(page.getByText('世系', { exact: false }).first()).toBeVisible();

    await page.getByRole('menuitem', { name: '宗族文化', exact: true }).click();
    await expect(page).toHaveURL(/view=culture/);
    await expect(page.getByText('宗族文化', { exact: false }).first()).toBeVisible();

    await page.getByRole('menuitem', { name: '审计追踪', exact: true }).click();
    await expect(page).toHaveURL(/view=auditTrace/);
    await expect(page.getByText('审计追踪', { exact: false }).first()).toBeVisible();

    await resetBrowserSession(page);
    await loginThroughUi(page, 'RESTRICTED');
    const crossClanPerson = await page.request.get(`/api/v1/persons/${personId}`);
    const crossClanSource = await page.request.get(`/api/v1/sources/${sourceId}`);
    expect(crossClanPerson.ok()).toBeFalsy();
    expect(crossClanSource.ok()).toBeFalsy();
    expect(crossClanPerson.status()).toBeGreaterThanOrEqual(403);
    expect(crossClanSource.status()).toBeGreaterThanOrEqual(403);
    expect(JSON.stringify(await responsePayload(crossClanPerson))).not.toContain(personName);
    expect(JSON.stringify(await responsePayload(crossClanSource))).not.toContain(sourceName);

    const missingReviewTask = await page.request.get('/api/v1/review-tasks/9223372036854775000');
    expect(missingReviewTask.ok()).toBeFalsy();
    expect([403, 404]).toContain(missingReviewTask.status());

    await testInfo.attach('query-culture-audit-chain', {
      body: JSON.stringify({
        clanId,
        branchId,
        personId,
        sourceId,
        personTaskId,
        sourceTaskId,
        revisionId: Number(taskDiff.revisionId),
        queryUrl,
        detailUrl,
        treeNodeCount: tree.nodes.length,
        treeEdgeCount: tree.edges.length,
        crossClanStatuses: [crossClanPerson.status(), crossClanSource.status()],
        missingReviewTaskStatus: missingReviewTask.status()
      }, null, 2),
      contentType: 'application/json'
    });
  });
});