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

function idOf(value: any, label: string) {
  const id = Number(value?.id ?? value?.taskId ?? value?.reviewTaskId);
  expect(id, `${label} 必须返回有效 ID`).toBeGreaterThan(0);
  return id;
}

function statusOf(value: any) {
  return String(value?.dataStatus ?? value?.rowStatus ?? value?.reviewStatus ?? value?.taskStatus ?? value?.status ?? '').toLowerCase();
}

function multipartHeaders(jsonHeaders: Record<string, string>) {
  return { 'X-CSRF-Token': jsonHeaders['X-CSRF-Token'] };
}

async function postCsv(
  page: Page,
  url: string,
  headers: Record<string, string>,
  filename: string,
  content: string
) {
  return page.request.post(url, {
    headers: multipartHeaders(headers),
    multipart: {
      file: {
        name: filename,
        mimeType: 'text/csv',
        buffer: Buffer.from(`\ufeff${content}`, 'utf-8')
      }
    }
  });
}

function personPayload(branchId: number, code: string, name: string, gender: string, generationNo: number, birthDate: string) {
  return {
    branchId,
    personCode: code,
    name,
    genealogyName: `${name}谱名`,
    courtesyName: null,
    aliasName: null,
    gender,
    generationNo,
    generationWord: null,
    rankInFamily: null,
    birthDate,
    birthDatePrecision: 'day',
    deathDate: null,
    deathDatePrecision: null,
    isLiving: true,
    birthPlace: '长沙',
    residencePlace: '多伦多',
    occupation: '工程师',
    education: 'university',
    titleOrHonor: null,
    biography: '导入业务链基线人物',
    tombPlace: null,
    epitaph: null,
    hasDescendant: false,
    lineageStatus: 'normal',
    privacyLevel: 'clan_only',
    dataStatus: 'draft',
    confirmDuplicate: true
  };
}

async function approveTask(page: Page, headers: Record<string, string>, taskId: number, comment: string) {
  const approved = await okData(await page.request.post(`/api/v1/review-tasks/${taskId}/approve`, {
    headers,
    data: { reviewerId: null, comment }
  }));
  expect(statusOf(approved)).toBe('approved');
  return approved;
}

