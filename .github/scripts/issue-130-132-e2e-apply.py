import json
from pathlib import Path

frontend = Path('frontend/genealogy-web')
package_path = frontend / 'package.json'
package = json.loads(package_path.read_text())
package['scripts']['test:e2e'] = 'playwright test'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n')

(frontend / 'playwright.config.ts').write_text('''import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
''')

(frontend / 'e2e').mkdir(exist_ok=True)
(frontend / 'e2e' / 'auth-commercial.spec.ts').write_text(r'''import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

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
  await page.getByLabel('账号').fill(username);
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
  await page.getByLabel('账号').fill(user.username);
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
  await page.getByRole('button', { name: '完成' }).click();

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
  await invitedPage.getByLabel('密码', { exact: true }).fill(invited.password);
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
''')

Path('.github/workflows/auth-commercial-e2e.yml').write_text('''name: Auth Commercial E2E

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  auth-e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: genealogy
          POSTGRES_USER: genealogy
          POSTGRES_PASSWORD: genealogy
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U genealogy -d genealogy"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
          cache: maven
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: frontend/genealogy-web/package-lock.json
      - name: Install frontend dependencies
        working-directory: frontend/genealogy-web
        run: npm ci
      - name: Install Chromium
        working-directory: frontend/genealogy-web
        run: npx playwright install --with-deps chromium
      - name: Verify frontend contract and production build
        working-directory: frontend/genealogy-web
        run: |
          npm run test:auth
          npm run test:members
          npm run typecheck
          npm run api:check
          npm run build
          ! grep -R -E "demo_admin|Admin@123456|genealogy\\.token.*setItem" dist src/features/auth
      - name: Start backend
        working-directory: backend/genealogy-backend
        env:
          SPRING_DATASOURCE_URL: jdbc:postgresql://localhost:5432/genealogy
          SPRING_DATASOURCE_USERNAME: genealogy
          SPRING_DATASOURCE_PASSWORD: genealogy
          SPRING_FLYWAY_ENABLED: 'true'
          GENEALOGY_AUTH_PUBLIC_REGISTRATION_ENABLED: 'true'
          GENEALOGY_AUTH_EXPOSE_RESET_TOKEN: 'true'
          GENEALOGY_AUTH_LOGIN_COOLDOWN_MINUTES: '1'
        run: |
          mvn -q -DskipTests package
          nohup java -jar target/genealogy-backend-0.1.0-SNAPSHOT.jar >/tmp/auth-e2e-backend.log 2>&1 &
      - name: Start frontend
        working-directory: frontend/genealogy-web
        run: nohup npm run dev >/tmp/auth-e2e-frontend.log 2>&1 &
      - name: Wait for services
        run: |
          for i in $(seq 1 60); do
            curl -fsS http://127.0.0.1:8080/api/v1/health >/dev/null && curl -fsS http://127.0.0.1:5179 >/dev/null && exit 0
            sleep 2
          done
          tail -n 160 /tmp/auth-e2e-backend.log || true
          tail -n 80 /tmp/auth-e2e-frontend.log || true
          exit 1
      - name: Run browser authentication E2E
        working-directory: frontend/genealogy-web
        env:
          CI: 'true'
        run: npm run test:e2e
      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: auth-playwright-report
          path: frontend/genealogy-web/playwright-report
          if-no-files-found: ignore
''')
