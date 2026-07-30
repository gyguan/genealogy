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

function positiveId(value: any, label: string) {
  const id = Number(value?.id ?? value?.taskId ?? value?.reviewTaskId ?? value?.revisionId);
  expect(id, `${label} 必须返回正整数 ID`).toBeGreaterThan(0);
  return id;
}

function statusOf(value: any) {
  return String(
    value?.dataStatus
      ?? value?.verificationStatus
      ?? value?.bindingStatus
      ?? value?.taskStatus
      ?? value?.status
      ?? ''
  ).toLowerCase();
}

async function approveTask(page: Page, headers: Record<string, string>, taskId: number, comment: string) {
  const response = await page.request.post(`/api/v1/review-tasks/${taskId}/approve`, {
    headers,
    data: { reviewerId: null, comment }
  });
  const data = await okData(response);
  expect(statusOf(data)).toBe('approved');
  return data;
}

test.describe('完整建谱主数据到审核发布业务链', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-GEN-001 / FT-PERSON-001 / FT-SOURCE-001 / FT-REL-001 完整发布链', async ({ page }, testInfo) => {
    const clanId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CLAN_ID');
    const branchId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_BRANCH_ID');
    const parentPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_CHILD_PERSON_ID');
    const rootPersonId = requiredNumberEnv('FUNCTIONAL_TEST_CORE_ROOT_PERSON_ID');
    const runId = functionalRunId();
    const shortRun = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || String(Date.now());
    const schemeName = `完整链字辈-${runId}`;
    const personName = `黄完整链后代-${runId}`;
    const sourceName = `完整链族谱来源-${runId}`;

    await loginThroughUi(page, 'EDITOR');
    let editorHeaders = await csrfHeaders(page);

    const scheme = await okData(await page.request.post(`/api/v1/clans/${clanId}/generation-schemes`, {
      headers: editorHeaders,
      data: {
        branchId,
        schemeName,
        poemText: '承德远绍家声',
        startGeneration: 4,
        isDefault: false,
        validationEnabled: true,
        strictMode: false
      }
    }));
    const schemeId = positiveId(scheme, '字辈方案');
    expect(statusOf(scheme)).toBe('draft');

    const generationItems = await okData(await page.request.put(`/api/v1/generation-schemes/${schemeId}/items`, {
      headers: editorHeaders,
      data: [
        { generationNo: 4, word: '承', description: '完整链第四世', sortOrder: 0 },
        { generationNo: 5, word: '德', description: '完整链第五世', sortOrder: 1 },
        { generationNo: 6, word: '远', description: '完整链第六世', sortOrder: 2 }
      ]
    }));
    expect(generationItems).toHaveLength(3);

    const person = await okData(await page.request.post(`/api/v1/clans/${clanId}/persons`, {
      headers: editorHeaders,
      data: {
        branchId,
        personCode: `FC-${shortRun}`,
        name: personName,
        genealogyName: `谱名${shortRun}`,
        courtesyName: null,
        aliasName: `完整链${shortRun}`,
        gender: 'male',
        generationNo: 4,
        generationWord: '承',
        rankInFamily: '长子',
        birthDate: '1990-01-02',
        birthDatePrecision: 'day',
        deathDate: null,
        deathDatePrecision: null,
        isLiving: true,
        birthPlace: '长沙',
        residencePlace: '多伦多',
        occupation: '工程师',
        education: 'university',
        titleOrHonor: null,
        biography: '完整业务链自动化测试人物',
        tombPlace: null,
        epitaph: null,
        hasDescendant: false,
        lineageStatus: 'normal',
        privacyLevel: 'clan_only',
        dataStatus: 'draft',
        confirmDuplicate: true
      }
    }));
    const personId = positiveId(person, '人物');
    expect(statusOf(person)).toBe('draft');

    const events = await okData(await page.request.put(`/api/v1/persons/${personId}/events`, {
      headers: editorHeaders,
      data: {
        events: [
          {
            eventType: 'birth',
            eventTitle: '出生',
            eventDate: '1990-01-02',
            eventDatePrecision: 'day',
            eventPlace: '长沙',
            eventDescription: '完整链出生事件',
            sortOrder: 0
          },
          {
            eventType: 'migration',
            eventTitle: '迁居多伦多',
            eventDate: '2020-06-01',
            eventDatePrecision: 'day',
            eventPlace: '多伦多',
            eventDescription: '完整链迁徙事件',
            sortOrder: 1
          }
        ]
      }
    }));
    expect(events).toHaveLength(2);

    const source = await okData(await page.request.post(`/api/v1/clans/${clanId}/sources`, {
      headers: editorHeaders,
      data: {
        sourceName,
        sourceType: 'genealogy_book',
        providerName: '完整链测试提供者',
        bookTitle: '黄氏完整链测试谱',
        volumeNo: '卷一',
        pageNo: '第1页',
        sourceDate: '2026',
        excerpt: `${personName}，承字辈。`,
        description: '用于验证来源创建、审核及人物绑定',
        confidenceLevel: 'high',
        privacyLevel: 'clan_only',
        sensitiveLevel: 'normal',
        submitReview: false
      }
    }));
    const sourceId = positiveId(source, '来源');
    expect(statusOf(source)).toBe('draft');

    const schemeTask = await okData(await page.request.post(`/api/v1/generation-schemes/${schemeId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: 'FT-GEN-001 提交字辈方案与明细' }
    }));
    const personTask = await okData(await page.request.post(`/api/v1/persons/${personId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: 'FT-PERSON-001 提交人物及关键事件' }
    }));
    const sourceTask = await okData(await page.request.post(`/api/v1/sources/${sourceId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: 'FT-SOURCE-001 提交来源资料' }
    }));
    const schemeTaskId = positiveId(schemeTask, '字辈审核任务');
    const personTaskId = positiveId(personTask, '人物审核任务');
    const sourceTaskId = positiveId(sourceTask, '来源审核任务');

    const duplicateSubmit = await page.request.post(`/api/v1/persons/${personId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: '重复提交应被拒绝' }
    });
    expect(duplicateSubmit.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(duplicateSubmit))).toMatch(/REVIEW_TARGET_ALREADY_PENDING|REVIEW_ALREADY_PENDING|待审核|重复提交/);

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    const reviewerHeaders = await csrfHeaders(page);
    await approveTask(page, reviewerHeaders, schemeTaskId, '完整链字辈审核通过');
    await approveTask(page, reviewerHeaders, personTaskId, '完整链人物审核通过');
    await approveTask(page, reviewerHeaders, sourceTaskId, '完整链来源审核通过');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    editorHeaders = await csrfHeaders(page);

    const relationship = await okData(await page.request.post(`/api/v1/clans/${clanId}/relationships`, {
      headers: editorHeaders,
      data: {
        fromPersonId: parentPersonId,
        toPersonId: personId,
        relationType: 'parent_child',
        relationLabel: 'father',
        relationCategory: 'blood',
        ritualRelationType: null,
        successionReason: null,
        successorBranchId: null,
        isLineageRelation: true,
        isBiological: true,
        isPrimary: true,
        description: '完整链第三世到第四世父子关系',
        confidenceLevel: 'high'
      }
    }));
    const relationshipId = positiveId(relationship, '关系');
    expect(statusOf(relationship)).toBe('draft');

    const relationshipTask = await okData(await page.request.post(`/api/v1/relationships/${relationshipId}/submit-review`, {
      headers: editorHeaders,
      data: { submitterId: null, diffSummary: 'FT-REL-001 提交父子关系' }
    }));
    const relationshipTaskId = positiveId(relationshipTask, '关系审核任务');

    const bindingRevision = await okData(await page.request.post(`/api/v1/clans/${clanId}/source-bindings/revisions`, {
      headers: editorHeaders,
      data: {
        binding: {
          sourceId,
          targetType: 'person',
          targetId: personId,
          bindingReason: '族谱原文佐证人物身份与字辈',
          excerpt: `${personName}，承字辈。`,
          confidenceLevel: 'high',
          submitReview: true,
          createdBy: null
        },
        changeReason: 'FT-SOURCE-001 提交来源人物绑定'
      }
    }));
    const bindingRevisionId = Number(bindingRevision.revisionId);
    expect(bindingRevisionId, '来源绑定 Revision 必须返回 revisionId').toBeGreaterThan(0);
    expect(statusOf(bindingRevision)).toBe('pending');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'REVIEWER');
    const secondReviewerHeaders = await csrfHeaders(page);
    await approveTask(page, secondReviewerHeaders, relationshipTaskId, '完整链关系审核通过');
    const bindingApprove = await okData(await page.request.post(`/api/v1/source-binding-revisions/${bindingRevisionId}/approve`, {
      headers: secondReviewerHeaders,
      data: { reviewComment: '完整链来源绑定审核通过' }
    }));
    expect(statusOf(bindingApprove)).toBe('approved');

    await resetBrowserSession(page);
    await loginThroughUi(page, 'EDITOR');
    editorHeaders = await csrfHeaders(page);

    const officialSchemes = await okData(await page.request.get(`/api/v1/clans/${clanId}/generation-schemes`));
    const officialScheme = officialSchemes.find((item: any) => Number(item.id) === schemeId);
    expect(statusOf(officialScheme)).toBe('official');
    const officialItems = await okData(await page.request.get(`/api/v1/generation-schemes/${schemeId}/items`));
    expect(officialItems.map((item: any) => item.word)).toEqual(['承', '德', '远']);

    const officialPerson = await okData(await page.request.get(`/api/v1/persons/${personId}`));
    expect(statusOf(officialPerson)).toBe('official');
    expect(officialPerson.name).toBe(personName);
    expect(officialPerson.generationWord).toBe('承');
    const officialEvents = await okData(await page.request.get(`/api/v1/persons/${personId}/events`));
    expect(officialEvents.map((item: any) => item.eventTitle)).toEqual(['出生', '迁居多伦多']);

    const officialSource = await okData(await page.request.get(`/api/v1/sources/${sourceId}`));
    expect(statusOf(officialSource)).toBe('official');
    expect(officialSource.sourceName).toBe(sourceName);

    const personRelationships = await okData(await page.request.get(`/api/v1/persons/${personId}/relationships`));
    const officialRelationship = personRelationships.find((item: any) => Number(item.id) === relationshipId);
    expect(statusOf(officialRelationship)).toBe('official');

    const sourceBindings = await okData(await page.request.get(`/api/v1/source-bindings/target/person/${personId}?clanId=${clanId}`));
    const officialBinding = sourceBindings.find((item: any) => Number(item.sourceId) === sourceId);
    expect(officialBinding).toBeTruthy();
    expect(statusOf(officialBinding)).toBe('official');

    const duplicateBinding = await page.request.post(`/api/v1/clans/${clanId}/source-bindings`, {
      headers: editorHeaders,
      data: {
        sourceId,
        targetType: 'person',
        targetId: personId,
        bindingReason: '重复绑定应被拒绝',
        excerpt: `${personName}，承字辈。`,
        confidenceLevel: 'high',
        submitReview: false,
        createdBy: null
      }
    });
    expect(duplicateBinding.ok()).toBeFalsy();
    expect(JSON.stringify(await responsePayload(duplicateBinding))).toMatch(/SOURCE_BINDING_(DUPLICATED|.*EXIST)|重复|已存在|CONFLICT|唯一/);

    const tree = await okData(await page.request.get(
      `/api/v1/tree/person/${rootPersonId}?direction=descendants&dataView=official&maxDepth=6&maxNodes=100&maxEdges=200`
    ));
    expect(JSON.stringify(tree.nodes)).toContain(String(personId));
    expect(tree.edges.length).toBeGreaterThanOrEqual(3);

    await page.getByRole('menuitem', { name: '人物档案', exact: true }).click();
    await expect(page.getByText('查询条件', { exact: true })).toBeVisible();
    await page.getByPlaceholder('请输入姓名').fill(personName);
    await page.getByRole('button', { name: /^查\s*询$/ }).click();
    await expect(page.getByRole('button', { name: personName, exact: true }).first()).toBeVisible();

    await testInfo.attach('full-business-chain-ids', {
      body: JSON.stringify({
        runId,
        clanId,
        branchId,
        schemeId,
        personId,
        sourceId,
        relationshipId,
        bindingRevisionId,
        taskIds: [schemeTaskId, personTaskId, sourceTaskId, relationshipTaskId]
      }, null, 2),
      contentType: 'application/json'
    });
  });
});
