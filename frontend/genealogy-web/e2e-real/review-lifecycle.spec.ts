import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { functionalRunId, loginThroughUi } from './support/auth';
import { csrfHeaders, requiredNumberEnv, responseData, responsePayload } from './support/api';

const handledTaskConflict = /REVIEW_TASK_ALREADY_HANDLED|REVIEW_QUALITY_TASK_STATE_CONFLICT|STATE_CONFLICT|已处理|冲突/;

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

function statusOf(value: any) {
  return String(value?.dataStatus ?? value?.taskStatus ?? value?.status ?? '').toLowerCase();
}

function idOf(value: any, label: string) {
  const id = Number(value?.id ?? value?.taskId ?? value?.reviewTaskId);
  expect(id, `${label} 必须返回有效 ID`).toBeGreaterThan(0);
  return id;
}

function personCreateData(branchId: number, suffix: string, name: string) {
  return {
    branchId,
    personCode: `RV-${suffix}`,
    name,
    genealogyName: `审核谱名${suffix}`,
    courtesyName: null,
    aliasName: null,
    gender: 'male',
    generationNo: 4,
    generationWord: null,
    rankInFamily: null,
    birthDate: '1992-03-04',
    birthDatePrecision: 'day',
    deathDate: null,
    deathDatePrecision: null,
    isLiving: true,
    birthPlace: '长沙',
    residencePlace: '长沙',
    occupation: '工程师',
    education: 'university',
    titleOrHonor: null,
    biography: '首次提交内容',
    tombPlace: null,
    epitaph: null,
    hasDescendant: false,
    lineageStatus: 'normal',
    privacyLevel: 'clan_only',
    dataStatus: 'draft',
    confirmDuplicate: true
  };
}

function personUpdateData(person: any, changes: Record<string, unknown>) {
  return {
    branchId: person.branchId,
    personCode: person.personCode,
    name: person.name,
    genealogyName: person.genealogyName,
    courtesyName: person.courtesyName,
    aliasName: person.aliasName,
    gender: person.gender,
    generationNo: person.generationNo,
    generationWord: person.generationWord,
    rankInFamily: person.rankInFamily,
    birthDate: person.birthDate,
    birthDatePrecision: person.birthDatePrecision,
    deathDate: person.deathDate,
    deathDatePrecision: person.deathDatePrecision,
    isLiving: person.isLiving,
    birthPlace: person.birthPlace,
    residencePlace: person.residencePlace,
    occupation: person.occupation,
    education: person.education,
    titleOrHonor: person.titleOrHonor,
    biography: person.biography,
    tombPlace: person.tombPlace,
    epitaph: person.epitaph,
    hasDescendant: person.hasDescendant,
    lineageStatus: person.lineageStatus,
    privacyLevel: person.privacyLevel,
    dataStatus: person.dataStatus,
    ...changes
  };
}

async function submitPerson(page: Page, headers: Record<string, string>, personId: number, summary: string) {
  return okData(await page.request.post(`/api/v1/persons/${personId}/submit-review`, {
    headers,
    data: { submitterId: null, diffSummary: summary }
  }));
}

async function approve(page: Page, headers: Record<string, string>, taskId: number, comment: string) {
  return page.request.post(`/api/v1/review-tasks/${taskId}/approve`, {
    headers,
    data: { reviewerId: null, comment }
  });
}

