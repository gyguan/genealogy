import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { functionalRunId, loginThroughUi } from './support/auth';
import { csrfHeaders, requiredNumberEnv, responseData, responsePayload } from './support/api';

async function okData(response: APIResponse) {
  const payload = await responsePayload(response);
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
  expect(payload?.success).not.toBe(false);
  return responseData(payload);
}

function idOf(value: any, label: string) {
  const id = Number(value?.id ?? value?.taskId ?? value?.reviewTaskId);
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

async function resetBrowserSession(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

test.describe('会话、失败恢复、深层世系与稳定性专项', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-STABILITY-001~006 会话、并发幂等与深层世系边界', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const rootPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_ROOT_PERSON_ID');
    const runId = functionalRunId();
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-10) || String(Date.now());
    const personName = `黄稳定性-${runId}`;

    await loginThroughUi(page, 'EDITOR');
    const editorHeaders = await csrfHeaders(page);

    const person = await okData(await page.request.post(`/api/v1/clans/${clanId}/persons`, {
      headers: editorHeaders,
      data: {
        branchId,
        personCode: `ST-${suffix}`,
        name: personName,
        genealogyName: `稳定谱名${suffix}`,
        courtesyName: null,
        aliasName: null,
        gender: 'male',
        generationNo: 5,
        generationWord: null,
        rankInFamily: null,
        birthDate: '1992-03-04',
        birthDatePrecision: 'day',
        deathDate: null,
        deathDatePrecision: null,
        isLiving: true,
        birthPlace: '长沙',
        residencePlace: '多伦多',
        occupation: '工程师',
        education: 'university',
        titleOrHonor: null,
        biography: '#837 会话与稳定性专项人物',
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
    expect(statusOf(person)).toBe('draft');

    const submit = () => page.request.post(`/api/v1/persons/${personId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: '#837 并发提交审核' }
    });
    const [firstSubmit, secondSubmit] = await Promise.all([submit(), submit()]);
    const submitResponses = [firstSubmit, secondSubmit];
    const successfulSubmissions = submitResponses.filter(response => response.ok());
    expect(successfulSubmissions.length).toBe(1);

    const successfulTask = await okData(successfulSubmissions[0]);
    const taskId = idOf(successfulTask, '审核任务');
    const rejectedSubmit = submitResponses.find(response => !response.ok());
    expect(rejectedSubmit).toBeTruthy();
    expect([400, 409]).toContain(rejectedSubmit!.status());

    const personAfterConflict = await okData(await page.request.get(`/api/v1/persons/${personId}`));
    expect(statusOf(personAfterConflict)).toBe('pending_review');
    expect(statusOf(personAfterConflict)).not.toBe('official');

    const reviewRecords = await okData(await page.request.get(`/api/v1/persons/${personId}/review-records`));
    const matchingTasks = recordsOf(reviewRecords).filter((item: any) => Number(item.id ?? item.taskId ?? item.reviewTaskId) === taskId);
    expect(matchingTasks.length).toBeLessThanOrEqual(1);

    await page.context().clearCookies();
    const protectedResponse = await page.request.get(`/api/v1/persons/${personId}`);
    expect(protectedResponse.ok()).toBeFalsy();
    expect([401, 403]).toContain(protectedResponse.status());

    await resetBrowserSession(page);
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录系统', exact: true })).toBeVisible();

    await loginThroughUi(page, 'EDITOR');
    const invalidDepth = await page.request.get(
      `/api/v1/tree/person/${rootPersonId}?direction=descendants&dataView=official&maxDepth=99&maxNodes=3&maxEdges=2`
    );
    expect(invalidDepth.ok()).toBeFalsy();
    expect(invalidDepth.status()).toBe(400);
    expect(JSON.stringify(await responsePayload(invalidDepth))).toMatch(/maxDepth|less than or equal to 20/i);

    const startedAt = Date.now();
    const boundedTree = await okData(await page.request.get(
      `/api/v1/tree/person/${rootPersonId}?direction=descendants&dataView=official&maxDepth=20&maxNodes=3&maxEdges=2`
    ));
    const elapsedMs = Date.now() - startedAt;
    expect(Array.isArray(boundedTree.nodes)).toBeTruthy();
    expect(Array.isArray(boundedTree.edges)).toBeTruthy();
    expect(boundedTree.nodes.length).toBeLessThanOrEqual(3);
    expect(boundedTree.edges.length).toBeLessThanOrEqual(2);
    expect(elapsedMs).toBeLessThan(5000);

    const missingTree = await page.request.get('/api/v1/tree/person/9223372036854775000?direction=descendants&dataView=official&maxDepth=20&maxNodes=3&maxEdges=2');
    expect(missingTree.ok()).toBeFalsy();
    expect([403, 404]).toContain(missingTree.status());
    const missingPayload = await responsePayload(missingTree);
    expect(missingPayload?.success).not.toBe(true);
    expect(JSON.stringify(missingPayload)).not.toMatch(/"total"\s*:\s*0/);

    await testInfo.attach('session-recovery-lineage-stability', {
      body: JSON.stringify({
        clanId,
        branchId,
        personId,
        taskId,
        concurrentStatuses: submitResponses.map(response => response.status()),
        protectedStatusAfterCookieClear: protectedResponse.status(),
        invalidDepthStatus: invalidDepth.status(),
        treeNodeCount: boundedTree.nodes.length,
        treeEdgeCount: boundedTree.edges.length,
        treeElapsedMs: elapsedMs,
        missingTreeStatus: missingTree.status()
      }, null, 2),
      contentType: 'application/json'
    });
  });
});
