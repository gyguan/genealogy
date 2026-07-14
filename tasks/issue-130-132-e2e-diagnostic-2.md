# Auth Playwright diagnostic 2

Exit status: 1

```text

Running 3 tests using 1 worker

[1/3] [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out
  1) [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out 

    Test timeout of 60000ms exceeded.

    Error: locator.click: Test timeout of 60000ms exceeded.
    Call log:
      - waiting for getByRole('button', { name: '完成' })


      71 |   await expect(page.getByRole('dialog', { name: '登录设备' })).toBeVisible();
      72 |   await expect(page.getByText('当前设备')).toBeVisible();
    > 73 |   await page.getByRole('button', { name: '完成' }).click();
         |                                                  ^
      74 |
      75 |   await page.locator('.github-user-trigger').click();
      76 |   await page.getByText('退出登录', { exact: true }).click();
        at /home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:73:50

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/auth-commercial-commercial-decb1-cookie-session-and-logs-out-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/auth-commercial-commercial-decb1-cookie-session-and-logs-out-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/auth-commercial-commercial-decb1-cookie-session-and-logs-out-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/auth-commercial-commercial-decb1-cookie-session-and-logs-out-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/auth-commercial-commercial-decb1-cookie-session-and-logs-out-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────


[2/3] [chromium] › e2e/auth-commercial.spec.ts:82:1 › password reset is single-use and revokes the existing browser session
[3/3] [chromium] › e2e/auth-commercial.spec.ts:117:1 › clan administrator invitation creates only the approved member scope
  2) [chromium] › e2e/auth-commercial.spec.ts:117:1 › clan administrator invitation creates only the approved member scope 

    Test timeout of 60000ms exceeded.

    Error: locator.fill: Test ended.
    Call log:
      - waiting for getByLabel('密码', { exact: true })


      147 |   await invitedPage.getByLabel('显示名称').fill(invited.displayName);
      148 |   await invitedPage.getByLabel('邮箱（选填）').fill(invited.email);
    > 149 |   await invitedPage.getByLabel('密码', { exact: true }).fill(invited.password);
          |                                                       ^
      150 |   await invitedPage.getByLabel('确认密码').fill(invited.password);
      151 |   await invitedPage.getByRole('button', { name: '接受邀请并开通账号' }).click();
      152 |   await expect(invitedPage.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
        at /home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:149:55

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/test-failed-2.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────


  2 failed
    [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out 
    [chromium] › e2e/auth-commercial.spec.ts:117:1 › clan administrator invitation creates only the approved member scope 
  1 passed (2.2m)
```
