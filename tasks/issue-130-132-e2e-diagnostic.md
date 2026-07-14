# Auth Playwright diagnostic

Exit status: 1

```text

Running 3 tests using 1 worker

[1/3] [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out
  1) [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out 

    Error: locator.fill: Error: strict mode violation: getByLabel('账号') resolved to 3 elements:
        1) <section aria-label="账号认证" class="commercial-auth-panel">…</section> aka getByRole('region', { name: '账号认证' })
        2) <input value="" type="text" id="username" maxlength="100" placeholder="请输入用户名" aria-required="true" autocomplete="username" class="ant-input ant-input-lg css-dev-only-do-not-override-ry7cab"/> aka getByRole('textbox', { name: '账号' })
        3) <input type="checkbox" id="rememberUsername" class="ant-checkbox-input"/> aka getByRole('checkbox', { name: '记住账号' })

    Call log:
      - waiting for getByLabel('账号')


      55 |
      56 |   await page.goto('/');
    > 57 |   await page.getByLabel('账号').fill(user.username);
         |                               ^
      58 |   await page.getByLabel('密码').fill('DefinitelyWrongPassword!');
      59 |   await page.getByRole('button', { name: '登录系统' }).click();
      60 |   await expect(page.getByText('用户名或密码错误')).toBeVisible();
        at /home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:57:31

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
  2) [chromium] › e2e/auth-commercial.spec.ts:82:1 › password reset is single-use and revokes the existing browser session 

    Error: locator.fill: Error: strict mode violation: getByLabel('账号') resolved to 3 elements:
        1) <section aria-label="账号认证" class="commercial-auth-panel">…</section> aka getByRole('region', { name: '账号认证' })
        2) <input value="" type="text" id="username" maxlength="100" placeholder="请输入用户名" aria-required="true" autocomplete="username" class="ant-input ant-input-lg css-dev-only-do-not-override-ry7cab"/> aka getByRole('textbox', { name: '账号' })
        3) <input type="checkbox" id="rememberUsername" class="ant-checkbox-input"/> aka getByRole('checkbox', { name: '记住账号' })

    Call log:
      - waiting for getByLabel('账号')


      30 |   await page.goto('/');
      31 |   await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    > 32 |   await page.getByLabel('账号').fill(username);
         |                               ^
      33 |   await page.getByLabel('密码').fill(password);
      34 |   await page.getByRole('button', { name: '登录系统' }).click();
      35 |   await expect(page.locator('.github-user-trigger')).toBeVisible();
        at login (/home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:32:31)
        at /home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:86:3

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/auth-commercial-password-r-ecfd2-he-existing-browser-session-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/auth-commercial-password-r-ecfd2-he-existing-browser-session-chromium/error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/auth-commercial-password-r-ecfd2-he-existing-browser-session-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/auth-commercial-password-r-ecfd2-he-existing-browser-session-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────


[3/3] [chromium] › e2e/auth-commercial.spec.ts:117:1 › clan administrator invitation creates only the approved member scope
  3) [chromium] › e2e/auth-commercial.spec.ts:117:1 › clan administrator invitation creates only the approved member scope 

    Error: locator.fill: Error: strict mode violation: getByLabel('账号') resolved to 3 elements:
        1) <section aria-label="账号认证" class="commercial-auth-panel">…</section> aka getByRole('region', { name: '账号认证' })
        2) <input value="" type="text" id="username" maxlength="100" placeholder="请输入用户名" aria-required="true" autocomplete="username" class="ant-input ant-input-lg css-dev-only-do-not-override-ry7cab"/> aka getByRole('textbox', { name: '账号' })
        3) <input type="checkbox" id="rememberUsername" class="ant-checkbox-input"/> aka getByRole('checkbox', { name: '记住账号' })

    Call log:
      - waiting for getByLabel('账号')


      30 |   await page.goto('/');
      31 |   await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    > 32 |   await page.getByLabel('账号').fill(username);
         |                               ^
      33 |   await page.getByLabel('密码').fill(password);
      34 |   await page.getByRole('button', { name: '登录系统' }).click();
      35 |   await expect(page.locator('.github-user-trigger')).toBeVisible();
        at login (/home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:32:31)
        at /home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:121:3

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/error-context.md

    attachment #3: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/auth-commercial-clan-admin-8a0da-y-the-approved-member-scope-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────


  3 failed
    [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out 
    [chromium] › e2e/auth-commercial.spec.ts:82:1 › password reset is single-use and revokes the existing browser session 
    [chromium] › e2e/auth-commercial.spec.ts:117:1 › clan administrator invitation creates only the approved member scope 
```
