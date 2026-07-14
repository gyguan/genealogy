# Auth Playwright diagnostic 3

Exit status: 1

```text

Running 3 tests using 1 worker

[1/3] [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out
  1) [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out 

    Error: expect(locator).toBeHidden() failed

    Locator:  getByRole('dialog', { name: '登录设备' })
    Expected: hidden
    Received: visible
    Timeout:  10000ms

    Call log:
      - Expect "toBeHidden" with timeout 10000ms
      - waiting for getByRole('dialog', { name: '登录设备' })
        4 × locator resolved to <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="_r_19_" class="ant-modal css-dev-only-do-not-override-ry7cab ant-zoom-appear ant-zoom-appear-active ant-zoom">…</div>
          - unexpected value "visible"
        20 × locator resolved to <div role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="_r_19_" class="ant-modal css-dev-only-do-not-override-ry7cab">…</div>
           - unexpected value "visible"


      72 |   await expect(page.getByText('当前设备')).toBeVisible();
      73 |   await page.keyboard.press('Escape');
    > 74 |   await expect(page.getByRole('dialog', { name: '登录设备' })).toBeHidden();
         |                                                            ^
      75 |
      76 |   await page.locator('.github-user-trigger').click();
      77 |   await page.getByText('退出登录', { exact: true }).click();
        at /home/runner/work/genealogy/genealogy/frontend/genealogy-web/e2e/auth-commercial.spec.ts:74:60

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


[2/3] [chromium] › e2e/auth-commercial.spec.ts:83:1 › password reset is single-use and revokes the existing browser session
[3/3] [chromium] › e2e/auth-commercial.spec.ts:118:1 › clan administrator invitation creates only the approved member scope
  1 failed
    [chromium] › e2e/auth-commercial.spec.ts:53:1 › commercial login rejects bad credentials, restores cookie session and logs out 
  2 passed (36.4s)
```