test.describe('审核驳回、修改重提与并发治理闭环', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-REVIEW-003 / 004 驳回后修改重提并批准', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const runId = functionalRunId();
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || String(Date.now());
    const originalName = `黄审核驳回-${runId}`;
    const revisedName = `黄审核重提-${runId}`;

    await loginThroughUi(page, 'EDITOR');
    let editorHeaders = await csrfHeaders(page);
    const created = await okData(await page.request.post(`/api/v1/clans/${clanId}/persons`, {
      headers: editorHeaders,
      data: personCreateData(branchId, suffix, originalName)
    }));
    const personId = idOf(created, '人物');

    await okData(await page.request.put(`/api/v1/persons/${personId}/events`, {
      headers: editorHeaders,
      data: {
        events: [{
          eventType: 'migration',
          eventTitle: '首次迁居',
          eventDate: '2020-01-01',
          eventDatePrecision: 'day',
          eventPlace: '长沙',
          eventDescription: '首次提交事件',
          sortOrder: 0
        }]
      }
    }));

    const firstTask = await submitPerson(page, editorHeaders, personId, '首次提交，等待驳回验证');
    const firstTaskId = idOf(firstTask, '首次审核任务');
    expect(statusOf(firstTask)).toBe('pending');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    let reviewerHeaders = await csrfHeaders(page);

    const detail = await okData(await page.request.get(`/api/v1/review-tasks/${firstTaskId}`));
    expect(Number(detail?.task?.id ?? detail?.id)).toBe(firstTaskId);
    expect(Number(detail?.task?.submitterId ?? detail?.auditRecord?.submitterId)).toBeGreaterThan(0);

    const diff = await okData(await page.request.get(`/api/v1/review-tasks/${firstTaskId}/diff`));
    expect(Number(diff.reviewTaskId)).toBe(firstTaskId);
    expect(diff.targetType).toBe('person');
    expect(Number(diff.targetId)).toBe(personId);
    expect(Array.isArray(diff.fields)).toBeTruthy();
    const statusDiff = diff.fields.find((item: any) => item.fieldName === 'dataStatus');
    expect(statusDiff).toMatchObject({
      fieldName: 'dataStatus',
      beforeValue: 'draft',
      afterValue: 'pending_review',
      changeType: 'modified'
    });

    const rejectResponse = await page.request.post(`/api/v1/review-tasks/${firstTaskId}/reject`, {
      headers: reviewerHeaders,
      data: { reviewerId: null, comment: '资料不完整，请修改姓名、传记和迁徙事件后重提' }
    });
    const rejectedTask = await okData(rejectResponse);
    expect(statusOf(rejectedTask)).toBe('rejected');

    const afterReject = await okData(await page.request.get(`/api/v1/persons/${personId}`));
    expect(statusOf(afterReject)).toBe('rejected');
    expect(afterReject.name).toBe(originalName);

    const repeatReject = await page.request.post(`/api/v1/review-tasks/${firstTaskId}/reject`, {
      headers: reviewerHeaders,
      data: { reviewerId: null, comment: '重复驳回应失败' }
    });
    expect(repeatReject.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(repeatReject))).toMatch(/REVIEW_TASK_ALREADY_HANDLED|已处理|不能重复/);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    editorHeaders = await csrfHeaders(page);

    const revisedEvents = [
      {
        eventType: 'migration',
        eventTitle: '首次迁居',
        eventDate: '2020-01-01',
        eventDatePrecision: 'day',
        eventPlace: '长沙',
        eventDescription: '保留首次事件',
        sortOrder: 0
      },
      {
        eventType: 'migration',
        eventTitle: '迁居多伦多',
        eventDate: '2024-05-01',
        eventDatePrecision: 'day',
        eventPlace: '多伦多',
        eventDescription: '按驳回意见补充的新事件',
        sortOrder: 1
      }
    ];
    const updated = await okData(await page.request.put(`/api/v1/persons/${personId}/revision`, {
      headers: editorHeaders,
      data: {
        person: personUpdateData(afterReject, {
          name: revisedName,
          residencePlace: '多伦多',
          biography: '根据驳回意见补充后的传记',
          dataStatus: 'rejected'
        }),
        events: { events: revisedEvents }
      }
    }));
    expect(updated.name).toBe(revisedName);
    expect(statusOf(updated)).toBe('pending_review');

    const persistedPending = await okData(await page.request.get(`/api/v1/persons/${personId}`));
    expect(statusOf(persistedPending)).toBe('pending_review');
    expect(persistedPending.name).toBe(originalName);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    reviewerHeaders = await csrfHeaders(page);
    const pendingTasks = await okData(await page.request.get(`/api/v1/clans/${clanId}/review-tasks/pending`));
    const secondTask = pendingTasks.find((item: any) => item.targetType === 'person' && Number(item.targetId) === personId);
    expect(secondTask, '修改被驳回人物后必须自动生成新的待审任务').toBeTruthy();
    const secondTaskId = idOf(secondTask, '重提审核任务');
    expect(secondTaskId).not.toBe(firstTaskId);
    expect(statusOf(secondTask)).toBe('pending');

    const secondDiff = await okData(await page.request.get(`/api/v1/review-tasks/${secondTaskId}/diff`));
    expect(JSON.stringify(secondDiff)).toContain(revisedName);
    expect(JSON.stringify(secondDiff)).toContain('根据驳回意见补充后的传记');
    expect(JSON.stringify(secondDiff)).toContain('迁居多伦多');

    const approveResponse = await approve(page, reviewerHeaders, secondTaskId, '修改完整，同意发布');
    const approvedTask = await okData(approveResponse);
    expect(statusOf(approvedTask)).toBe('approved');

    const official = await okData(await page.request.get(`/api/v1/persons/${personId}`));
    expect(statusOf(official)).toBe('official');
    expect(official.name).toBe(revisedName);
    expect(official.biography).toBe('根据驳回意见补充后的传记');
    expect(official.residencePlace).toBe('多伦多');

    const events = await okData(await page.request.get(`/api/v1/persons/${personId}/events`));
    expect(events.map((item: any) => item.eventTitle)).toEqual(['首次迁居', '迁居多伦多']);

    const records = await okData(await page.request.get(`/api/v1/persons/${personId}/review-records`));
    expect(records.filter((item: any) => statusOf(item) === 'rejected').length).toBeGreaterThanOrEqual(1);
    expect(records.filter((item: any) => statusOf(item) === 'approved').length).toBeGreaterThanOrEqual(1);

    await testInfo.attach('reject-resubmit-chain', {
      body: JSON.stringify({ personId, firstTaskId, secondTaskId, originalName, revisedName }, null, 2),
      contentType: 'application/json'
    });
  });

  test('FT-REVIEW-005 / 006 并发处理仅一次生效，批量部分冲突可隔离', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const runId = functionalRunId();
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || String(Date.now());

    await loginThroughUi(page, 'EDITOR');
    const editorHeaders = await csrfHeaders(page);

    async function createPendingPerson(index: number) {
      const person = await okData(await page.request.post(`/api/v1/clans/${clanId}/persons`, {
        headers: editorHeaders,
        data: personCreateData(branchId, `${suffix}${index}`, `黄并发审核${index}-${runId}`)
      }));
      const personId = idOf(person, `并发人物${index}`);
      const task = await submitPerson(page, editorHeaders, personId, `并发审核任务${index}`);
      return { personId, taskId: idOf(task, `并发审核任务${index}`) };
    }

    const first = await createPendingPerson(1);
    const second = await createPendingPerson(2);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    const reviewerHeaders = await csrfHeaders(page);

    const concurrent = await Promise.all([
      approve(page, reviewerHeaders, first.taskId, '并发批准 A'),
      approve(page, reviewerHeaders, first.taskId, '并发批准 B')
    ]);
    const concurrentStatuses = concurrent.map(response => response.status()).sort();
    expect(concurrentStatuses.filter(status => status >= 200 && status < 300)).toHaveLength(1);
    expect(concurrentStatuses.filter(status => status >= 400)).toHaveLength(1);
    const failedConcurrent = concurrent.find(response => !response.ok());
    expect(JSON.stringify(await responsePayload(failedConcurrent!))).toMatch(handledTaskConflict);

    const firstPerson = await okData(await page.request.get(`/api/v1/persons/${first.personId}`));
    expect(statusOf(firstPerson)).toBe('official');

    const batchLikeResponses = await Promise.all([
      approve(page, reviewerHeaders, first.taskId, '批量处理中重复处理已完成任务'),
      approve(page, reviewerHeaders, second.taskId, '批量处理中正常处理待办任务')
    ]);
    const repeated = batchLikeResponses[0];
    const valid = batchLikeResponses[1];
    expect(repeated.ok()).toBeFalsy();
    expect(valid.ok(), await valid.text()).toBeTruthy();
    expect(JSON.stringify(await responsePayload(repeated))).toMatch(handledTaskConflict);
    expect(statusOf(responseData(await responsePayload(valid)))).toBe('approved');

    const secondPerson = await okData(await page.request.get(`/api/v1/persons/${second.personId}`));
    expect(statusOf(secondPerson)).toBe('official');

    await testInfo.attach('concurrent-review-chain', {
      body: JSON.stringify({ first, second, concurrentStatuses }, null, 2),
      contentType: 'application/json'
    });
  });
});
