import { expect, test } from '@playwright/test';
import { loginThroughUi } from './support/auth';
import { responseData, responsePayload } from './support/api';

function normalizePermissionCode(value: unknown) {
  return String(value || '').trim().replaceAll('.', ':').toLowerCase();
}

test.describe('完整业务链审核角色初始化', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-PERM-008 reviewer 角色包含来源绑定审核权限', async ({ page }) => {
    await loginThroughUi(page, 'REVIEWER');

    const rolesResponse = await page.request.get('/api/v1/member-management/roles');
    expect(rolesResponse.ok(), await rolesResponse.text()).toBeTruthy();
    const roles = responseData(await responsePayload(rolesResponse));
    expect(Array.isArray(roles)).toBeTruthy();

    const reviewerRole = roles.find((role: any) => role.roleCode === 'reviewer');
    expect(reviewerRole, '系统必须存在 reviewer 角色').toBeTruthy();

    const permissionsResponse = await page.request.get(`/api/v1/member-management/roles/${reviewerRole.id}/permissions`);
    expect(permissionsResponse.ok(), await permissionsResponse.text()).toBeTruthy();
    const permissions = responseData(await responsePayload(permissionsResponse));
    expect(Array.isArray(permissions)).toBeTruthy();
    expect(
      permissions.some((item: any) => normalizePermissionCode(item.permissionCode) === 'source:review'),
      'reviewer 角色必须包含 source.review/source:review'
    ).toBeTruthy();
  });
});
