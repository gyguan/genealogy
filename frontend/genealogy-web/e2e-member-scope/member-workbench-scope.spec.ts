import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  csrfHeaders,
  dataOf,
  login,
  okData,
  payload,
  recordsOf,
  requiredEnv,
  requiredNumberEnv
} from './support';

async function createLoggedPage(browser: Browser, username: string, password: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, username, password);
  return { context, page };
}

async function memberRecord(adminPage: Page, clanId: number, userId: number) {
  const result = await okData(await adminPage.request.get(
    `/api/v1/clans/${clanId}/members?pageNo=1&pageSize=100`
  ));
  const member = recordsOf(result).find((item: any) => Number(item.userId) === userId);
  expect(member, `成员列表必须包含 userId=${userId}`).toBeTruthy();
  return member;
}

async function grantBranchAdmin(adminPage: Page, clanId: number, userId: number, branchId: number, reason: string) {
  const headers = await csrfHeaders(adminPage);
  return okData(await adminPage.request.post(`/api/v1/clans/${clanId}/member-grants`, {
    headers,
    data: {
      userId,
      roleCode: 'branch_admin',
      scopeType: 'branch_subtree',
      scopeId: branchId,
      reason
    }
  }));
}

async function expectForbidden(response: any, pattern = /AUTH_FORBIDDEN|MEMBER_GRANT_FORBIDDEN|暂无权限|不是该宗族/) {
  const value = await payload(response);
  expect(response.ok(), JSON.stringify(value)).toBeFalsy();
  expect(response.status()).toBeGreaterThanOrEqual(403);
  expect(JSON.stringify(value)).toMatch(pattern);
}