test.describe('数据导入预览、修正、审核与幂等完整业务链', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-IMPORT-001~008 人物与关系导入完整闭环', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const runId = functionalRunId();
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-10) || String(Date.now());

    const parentName = `黄导入父-${runId}`;
    const childName = `黄导入子-${runId}`;
    const thirdName = `黄导入三-${runId}`;
    const parentCode = `IP-${suffix}-P`;
    const childCode = `IP-${suffix}-C`;
    const thirdCode = `IP-${suffix}-T`;

    await loginThroughUi(page, 'EDITOR');
    let editorHeaders = await csrfHeaders(page);

    const basePersons = [
      { code: parentCode, name: parentName, gender: 'male', generationNo: 4, birthDate: '1970-01-01' },
      { code: childCode, name: childName, gender: 'male', generationNo: 5, birthDate: '1995-01-01' },
      { code: thirdCode, name: thirdName, gender: 'female', generationNo: 5, birthDate: '1998-01-01' }
    ];
    const createdBase: Array<{ id: number; taskId: number; code: string; name: string }> = [];
    for (const item of basePersons) {
      const person = await okData(await page.request.post(`/api/v1/clans/${clanId}/persons`, {
        headers: editorHeaders,
        data: personPayload(branchId, item.code, item.name, item.gender, item.generationNo, item.birthDate)
      }));
      const personId = idOf(person, `基线人物 ${item.name}`);
      const task = await okData(await page.request.post(`/api/v1/persons/${personId}/submit-review`, {
        headers: editorHeaders,
        data: { submitterId: null, diffSummary: `#833 建立导入关系基线：${item.name}` }
      }));
      createdBase.push({ id: personId, taskId: idOf(task, '基线人物审核任务'), code: item.code, name: item.name });
    }

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    let reviewerHeaders = await csrfHeaders(page);
    for (const item of createdBase) {
      await approveTask(page, reviewerHeaders, item.taskId, `批准导入基线人物 ${item.name}`);
    }

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    editorHeaders = await csrfHeaders(page);

    const importedName = `黄导入新增-${runId}`;
    const correctedName = `黄导入修正-${runId}`;
    const personFilename = `persons-${suffix}.csv`;
    const personCsv = [
      '姓名,性别,代次,字辈,出生日期,是否在世',
      `${importedName},男,6,,2000-01-01,是`,
      ',女,6,,2001-02-03,是',
      `${parentName},男,4,,1970-01-01,是`
    ].join('\n');

    const personPreview = await okData(await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/persons/preview?branchId=${branchId}`,
      editorHeaders,
      personFilename,
      personCsv
    ));
    expect(personPreview).toMatchObject({ totalCount: 3, validCount: 2, duplicateCount: 1, errorCount: 1 });
    expect(personPreview.rows.some((row: any) => row.duplicated === true && row.name === parentName)).toBeTruthy();
    expect(personPreview.rows.some((row: any) => String(row.errorMessage || '').includes('姓名不能为空'))).toBeTruthy();

    const unconfirmed = await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/persons.csv?branchId=${branchId}&confirmDuplicates=false`,
      editorHeaders,
      personFilename,
      personCsv
    );
    expect(unconfirmed.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(unconfirmed))).toMatch(/IMPORT_DUPLICATE_CONFIRM_REQUIRED|疑似重复/);

    const personJob = await okData(await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/persons.csv?branchId=${branchId}&confirmDuplicates=true`,
      editorHeaders,
      personFilename,
      personCsv
    ));
    const personJobId = idOf(personJob, '人物导入批次');
    expect(personJob).toMatchObject({ totalCount: 3, successCount: 2, failureCount: 1 });
    const personJobCreated = await okData(await page.request.get(`/api/v1/clans/${clanId}/imports/${personJobId}`));
    expect(personJobCreated).toMatchObject({ processingStatus: 'correction_required', reviewStatus: 'not_submitted' });

    const failedPersonRows = await okData(await page.request.get(
      `/api/v1/clans/${clanId}/imports/${personJobId}/rows?status=failed&pageNo=1&pageSize=20`
    ));
    expect(failedPersonRows.total).toBe(1);
    const failedPersonRow = failedPersonRows.records[0];
    expect(statusOf(failedPersonRow)).toMatch(/invalid|retry_failed/);

    const correctedPersonRow = await okData(await page.request.post(
      `/api/v1/clans/${clanId}/imports/${personJobId}/rows/${failedPersonRow.id}/retry`,
      {
        headers: editorHeaders,
        data: {
          name: correctedName,
          gender: 'female',
          generationNo: 6,
          generationWord: null,
          birthDate: '2001-02-03',
          isLiving: true,
          confirmDuplicates: false,
          expectedVersion: failedPersonRow.version
        }
      }
    ));
    expect(statusOf(correctedPersonRow)).toBe('draft_created');
    expect(correctedPersonRow.retryCount).toBe(1);

    const personJobReady = await okData(await page.request.get(`/api/v1/clans/${clanId}/imports/${personJobId}`));
    expect(personJobReady).toMatchObject({ successCount: 3, failureCount: 0, processingStatus: 'ready_for_review' });

    const stalePersonRetry = await page.request.post(
      `/api/v1/clans/${clanId}/imports/${personJobId}/rows/${failedPersonRow.id}/retry`,
      {
        headers: editorHeaders,
        data: {
          name: correctedName,
          gender: 'female',
          generationNo: 6,
          generationWord: null,
          birthDate: '2001-02-03',
          isLiving: true,
          confirmDuplicates: false,
          expectedVersion: failedPersonRow.version
        }
      }
    );
    expect(stalePersonRetry.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(stalePersonRetry))).toMatch(/IMPORT_JOB_NOT_CORRECTABLE|IMPORT_JOB_ROW_NOT_RETRYABLE|VERSION_CONFLICT|不能再次重试/);

    const personImportTask = await okData(await page.request.post(
      `/api/v1/clans/${clanId}/imports/${personJobId}/submit-review`,
      { headers: editorHeaders, data: { comment: '#833 人物导入修正完成，提交审核' } }
    ));
    const personImportTaskId = idOf(personImportTask, '人物导入审核任务');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    reviewerHeaders = await csrfHeaders(page);
    await approveTask(page, reviewerHeaders, personImportTaskId, '人物导入批次审核通过');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    editorHeaders = await csrfHeaders(page);

    const approvedPersonJob = await okData(await page.request.get(`/api/v1/clans/${clanId}/imports/${personJobId}`));
    expect(approvedPersonJob.reviewStatus).toBe('approved');

    for (const expectedName of [importedName, correctedName]) {
      const search = await okData(await page.request.get(
        `/api/v1/persons/search?clanId=${clanId}&name=${encodeURIComponent(expectedName)}&dataStatus=official&pageNo=1&pageSize=20&sort=updatedAt,desc`
      ));
      expect(search.total, `${expectedName} 必须且仅有一条正式数据`).toBe(1);
    }

    const duplicateSearchBeforeReplay = await okData(await page.request.get(
      `/api/v1/persons/search?clanId=${clanId}&name=${encodeURIComponent(parentName)}&dataStatus=official&pageNo=1&pageSize=20&sort=updatedAt,desc`
    ));
    expect(duplicateSearchBeforeReplay.total).toBe(2);

    const replayedPersonJob = await okData(await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/persons.csv?branchId=${branchId}&confirmDuplicates=true`,
      editorHeaders,
      `renamed-${personFilename}`,
      personCsv
    ));
    expect(idOf(replayedPersonJob, '重复人物导入批次')).toBe(personJobId);
    const duplicateSearchAfterReplay = await okData(await page.request.get(
      `/api/v1/persons/search?clanId=${clanId}&name=${encodeURIComponent(parentName)}&dataStatus=official&pageNo=1&pageSize=20&sort=updatedAt,desc`
    ));
    expect(duplicateSearchAfterReplay.total).toBe(duplicateSearchBeforeReplay.total);

    const relationshipFilename = `relationships-${suffix}.csv`;
    const relationshipCsv = [
      '关系主体编码,关系对象编码,关系类型,说明',
      `${parentCode},${childCode},父子,有效父子关系`,
      `UNKNOWN-${suffix},${thirdCode},父子,主体人物不存在`,
      `${parentCode},${childCode},父子,文件内重复关系`
    ].join('\n');

    const relationshipPreview = await okData(await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/relationships/preview?branchId=${branchId}`,
      editorHeaders,
      relationshipFilename,
      relationshipCsv
    ));
    expect(relationshipPreview).toMatchObject({ totalCount: 3, validCount: 1, duplicateCount: 1, errorCount: 2 });

    const relationshipJob = await okData(await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/relationships?branchId=${branchId}`,
      editorHeaders,
      relationshipFilename,
      relationshipCsv
    ));
    const relationshipJobId = idOf(relationshipJob, '关系导入批次');
    expect(relationshipJob).toMatchObject({ totalCount: 3, successCount: 1, failureCount: 2 });
    const relationshipJobCreated = await okData(await page.request.get(`/api/v1/clans/${clanId}/imports/${relationshipJobId}`));
    expect(relationshipJobCreated).toMatchObject({ processingStatus: 'correction_required', reviewStatus: 'not_submitted' });

    const failedRelationshipRows = await okData(await page.request.get(
      `/api/v1/clans/${clanId}/imports/${relationshipJobId}/rows?status=failed&pageNo=1&pageSize=20`
    ));
    expect(failedRelationshipRows.total).toBe(2);

    for (const row of failedRelationshipRows.records) {
      const unknownPerson = String(row.rawData).includes(`UNKNOWN-${suffix}`);
      const retryData = unknownPerson
        ? {
            fromPersonCode: parentCode,
            toPersonCode: thirdCode,
            relationshipType: '父子',
            description: '修正人物编码后的父子关系',
            expectedVersion: row.version
          }
        : {
            fromPersonCode: childCode,
            toPersonCode: thirdCode,
            relationshipType: '配偶',
            description: '将重复行修正为配偶关系',
            expectedVersion: row.version
          };
      const corrected = await okData(await page.request.post(
        `/api/v1/clans/${clanId}/imports/${relationshipJobId}/rows/${row.id}/relationship-retry`,
        { headers: editorHeaders, data: retryData }
      ));
      expect(statusOf(corrected)).toBe('draft_created');
    }

    const relationshipJobReady = await okData(await page.request.get(`/api/v1/clans/${clanId}/imports/${relationshipJobId}`));
    expect(relationshipJobReady).toMatchObject({ successCount: 3, failureCount: 0, processingStatus: 'ready_for_review' });

    const relationshipTask = await okData(await page.request.post(
      `/api/v1/clans/${clanId}/imports/${relationshipJobId}/submit-review`,
      { headers: editorHeaders, data: { comment: '#833 关系导入修正完成，提交审核' } }
    ));
    const relationshipTaskId = idOf(relationshipTask, '关系导入审核任务');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    reviewerHeaders = await csrfHeaders(page);
    await approveTask(page, reviewerHeaders, relationshipTaskId, '关系导入批次审核通过');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    editorHeaders = await csrfHeaders(page);

    const parentRelationships = await okData(await page.request.get(`/api/v1/persons/${createdBase[0].id}/relationships`));
    const officialParentLinks = parentRelationships.filter((item: any) => statusOf(item) === 'official');
    expect(officialParentLinks.some((item: any) => Number(item.toPersonId) === createdBase[1].id)).toBeTruthy();
    expect(officialParentLinks.some((item: any) => Number(item.toPersonId) === createdBase[2].id)).toBeTruthy();

    const childRelationshipsBeforeReplay = await okData(await page.request.get(`/api/v1/persons/${createdBase[1].id}/relationships`));
    const relationshipReplay = await okData(await postCsv(
      page,
      `/api/v1/clans/${clanId}/imports/relationships?branchId=${branchId}`,
      editorHeaders,
      `renamed-${relationshipFilename}`,
      relationshipCsv
    ));
    expect(idOf(relationshipReplay, '重复关系导入批次')).toBe(relationshipJobId);
    const childRelationshipsAfterReplay = await okData(await page.request.get(`/api/v1/persons/${createdBase[1].id}/relationships`));
    expect(childRelationshipsAfterReplay.length).toBe(childRelationshipsBeforeReplay.length);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'RESTRICTED');
    const crossClanRead = await page.request.get(`/api/v1/clans/${clanId}/imports/${personJobId}`);
    expect(crossClanRead.ok()).toBeFalsy();
    expect(crossClanRead.status()).toBeGreaterThanOrEqual(403);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    const importMenu = page.getByText('数据导入', { exact: true }).first();
    await expect(importMenu).toBeVisible();
    await importMenu.click();
    await expect(page.getByText(personFilename, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(relationshipFilename, { exact: false }).first()).toBeVisible();

    await testInfo.attach('import-business-chain', {
      body: JSON.stringify({
        personJobId,
        relationshipJobId,
        personImportTaskId,
        relationshipTaskId,
        importedName,
        correctedName,
        basePersons: createdBase
      }, null, 2),
      contentType: 'application/json'
    });
  });
});
