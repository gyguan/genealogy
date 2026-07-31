import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { functionalRunId, loginThroughUi } from './support/auth';
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

async function okData(response: APIResponse) {
  const payload = await responsePayload(response);
  expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
  expect(payload?.success).not.toBe(false);
  return responseData(payload);
}

function multipartHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'content-type')
  );
}

function rowsOf(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function idOf(value: any, label: string) {
  const id = Number(value?.id ?? value?.attachmentId ?? value?.sourceId);
  expect(id, `${label} 必须返回有效 ID`).toBeGreaterThan(0);
  return id;
}

async function textOf(response: APIResponse) {
  const body = await response.body();
  return body.toString('utf8');
}

test.describe('来源文件、谱册导出与下载权限闭环', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-SOURCE-FILE-001~006 / FT-EXPORT-001 / FT-FAIL-005 文件完整闭环', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const rootPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_ROOT_PERSON_ID');
    const runId = functionalRunId();
    const sourceName = `来源附件闭环-${runId}`;
    const fileName = `source-evidence-${runId}.txt`;
    const fileContent = `Issue #836 source evidence\nclan=${clanId}\nbranch=${branchId}\nperson=${rootPersonId}\nrun=${runId}\n`;

    await loginThroughUi(page, 'EDITOR');
    const editorHeaders = await csrfHeaders(page);
    const uploadHeaders = multipartHeaders(editorHeaders);

    const source = await okData(await page.request.post(`/api/v1/clans/${clanId}/sources`, {
      headers: editorHeaders,
      data: {
        sourceName,
        sourceType: 'archive',
        providerName: '#836 自动化测试',
        bookTitle: '来源文件闭环证据',
        volumeNo: '卷836',
        pageNo: '第1页',
        sourceDate: '2026',
        excerpt: fileContent.trim(),
        description: '来源附件上传、预览、下载与权限闭环',
        confidenceLevel: 'high',
        privacyLevel: 'clan_only',
        sensitiveLevel: 'sensitive',
        submitReview: false
      }
    }));
    const sourceId = idOf(source, '来源');

    const upload = await okData(await page.request.post(`/api/v1/sources/${sourceId}/attachments`, {
      headers: uploadHeaders,
      multipart: {
        file: { name: fileName, mimeType: 'text/plain', buffer: Buffer.from(fileContent, 'utf8') },
        privacyLevel: 'clan_only',
        sensitiveLevel: 'sensitive'
      }
    }));
    const attachmentId = idOf(upload, '附件');
    expect(upload.fileName).toBe(fileName);
    expect(Number(upload.fileSize)).toBe(Buffer.byteLength(fileContent));
    expect(String(upload.privacyLevel)).toBe('clan_only');
    expect(String(upload.sensitiveLevel)).toBe('sensitive');

    const emptyUpload = await page.request.post(`/api/v1/sources/${sourceId}/attachments`, {
      headers: uploadHeaders,
      multipart: {
        file: { name: `empty-${runId}.txt`, mimeType: 'text/plain', buffer: Buffer.alloc(0) },
        privacyLevel: 'clan_only',
        sensitiveLevel: 'normal'
      }
    });
    expect(emptyUpload.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(emptyUpload))).toMatch(/empty|空|FILE|ATTACHMENT/i);

    const invalidUpload = await page.request.post(`/api/v1/sources/${sourceId}/attachments`, {
      headers: uploadHeaders,
      multipart: {
        file: { name: `blocked-${runId}.exe`, mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ-not-an-executable') },
        privacyLevel: 'clan_only',
        sensitiveLevel: 'normal'
      }
    });
    expect(invalidUpload.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(invalidUpload))).toMatch(/type|类型|format|格式|FILE|ATTACHMENT/i);

    const attachments = await okData(await page.request.get(`/api/v1/sources/${sourceId}/attachments?pageNo=1&pageSize=20`));
    const attachment = rowsOf(attachments).find((item: any) => Number(item.id) === attachmentId);
    expect(attachment).toBeTruthy();
    expect(attachment.fileName).toBe(fileName);
    expect(Number(attachment.fileSize)).toBe(Buffer.byteLength(fileContent));
    expect(attachment.previewAllowed).not.toBe(false);
    expect(attachment.downloadAllowed).not.toBe(false);

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
    await globalTreeTab.click();
    await expect(globalTreeTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: '世系图谱' })).toBeVisible();

    await resetBrowserSession(page);
    await loginThroughUi(page, 'RESTRICTED');

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

    await testInfo.attach('source-file-booklet-chain', {
      body: JSON.stringify({
        clanId,
        branchId,
        sourceId,
        attachmentId,
        fileName,
        fileSize: Buffer.byteLength(fileContent),
        previewStatus: preview.status(),
        downloadStatus: download.status(),
        missingDownloadStatus: missingDownload.status(),
        clanBookletBytes: Buffer.byteLength(clanHtml),
        branchBookletBytes: Buffer.byteLength(branchHtml),
        restrictedStatuses: [
          restrictedList.status(),
          restrictedPreview.status(),
          restrictedDownload.status(),
          restrictedClanBooklet.status(),
          restrictedBranchBooklet.status()
        ]
      }, null, 2),
      contentType: 'application/json'
    });
  });
});