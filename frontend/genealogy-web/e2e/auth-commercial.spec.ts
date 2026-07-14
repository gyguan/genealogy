import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8080/api/v1';

function identity(prefix: string) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    username: `${prefix}_${suffix}`,
    password: `Passw0rd!${suffix}`,
    displayName: `${prefix}-${suffix}`,
    email: `${prefix}_${suffix}@example.test`
  };
}

async function register(request: APIRequestContext, prefix: string) {
  const user = identity(prefix);
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: {
      username: user.username,
      password: user.password,
      displayName: user.displayName,
      email: user.email
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return user;
}

async function login(page: Page, username: string, password: string) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await page.getByRole('textbox', { name: '账号', exact: true }).fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await expect(page.locator('.github-user-trigger')).toBeVisible();
}

async function csrf(context: BrowserContext) {
  const cookie = (await context.cookies()).find(item => item.name === 'GENEALOGY_CSRF');
  expect(cookie?.value).toBeTruthy();
  return cookie!.value;
}

async function authenticatedPost(context: BrowserContext, path: string, data: unknown) {
  const response = await context.request.post(`${API_BASE}${path}`, {
    data,
    headers: { 'X-CSRF-Token': await csrf(context) }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test('commercial login rejects bad credentials, restores cookie session and logs out', async ({ page, request }) => {
  const user = await register(request, 'login');

  await page.goto('/');
  await page.getByRole('textbox', { name: '账号', exact: true }).fill(user.username);
  await page.getByLabel('密码').fill('DefinitelyWrongPassword!');
  await page.getByRole('button', { name: '登录系统' }).click();
  await expect(page.getByText('用户名或密码错误')).toBeVisible();

  await page.getByLabel('密码').fill(user.password);
  await page.getByRole('button', { name: '登录系统' }).click();
  await expect(page.locator('.github-user-trigger')).toContainText(user.displayName);

  await page.reload();
  await expect(page.locator('.github-user-trigger')).toContainText(user.displayName);

  await page.locator('.github-user-trigger').click();
  await page.getByText('登录设备', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: '登录设备' })).toBeVisible();
  await expect(page.getByText('当前设备')).toBeVisible();
  await page.getByRole('dialog', { name: '登录设备' }).locator('button.ant-modal-close').click();
  await expect(page.getByRole('dialog', { name: '登录设备' })).toBeHidden();

  await page.locator('.github-user-trigger').click();
  await page.getByText('退出登录', { exact: true }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  const me = await page.context().request.get(`${API_BASE}/auth/me`);
  expect(me.status()).toBe(401);
});

test('password reset is single-use and revokes the existing browser session', async ({ browser, request }) => {
  const user = await register(request, 'reset');
  const activeContext = await browser.newContext();
  const activePage = await activeContext.newPage();
  await login(activePage, user.username, user.password);

  const forgot = await request.post(`${API_BASE}/auth/password/forgot`, { data: { account: user.email } });
  expect(forgot.ok(), await forgot.text()).toBeTruthy();
  const forgotPayload = await forgot.json();
  const resetToken = forgotPayload?.data?.developmentToken;
  expect(resetToken).toBeTruthy();

  const resetContext = await browser.newContext();
  const resetPage = await resetContext.newPage();
  await resetPage.goto(`/?auth=reset&resetToken=${encodeURIComponent(resetToken)}`);
  await expect(resetPage.getByRole('heading', { name: '设置新密码' })).toBeVisible();
  const newPassword = `${user.password}New`;
  await resetPage.getByLabel('新密码', { exact: true }).fill(newPassword);
  await resetPage.getByLabel('确认新密码').fill(newPassword);
  await resetPage.getByRole('button', { name: '确认重置密码' }).click();
  await expect(resetPage.getByRole('heading', { name: '欢迎回来' })).toBeVisible();

  const oldSession = await activeContext.request.get(`${API_BASE}/auth/me`);
  expect(oldSession.status()).toBe(401);

  const replay = await request.post(`${API_BASE}/auth/password/reset`, {
    data: { resetToken, newPassword: `${newPassword}Again` }
  });
  expect(replay.ok()).toBeFalsy();

  await login(resetPage, user.username, newPassword);
  await activeContext.close();
  await resetContext.close();
});

test('clan administrator invitation creates only the approved member scope', async ({ browser, request }) => {
  const admin = await register(request, 'admin');
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, admin.username, admin.password);

  const clanPayload = await authenticatedPost(adminContext, '/clans', {
    clanName: `测试宗族-${Date.now()}`,
    surname: '测',
    description: 'Playwright controlled onboarding test'
  });
  const clanId = clanPayload?.data?.id;
  expect(clanId).toBeTruthy();

  const invited = identity('invited');
  const invitationPayload = await authenticatedPost(adminContext, '/auth/invitations', {
    clanId,
    email: invited.email,
    roleCode: 'viewer',
    scopeType: 'clan',
    scopeId: clanId
  });
  const invitationToken = invitationPayload?.data?.invitationToken;
  expect(invitationToken).toBeTruthy();

  const invitedContext = await browser.newContext();
  const invitedPage = await invitedContext.newPage();
  await invitedPage.goto(`/?auth=invite&invitationToken=${encodeURIComponent(invitationToken)}`);
  await expect(invitedPage.getByRole('heading', { name: '接受宗族邀请' })).toBeVisible();
  await invitedPage.getByLabel('登录账号').fill(invited.username);
  await invitedPage.getByLabel('显示名称').fill(invited.displayName);
  await invitedPage.getByLabel('邮箱（选填）').fill(invited.email);
  await invitedPage.getByLabel('设置密码', { exact: true }).fill(invited.password);
  await invitedPage.getByLabel('确认密码').fill(invited.password);
  await invitedPage.getByRole('button', { name: '接受邀请并开通账号' }).click();
  await expect(invitedPage.getByRole('heading', { name: '欢迎回来' })).toBeVisible();

  await login(invitedPage, invited.username, invited.password);
  const clans = await invitedContext.request.get(`${API_BASE}/clans?pageNo=1&pageSize=20`);
  expect(clans.ok(), await clans.text()).toBeTruthy();
  const clanList = await clans.json();
  expect(clanList?.data?.records?.some((item: { id: number }) => item.id === clanId)).toBeTruthy();

  await adminContext.close();
  await invitedContext.close();
});
