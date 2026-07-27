import { expect, test, type Page } from '@playwright/test';
import { loginThroughUi } from './support/auth';
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

test.describe.serial('真实审核治理与世系查询', () => {
  test('FT-PERM-004 / FT-REVIEW-002 提交人自审被拒绝，独立审核员可正式生效', async ({ page }) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');

    await loginThroughUi(page, 'EDITOR');
    const editorHeaders = await csrfHeaders(page);
    const submitResponse = await page.request.post(`/api/v1/clans/${clanId}/review-tasks`, {
      headers: editorHeaders,
      data: {
        targetType: 'clan',
        targetId: clanId,
        changeType: 'submit_review',
        comment: 'FT-REVIEW-001 提交宗族审核'
      }
    });
    expect(submitResponse.ok(), await submitResponse.text()).toBeTruthy();
    const task = responseData(await responsePayload(submitResponse));
    expect(Number(task.id)).toBeGreaterThan(0);
    expect(task.status).toBe('pending');

    const selfApproveResponse = await page.request.post(`/api/v1/review-tasks/${task.id}/approve`, {
      headers: editorHeaders,
      data: { reviewerId: null, comment: '提交人尝试自审' }
    });
    expect(selfApproveResponse.ok()).toBeFalsy();
    const selfApprovePayload = await responsePayload(selfApproveResponse);
    expect(JSON.stringify(selfApprovePayload)).toContain('REVIEW_SELF_DECISION_FORBIDDEN');

    const pendingResponse = await page.request.get(`/api/v1/review-tasks/${task.id}`);
    expect(pendingResponse.ok(), await pendingResponse.text()).toBeTruthy();
    const pendingDetail = responseData(await responsePayload(pendingResponse));
    expect(pendingDetail?.task?.status ?? pendingDetail?.status).toBe('pending');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    const reviewerHeaders = await csrfHeaders(page);
    const approveResponse = await page.request.post(`/api/v1/review-tasks/${task.id}/approve`, {
      headers: reviewerHeaders,
      data: { reviewerId: null, comment: '独立审核员通过' }
    });
    expect(approveResponse.ok(), await approveResponse.text()).toBeTruthy();
    const approvedTask = responseData(await responsePayload(approveResponse));
    expect(approvedTask.status).toBe('approved');

    const clanResponse = await page.request.get(`/api/v1/clans/${clanId}`);
    expect(clanResponse.ok(), await clanResponse.text()).toBeTruthy();
    expect(responseData(await responsePayload(clanResponse)).status).toBe('official');
  });

  test('FT-TREE-001 真实三代关系可查询人物中心世系', async ({ page }) => {
    const rootPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_ROOT_PERSON_ID');
    const childPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CHILD_PERSON_ID');

    await loginThroughUi(page, 'EDITOR');
    const treeResponse = await page.request.get(
      `/api/v1/tree/person/${rootPersonId}?direction=descendants&dataView=official&maxDepth=5&maxNodes=100&maxEdges=200`
    );
    expect(treeResponse.ok(), await treeResponse.text()).toBeTruthy();
    const graph = responseData(await responsePayload(treeResponse));
    expect(graph.rootPersonId).toBe(rootPersonId);
    expect(Array.isArray(graph.nodes)).toBeTruthy();
    expect(Array.isArray(graph.edges)).toBeTruthy();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(graph.nodes)).toContain(String(childPersonId));
  });

  test('FT-PERM-007 其他宗族账号不能读取核心宗族支派', async ({ page }) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');

    await loginThroughUi(page, 'VIEWER');
    const response = await page.request.get(`/api/v1/clans/${clanId}/branches`);
    expect(response.status()).toBe(403);
    expect(JSON.stringify(await responsePayload(response))).toMatch(/AUTH_FORBIDDEN|无权|不是该宗族成员/);
  });
});
