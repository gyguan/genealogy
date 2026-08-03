import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { loginThroughUi } from './support/auth';
import { csrfHeaders } from './support/api';

async function textOf(response: APIResponse): Promise<string> {
  return Buffer.from(await response.body()).toString('utf8');
}

async function responsePayload(response: APIResponse): Promise<unknown> {
  const text = await textOf(response);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function resetBrowserSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

async function login(page: Page, role: 'ADMIN' | 'RESTRICTED'): Promise<void> {
  await resetBrowserSession(page);
  await loginThroughUi(page, role);
}

test.describe('来源文件、谱册导出与下载权限闭环', () => {
  test('管理员可预览下载并导出谱册，受限账号不可读取', async ({ page }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const clanName = `E2E谱册宗族-${runId}`;
    const branchName = `E2E谱册支派-${runId}`;
    const sourceName = `E2E来源-${runId}`;
    const fileName = `e2e-source-${runId}.txt`;
    const fileContent = `source-file-content-${runId}\n`;

    await login(page, 'ADMIN');
    const adminCsrfHeaders = await csrfHeaders(page);

    const createClan = await page.request.post('/api/v1/clans', {
      headers: adminCsrfHeaders,
      data: {
        name: clanName,
        surname: '黄',
        description: `booklet e2e ${runId}`
      }
    });
    expect(createClan.ok(), await createClan.text()).toBeTruthy();
    const clanPayload = await createClan.json();
    const clanId = Number(clanPayload?.data?.id);
    expect(clanId).toBeGreaterThan(0);

    const createBranch = await page.request.post(`/api/v1/clans/${clanId}/branches`, {
      headers: adminCsrfHeaders,
      data: {
        name: branchName,
        code: `E2E-${runId}`,
        description: `booklet branch ${runId}`
      }
    });
    expect(createBranch.ok(), await createBranch.text()).toBeTruthy();
    const branchPayload = await createBranch.json();
    const branchId = Number(branchPayload?.data?.id);
    expect(branchId).toBeGreaterThan(0);

    const createSource = await page.request.post('/api/v1/sources', {
      headers: adminCsrfHeaders,
      data: {
        clanId,
        title: sourceName,
        sourceType: 'OTHER',
        description: `booklet source ${runId}`
      }
    });
    expect(createSource.ok(), await createSource.text()).toBeTruthy();
    const sourcePayload = await createSource.json();
    const sourceId = Number(sourcePayload?.data?.id);
    expect(sourceId).toBeGreaterThan(0);

    const upload = await page.request.post(`/api/v1/sources/${sourceId}/attachments`, {
      headers: {
        'X-CSRF-Token': adminCsrfHeaders['X-CSRF-Token']
      },
      multipart: {
        file: {
          name: fileName,
          mimeType: 'text/plain',
          buffer: Buffer.from(fileContent)
        }
      }
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
    const uploadPayload = await upload.json();
    const attachmentId = Number(uploadPayload?.data?.id);
    expect(attachmentId).toBeGreaterThan(0);

    const list = await page.request.get(`/api/v1/sources/${sourceId}/attachments?pageNo=1&pageSize=20`);
    expect(list.ok(), await list.text()).toBeTruthy();
    const listPayload = await list.json();
    expect(JSON.stringify(listPayload)).toContain(fileName);

    const preview = await page.request.get(`/api/v1/source-attachments/${attachmentId}/preview`);
    expect(preview.ok(), await preview.text()).toBeTruthy();
    expect(await textOf(preview)).toBe(fileContent);

    const download = await page.request.get(`/api/v1/source-attachments/${attachmentId}/download`);
    expect(download.ok(), await download.text()).toBeTruthy();
    expect(await textOf(download)).toBe(fileContent);
    expect(String(download.headers()['content-disposition'] || '')).toMatch(/attachment|filename/i);

    const missingDownload = await page.request.get('/api/v1/source-attachments/9223372036854775000/download');
    expect(missingDownload.ok()).toBeFalsy();
    expect([403, 404]).toContain(missingDownload.status());

    const clanBooklet = await page.request.get(`/api/v1/clans/${clanId}/exports/booklet.html`);
    expect(clanBooklet.ok(), await clanBooklet.text()).toBeTruthy();
    const clanHtml = await textOf(clanBooklet);
    expect(Buffer.byteLength(clanHtml)).toBeGreaterThan(100);
    expect(clanHtml).toMatch(/<!doctype|<html/i);
    expect(clanHtml).toContain('黄');
    expect(clanHtml).toContain(runId);

    const branchBooklet = await page.request.get(`/api/v1/clans/${clanId}/branches/${branchId}/exports/booklet.html`);
    expect(branchBooklet.ok(), await branchBooklet.text()).toBeTruthy();
    const branchHtml = await textOf(branchBooklet);
    expect(Buffer.byteLength(branchHtml)).toBeGreaterThan(100);
    expect(branchHtml).toMatch(/<!doctype|<html/i);
    expect(branchHtml).toContain('黄');
    expect(branchHtml).toContain(runId);

    await page.getByRole('menuitem', { name: '来源资料库', exact: true }).click();
    await page.goto(`/?view=sourceLibrary&sourceId=${sourceId}`);
    await expect(page.getByText(sourceName, { exact: true }).first()).toBeVisible();
    await page.getByRole('tab', { name: /来源附件/ }).click();
    await expect(page.getByText(fileName, { exact: true }).first()).toBeVisible();

    await page.getByRole('menuitem', { name: '世系图谱', exact: true }).click();
    const globalTreeTab = page.getByRole('tab', { name: '支派全局图谱', exact: true });
    await expect(globalTreeTab).toBeVisible();
    await globalTreeTab.click();

    await login(page, 'RESTRICTED');

    const restrictedList = await page.request.get(`/api/v1/sources/${sourceId}/attachments?pageNo=1&pageSize=20`);
    const restrictedPreview = await page.request.get(`/api/v1/source-attachments/${attachmentId}/preview`);
    const restrictedDownload = await page.request.get(`/api/v1/source-attachments/${attachmentId}/download`);
    const restrictedClanBooklet = await page.request.get(`/api/v1/clans/${clanId}/exports/booklet.html`);
    const restrictedBranchBooklet = await page.request.get(`/api/v1/clans/${clanId}/branches/${branchId}/exports/booklet.html`);

    for (const response of [restrictedList, restrictedPreview, restrictedDownload, restrictedClanBooklet, restrictedBranchBooklet]) {
      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBeGreaterThanOrEqual(403);
    }

    const restrictedPayloads = await Promise.all([
      responsePayload(restrictedList),
      responsePayload(restrictedPreview),
      responsePayload(restrictedDownload),
      responsePayload(restrictedClanBooklet),
      responsePayload(restrictedBranchBooklet)
    ]);
    expect(JSON.stringify(restrictedPayloads)).not.toContain(fileName);
    expect(JSON.stringify(restrictedPayloads)).not.toContain(fileContent.trim());
    expect(JSON.stringify(restrictedPayloads)).not.toContain(sourceName);
  });
});
