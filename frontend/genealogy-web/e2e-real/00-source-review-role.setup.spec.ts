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

function normalizePermissionCode(value: unknown) {
  return String(value || '').trim().replaceAll('.', ':').toLowerCase();
}

test.describe('完整业务链审核角色初始化', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-PERM-008 通过正式成员授权 API 配置来源审核权限', async ({ page }) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');

    await loginThroughUi(page, 'REVIEWER');
    const meResponse = await page.request.get('/api/v1/auth/me');
    expect(meResponse.ok(), await meResponse.text()).toBeTruthy();
    const reviewer = responseData(await responsePayload(meResponse));
    const reviewerUserId = Number(reviewer?.id);
    expect(reviewerUserId).toBeGreaterThan(0);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    const editorHeaders = await csrfHeaders(page);

    const rolesResponse = await page.request.get('/api/v1/member-management/roles');
    expect(rolesResponse.ok(), await rolesResponse.text()).toBeTruthy();
    const roles = responseData(await responsePayload(rolesResponse));
    expect(Array.isArray(roles)).toBeTruthy();

    let sourceReviewRole: any;
    for (const role of roles) {
      const permissionsResponse = await page.request.get(`/api/v1/member-management/roles/${role.id}/permissions`);
      expect(permissionsResponse.ok(), await permissionsResponse.text()).toBeTruthy();
      const permissions = responseData(await responsePayload(permissionsResponse));
      if (Array.isArray(permissions)
          && permissions.some(item => normalizePermissionCode(item.permissionCode) === 'source:review')) {
        sourceReviewRole = role;
        break;
      }
    }

    expect(sourceReviewRole, '系统必须存在包含 source.review/source:review 的可授权角色').toBeTruthy();
    const grantResponse = await page.request.post(`/api/v1/clans/${clanId}/member-grants`, {
      headers: editorHeaders,
      data: {
        userId: reviewerUserId,
        roleCode: sourceReviewRole.roleCode,
        scopeType: 'clan',
        scopeId: clanId,
        reason: '完整业务链测试授予来源审核权限'
      }
    });
    const grantPayload = await responsePayload(grantResponse);
    expect(grantResponse.ok(), JSON.stringify(grantPayload)).toBeTruthy();
    const grant = responseData(grantPayload);
    expect(Number(grant?.grantId)).toBeGreaterThan(0);
    expect(grant?.roleCode).toBe(sourceReviewRole.roleCode);
  });
});