test.describe('成员授权、支派范围与修谱协作闭环', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-MEMBER-001~008 / FT-WORKBENCH-001 完整协作链', async ({ browser }, testInfo) => {
    const clanId = requiredNumberEnv('MEMBER_SCOPE_CLAN_ID');
    const rootBranchId = requiredNumberEnv('MEMBER_SCOPE_ROOT_BRANCH_ID');
    const childBranchId = requiredNumberEnv('MEMBER_SCOPE_CHILD_BRANCH_ID');
    const siblingBranchId = requiredNumberEnv('MEMBER_SCOPE_SIBLING_BRANCH_ID');
    const adminUserId = requiredNumberEnv('MEMBER_SCOPE_ADMIN_USER_ID');
    const collaboratorUserId = requiredNumberEnv('MEMBER_SCOPE_COLLABORATOR_USER_ID');
    const rootPersonName = requiredEnv('MEMBER_SCOPE_ROOT_PERSON_NAME');
    const childPersonName = requiredEnv('MEMBER_SCOPE_CHILD_PERSON_NAME');
    const siblingPersonName = requiredEnv('MEMBER_SCOPE_SIBLING_PERSON_NAME');

    const adminUsername = requiredEnv('MEMBER_SCOPE_ADMIN_USERNAME');
    const adminPassword = requiredEnv('MEMBER_SCOPE_ADMIN_PASSWORD');
    const collaboratorUsername = requiredEnv('MEMBER_SCOPE_COLLABORATOR_USERNAME');
    const collaboratorPassword = requiredEnv('MEMBER_SCOPE_COLLABORATOR_PASSWORD');

    const adminSession = await createLoggedPage(browser, adminUsername, adminPassword);
    const adminPage = adminSession.page;
    const adminHeaders = await csrfHeaders(adminPage);

    const candidates = await okData(await adminPage.request.get(
      `/api/v1/clans/${clanId}/member-candidates?keyword=${encodeURIComponent(collaboratorUsername)}&pageNo=1&pageSize=20`
    ));
    expect(recordsOf(candidates).some((item: any) => Number(item.userId) === collaboratorUserId)).toBeTruthy();

    const grant = await grantBranchAdmin(
      adminPage,
      clanId,
      collaboratorUserId,
      rootBranchId,
      '#834 授予核心支派及下级支派管理员'
    );
    const firstGrantId = Number(grant.grantId ?? grant.id);
    expect(firstGrantId).toBeGreaterThan(0);

    const collaboratorMember = await memberRecord(adminPage, clanId, collaboratorUserId);
    const membershipId = Number(collaboratorMember.membershipId);
    expect(membershipId).toBeGreaterThan(0);
    expect(collaboratorMember.grants.some((item: any) => Number(item.grantId) === firstGrantId)).toBeTruthy();

    const adminMember = await memberRecord(adminPage, clanId, adminUserId);
    const lastAdminGrant = adminMember.grants.find((item: any) => item.roleCode === 'clan_admin');
    expect(lastAdminGrant, '建族账号必须拥有宗族管理员授权').toBeTruthy();
    const lastAdminRevoke = await adminPage.request.post(
      `/api/v1/clans/${clanId}/member-grants/${lastAdminGrant.grantId}/revoke`,
      { headers: adminHeaders, data: { reason: '#834 验证最后管理员保护' } }
    );
    expect(lastAdminRevoke.ok()).toBeFalsy();
    expect(JSON.stringify(await payload(lastAdminRevoke))).toMatch(/LAST_CLAN_ADMIN_REQUIRED|最后一名|至少保留/);

    const collaboratorSession = await createLoggedPage(browser, collaboratorUsername, collaboratorPassword);
    const collaboratorPage = collaboratorSession.page;

    const visibleBranches = await okData(await collaboratorPage.request.get(`/api/v1/clans/${clanId}/branches`));
    const branchJson = JSON.stringify(visibleBranches);
    expect(visibleBranches.map((item: any) => Number(item.id))).toEqual(expect.arrayContaining([rootBranchId, childBranchId]));
    expect(visibleBranches.map((item: any) => Number(item.id))).not.toContain(siblingBranchId);
    expect(branchJson).not.toContain('兄弟支派');

    await okData(await collaboratorPage.request.get(`/api/v1/branches/${childBranchId}`));
    await expectForbidden(await collaboratorPage.request.get(`/api/v1/branches/${siblingBranchId}`));

    const workbench = await okData(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&pageNo=1&pageSize=100`
    ));
    const workbenchRecords = recordsOf(workbench);
    const workbenchJson = JSON.stringify(workbench);
    expect(Number(dataOf(workbench).total)).toBe(workbenchRecords.length);
    expect(workbenchJson).toContain(rootPersonName);
    expect(workbenchJson).toContain(childPersonName);
    expect(workbenchJson).not.toContain(siblingPersonName);
    expect(workbenchJson).not.toContain('兄弟支派');

    await okData(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&branchId=${childBranchId}&pageNo=1&pageSize=100`
    ));
    await expectForbidden(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&branchId=${siblingBranchId}&pageNo=1&pageSize=100`
    ));

    const workbenchMenu = collaboratorPage.getByText('修谱工作台', { exact: true }).first();
    await expect(workbenchMenu).toBeVisible();
    await workbenchMenu.click();
    await expect(collaboratorPage.getByText(rootPersonName, { exact: false }).first()).toBeVisible();
    await expect(collaboratorPage.getByText(childPersonName, { exact: false }).first()).toBeVisible();
    await expect(collaboratorPage.getByText(siblingPersonName, { exact: false })).toHaveCount(0);

    const revoked = await adminPage.request.post(
      `/api/v1/clans/${clanId}/member-grants/${firstGrantId}/revoke`,
      { headers: adminHeaders, data: { reason: '#834 验证撤销授权即时失效' } }
    );
    await okData(revoked);
    await expectForbidden(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&pageNo=1&pageSize=100`
    ));

    const restoredGrant = await grantBranchAdmin(
      adminPage,
      clanId,
      collaboratorUserId,
      rootBranchId,
      '#834 恢复支派管理员授权'
    );
    const restoredGrantId = Number(restoredGrant.grantId ?? restoredGrant.id);
    expect(restoredGrantId).toBeGreaterThan(0);
    await okData(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&pageNo=1&pageSize=100`
    ));

    await okData(await adminPage.request.patch(
      `/api/v1/clans/${clanId}/members/${membershipId}/status`,
      { headers: adminHeaders, data: { status: 'disabled', reason: '#834 验证成员停用即时失效' } }
    ));
    await expectForbidden(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&pageNo=1&pageSize=100`
    ));

    await okData(await adminPage.request.patch(
      `/api/v1/clans/${clanId}/members/${membershipId}/status`,
      { headers: adminHeaders, data: { status: 'active', reason: '#834 恢复成员继续协作' } }
    ));
    await okData(await collaboratorPage.request.get(
      `/api/v1/workbench/tasks?clanId=${clanId}&pageNo=1&pageSize=100`
    ));

    const audits = await okData(await adminPage.request.get(
      `/api/v1/clans/${clanId}/member-permission-audits?membershipId=${membershipId}&pageNo=1&pageSize=100`
    ));
    const auditJson = JSON.stringify(audits);
    expect(auditJson).toContain('member_grant_create');
    expect(auditJson).toContain('member_grant_revoke');
    expect(auditJson).toContain('member_status_update');
    expect(auditJson).toContain('#834');

    const firstVisibleTask = workbenchRecords[0];
    expect(firstVisibleTask?.key, '工作台必须返回至少一条可见任务').toBeTruthy();
    const taskAction = await collaboratorPage.request.post(
      `/api/v1/workbench/tasks/${encodeURIComponent(firstVisibleTask.key)}/actions`,
      {
        headers: await csrfHeaders(collaboratorPage),
        data: {
          action: 'mark_checked',
          comment: '#834 验证工作台任务核查动作',
          expectedUpdatedAt: firstVisibleTask.updatedAt ?? null
        }
      }
    );
    expect(taskAction.status(), '工作台 UI 已暴露批量核查动作，后端必须提供非 404 的真实契约').not.toBe(404);

    await testInfo.attach('member-scope-chain', {
      body: JSON.stringify({
        clanId,
        rootBranchId,
        childBranchId,
        siblingBranchId,
        membershipId,
        firstGrantId,
        restoredGrantId,
        visibleTaskTotal: workbenchRecords.length
      }, null, 2),
      contentType: 'application/json'
    });

    await collaboratorSession.context.close();
    await adminSession.context.close();
  });
});
