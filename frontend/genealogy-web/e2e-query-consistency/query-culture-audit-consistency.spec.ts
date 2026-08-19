import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  approveTask,
  csrfHeaders,
  dataOf,
  expectError,
  loggedPage,
  okData,
  positiveId,
  recordsOf,
  requiredEnv,
  requiredNumberEnv,
  statusOf
} from './support';

function personPayload(
  branchId: number,
  personCode: string,
  name: string,
  generationNo: number,
  privacyLevel: string,
  living: boolean,
  biography: string
) {
  return {
    branchId,
    personCode,
    name,
    genealogyName: `${name}谱名`,
    courtesyName: null,
    aliasName: null,
    gender: 'male',
    generationNo,
    generationWord: null,
    rankInFamily: null,
    birthDate: living ? '1992-03-04' : '1940-01-02',
    birthDatePrecision: 'day',
    deathDate: living ? null : '2020-05-06',
    deathDatePrecision: living ? null : 'day',
    isLiving: living,
    birthPlace: '长沙市测试地址',
    residencePlace: '多伦多市测试住址',
    occupation: '查询一致性工程师',
    education: 'university',
    titleOrHonor: null,
    biography,
    tombPlace: living ? null : '长沙测试墓园',
    epitaph: living ? null : '查询一致性墓志',
    hasDescendant: false,
    lineageStatus: 'normal',
    privacyLevel,
    dataStatus: 'draft',
    confirmDuplicate: true
  };
}

async function createReviewedPerson(
  adminPage: Page,
  reviewerPage: Page,
  clanId: number,
  payload: Record<string, unknown>,
  label: string
) {
  const adminHeaders = await csrfHeaders(adminPage);
  const person = await okData(await adminPage.request.post(`/api/v1/clans/${clanId}/persons`, {
    headers: adminHeaders,
    data: payload
  }));
  const personId = positiveId(person, `${label}人物`);
  const task = await okData(await adminPage.request.post(`/api/v1/persons/${personId}/submit-review`, {
    headers: adminHeaders,
    data: { submitterId: null, diffSummary: `#835 ${label}人物正式发布` }
  }));
  const taskId = positiveId(task, `${label}人物审核任务`);
  await approveTask(reviewerPage, taskId, `#835 ${label}人物审核通过`);
  const official = await okData(await adminPage.request.get(`/api/v1/persons/${personId}`));
  expect(statusOf(official)).toBe('official');
  return { personId, taskId, official };
}

async function createReviewedSource(
  adminPage: Page,
  reviewerPage: Page,
  clanId: number,
  sourceName: string,
  excerpt: string
) {
  const adminHeaders = await csrfHeaders(adminPage);
  const source = await okData(await adminPage.request.post(`/api/v1/clans/${clanId}/sources`, {
    headers: adminHeaders,
    data: {
      sourceName,
      sourceType: 'genealogy_book',
      providerName: '查询一致性资料提供者',
      bookTitle: '查询一致性族谱',
      volumeNo: '卷一',
      pageNo: '第1页',
      sourceDate: '2026',
      excerpt,
      description: '#835 来源查询与绑定一致性',
      confidenceLevel: 'high',
      privacyLevel: 'branch_only',
      sensitiveLevel: 'normal',
      submitReview: false
    }
  }));
  const sourceId = positiveId(source, `${sourceName}来源`);
  const task = await okData(await adminPage.request.post(`/api/v1/sources/${sourceId}/submit-review`, {
    headers: adminHeaders,
    data: { submitterId: null, diffSummary: `#835 发布来源 ${sourceName}` }
  }));
  const taskId = positiveId(task, `${sourceName}审核任务`);
  await approveTask(reviewerPage, taskId, `#835 来源审核通过 ${sourceName}`);
  const official = await okData(await adminPage.request.get(`/api/v1/sources/${sourceId}`));
  expect(statusOf(official)).toBe('official');
  return { sourceId, taskId };
}

async function bindSource(adminPage: Page, clanId: number, sourceId: number, personId: number, label: string) {
  const binding = await okData(await adminPage.request.post(`/api/v1/clans/${clanId}/source-bindings`, {
    headers: await csrfHeaders(adminPage),
    data: {
      sourceId,
      targetType: 'person',
      targetId: personId,
      bindingReason: `#835 ${label}来源绑定`,
      excerpt: `${label}人物族谱原文`,
      confidenceLevel: 'high',
      submitReview: false,
      createdBy: null
    }
  }));
  expect(statusOf(binding)).toBe('official');
  return positiveId(binding, `${label}来源绑定`);
}

async function createReviewedCulture(
  adminPage: Page,
  reviewerPage: Page,
  clanId: number,
  branchId: number,
  title: string,
  featuredOnHome: boolean
) {
  const created = await okData(await adminPage.request.post(`/api/v1/clans/${clanId}/culture-items`, {
    headers: await csrfHeaders(adminPage),
    data: {
      branchId,
      category: 'family_instruction',
      title,
      summary: `${title}摘要`,
      content: `${title}完整正文，用于验证文化列表、详情、首页精选与审计追踪一致性。`,
      historicalPeriod: '清代至今',
      locationText: '长沙',
      confidenceLevel: 'high',
      privacyLevel: 'branch_only',
      sensitiveLevel: 'normal',
      featuredOnHome,
      sortOrder: featuredOnHome ? 1 : 2
    }
  }));
  const cultureItemId = positiveId(created, `${title}文化资料`);
  const command = await okData(await adminPage.request.post(`/api/v1/culture-items/${cultureItemId}/submit-review`, {
    headers: await csrfHeaders(adminPage),
    data: { comment: `#835 提交文化资料 ${title}` }
  }));
  const taskId = Number(command.reviewTaskId);
  expect(taskId, `${title}必须返回审核任务`).toBeGreaterThan(0);
  await approveTask(reviewerPage, taskId, `#835 文化资料审核通过 ${title}`);
  const official = await okData(await adminPage.request.get(`/api/v1/culture-items/${cultureItemId}`));
  expect(statusOf(official)).toBe('official');
  return { cultureItemId, taskId };
}

async function createReviewedRelationship(
  adminPage: Page,
  reviewerPage: Page,
  clanId: number,
  fromPersonId: number,
  toPersonId: number
) {
  const relationship = await okData(await adminPage.request.post(`/api/v1/clans/${clanId}/relationships`, {
    headers: await csrfHeaders(adminPage),
    data: {
      fromPersonId,
      toPersonId,
      relationType: 'parent_child',
      relationLabel: 'father',
      relationCategory: 'blood',
      ritualRelationType: null,
      successionReason: null,
      successorBranchId: null,
      isLineageRelation: true,
      isBiological: true,
      isPrimary: true,
      description: '#835 查询展示世系关系',
      confidenceLevel: 'high'
    }
  }));
  const relationshipId = positiveId(relationship, '世系关系');
  const task = await okData(await adminPage.request.post(`/api/v1/relationships/${relationshipId}/submit-review`, {
    headers: await csrfHeaders(adminPage),
    data: { submitterId: null, diffSummary: '#835 提交世系关系' }
  }));
  const taskId = positiveId(task, '世系关系审核任务');
  await approveTask(reviewerPage, taskId, '#835 世系关系审核通过');
  return { relationshipId, taskId };
}

async function createSessions(browser: Browser) {
  const admin = await loggedPage(browser, requiredEnv('QUERY_ADMIN_USERNAME'), requiredEnv('QUERY_ADMIN_PASSWORD'));
  const reviewer = await loggedPage(browser, requiredEnv('QUERY_REVIEWER_USERNAME'), requiredEnv('QUERY_REVIEWER_PASSWORD'));
  const viewer = await loggedPage(browser, requiredEnv('QUERY_VIEWER_USERNAME'), requiredEnv('QUERY_VIEWER_PASSWORD'));
  const outsider = await loggedPage(browser, requiredEnv('QUERY_OUTSIDER_USERNAME'), requiredEnv('QUERY_OUTSIDER_PASSWORD'));
  return { admin, reviewer, viewer, outsider };
}

test.describe('查询展示、文化与审计追溯一致性', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  test('FT-QUERY-001~004 / FT-SOURCE-001 / FT-TREE-001 / FT-CULTURE-001 / FT-AUDIT-001~002 / FT-SCOPE-001~002', async ({ browser }, testInfo) => {
    const clanId = requiredNumberEnv('QUERY_CORE_CLAN_ID');
    const rootBranchId = requiredNumberEnv('QUERY_ROOT_BRANCH_ID');
    const childBranchId = requiredNumberEnv('QUERY_CHILD_BRANCH_ID');
    const siblingBranchId = requiredNumberEnv('QUERY_SIBLING_BRANCH_ID');
    const rootBranchName = requiredEnv('QUERY_ROOT_BRANCH_NAME');
    const childBranchName = requiredEnv('QUERY_CHILD_BRANCH_NAME');
    const siblingBranchName = requiredEnv('QUERY_SIBLING_BRANCH_NAME');
    const runId = requiredEnv('QUERY_RUN_ID');
    const suffix = runId.replace(/[^a-zA-Z0-9]/g, '').slice(-10);

    const sessions = await createSessions(browser);
    const adminPage = sessions.admin.page;
    const reviewerPage = sessions.reviewer.page;
    const viewerPage = sessions.viewer.page;
    const outsiderPage = sessions.outsider.page;

    const rootName = `黄查询始祖-${runId}`;
    const childName = `黄查询在世私密-${runId}`;
    const siblingName = `黄兄弟支派人物-${runId}`;
    const rootSourceName = `授权子树来源-${runId}`;
    const siblingSourceName = `兄弟支派来源-${runId}`;
    const rootCultureTitle = `授权子树家训-${runId}`;
    const siblingCultureTitle = `兄弟支派家训-${runId}`;

    const root = await createReviewedPerson(
      adminPage,
      reviewerPage,
      clanId,
      personPayload(rootBranchId, `QC-${suffix}-R`, rootName, 1, 'public', false, '查询一致性始祖完整传记'),
      '授权根支派'
    );
    const child = await createReviewedPerson(
      adminPage,
      reviewerPage,
      clanId,
      personPayload(childBranchId, `QC-${suffix}-C`, childName, 2, 'private', true, '在世私密人物完整传记与联系方式'),
      '授权下级支派'
    );
    const sibling = await createReviewedPerson(
      adminPage,
      reviewerPage,
      clanId,
      personPayload(siblingBranchId, `QC-${suffix}-S`, siblingName, 2, 'public', false, '兄弟支派人物传记'),
      '兄弟支派'
    );

    const relationship = await createReviewedRelationship(adminPage, reviewerPage, clanId, root.personId, child.personId);

    const rootSource = await createReviewedSource(adminPage, reviewerPage, clanId, rootSourceName, `${childName}，第二世。`);
    const siblingSource = await createReviewedSource(adminPage, reviewerPage, clanId, siblingSourceName, `${siblingName}，第二世。`);
    const rootBindingId = await bindSource(adminPage, clanId, rootSource.sourceId, child.personId, '授权子树');
    const siblingBindingId = await bindSource(adminPage, clanId, siblingSource.sourceId, sibling.personId, '兄弟支派');

    const rootCulture = await createReviewedCulture(adminPage, reviewerPage, clanId, childBranchId, rootCultureTitle, true);
    const siblingCulture = await createReviewedCulture(adminPage, reviewerPage, clanId, siblingBranchId, siblingCultureTitle, true);

    const adminDashboard = await okData(await adminPage.request.get(`/api/v1/clans/${clanId}/dashboard`));
    expect(adminDashboard).toMatchObject({ peopleTotal: 3, branchCount: 3, sourceCount: 2, pendingReviewCount: 0 });
    expect(JSON.stringify(adminDashboard.branchDistribution)).toContain(rootBranchName);
    expect(JSON.stringify(adminDashboard.branchDistribution)).toContain(childBranchName);
    expect(JSON.stringify(adminDashboard.branchDistribution)).toContain(siblingBranchName);

    const adminPeople = await okData(await adminPage.request.get(
      `/api/v1/persons/search?clanId=${clanId}&dataStatus=official&pageNo=1&pageSize=20&sort=name,asc`
    ));
    expect(Number(adminPeople.total)).toBe(3);
    expect(recordsOf(adminPeople).map((item: any) => item.name)).toEqual(expect.arrayContaining([rootName, childName, siblingName]));

    const adminSources = await okData(await adminPage.request.get(
      `/api/v1/clans/${clanId}/sources?verificationStatus=official&pageNo=1&pageSize=20&sort=updatedAt,desc`
    ));
    expect(Number(adminSources.total)).toBe(2);
    expect(recordsOf(adminSources).map((item: any) => item.sourceName)).toEqual(expect.arrayContaining([rootSourceName, siblingSourceName]));

    const cultureOverview = await okData(await adminPage.request.get(`/api/v1/clans/${clanId}/culture-overview`));
    expect(cultureOverview.statistics.officialItemCount).toBe(2);
    expect(cultureOverview.featuredItems.map((item: any) => item.title)).toEqual(expect.arrayContaining([rootCultureTitle, siblingCultureTitle]));

    const tree = await okData(await adminPage.request.get(
      `/api/v1/tree/person/${root.personId}?direction=descendants&dataView=official&maxDepth=4&maxNodes=50&maxEdges=100`
    ));
    expect(tree.nodes.some((item: any) => Number(item.personId ?? item.id) === child.personId)).toBeTruthy();
    expect(tree.edges.some((item: any) => Number(item.relationshipId ?? item.id) === relationship.relationshipId)).toBeTruthy();

    const trace = await okData(await adminPage.request.get(
      `/api/v1/tracking/objects/person/${child.personId}/trace?clanId=${clanId}`
    ));
    expect(trace.objectSummary.objectId).toBe(child.personId);
    expect(trace.revisions.length).toBeGreaterThanOrEqual(1);
    expect(trace.reviewTasks.some((item: any) => Number(item.id) === child.taskId)).toBeTruthy();
    expect(trace.sourceBindings.some((item: any) => Number(item.id) === rootBindingId)).toBeTruthy();
    expect(trace.operationLogs.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(trace.timeline)).toMatch(/REVISION_SUBMITTED|REVIEW_APPROVED|REVISION_APPLIED/);
    expect(JSON.stringify(trace)).toContain('查询一致性');

    await expectError(
      await adminPage.request.get(`/api/v1/tracking/objects/person/9223372036854775000/trace?clanId=${clanId}`),
      404,
      /NOT_FOUND|不存在/
    );

    const adminPrivateDetail = await okData(await adminPage.request.get(`/api/v1/persons/${child.personId}`));
    expect(adminPrivateDetail.name).toBe(childName);
    expect(adminPrivateDetail.biography).toContain('完整传记');
    expect(adminPrivateDetail.residencePlace).toContain('多伦多');

    const viewerDashboard = await okData(await viewerPage.request.get(`/api/v1/clans/${clanId}/dashboard`));
    expect(viewerDashboard.peopleTotal).toBe(2);
    expect(viewerDashboard.branchCount).toBe(2);
    expect(viewerDashboard.sourceCount).toBe(1);
    expect(JSON.stringify(viewerDashboard)).not.toContain(siblingName);
    expect(JSON.stringify(viewerDashboard)).not.toContain(siblingSourceName);
    expect(JSON.stringify(viewerDashboard)).not.toContain(siblingBranchName);

    const viewerPeople = await okData(await viewerPage.request.get(
      `/api/v1/persons/search?clanId=${clanId}&dataStatus=official&pageNo=1&pageSize=20&sort=name,asc`
    ));
    expect(Number(viewerPeople.total)).toBe(2);
    expect(recordsOf(viewerPeople).some((item: any) => item.name === siblingName)).toBeFalsy();
    const maskedChild = recordsOf(viewerPeople).find((item: any) => Number(item.id) === child.personId);
    expect(maskedChild.name).toBe('受保护人物');
    expect(maskedChild.biography).toBeNull();
    expect(maskedChild.residencePlace).toBeNull();

    const viewerPrivateDetail = await okData(await viewerPage.request.get(`/api/v1/persons/${child.personId}`));
    expect(viewerPrivateDetail.name).toBe('受保护人物');
    expect(viewerPrivateDetail.biography).toBeNull();
    await expectError(await viewerPage.request.get(`/api/v1/persons/${sibling.personId}`), 403, /AUTH_FORBIDDEN|暂无权限/);

    const viewerSources = await okData(await viewerPage.request.get(
      `/api/v1/clans/${clanId}/sources?verificationStatus=official&pageNo=1&pageSize=20&sort=updatedAt,desc`
    ));
    expect(Number(viewerSources.total)).toBe(1);
    expect(recordsOf(viewerSources)[0].sourceName).toBe(rootSourceName);
    expect(JSON.stringify(viewerSources)).not.toContain(siblingSourceName);
    await expectError(await viewerPage.request.get(`/api/v1/sources/${siblingSource.sourceId}`), 404, /SOURCE_NOT_FOUND|不存在|不可见/);

    const viewerCulture = await okData(await viewerPage.request.get(
      `/api/v1/clans/${clanId}/culture-items?dataStatus=official&pageNo=1&pageSize=20&sort=updatedAt,desc`
    ));
    expect(viewerCulture.page.totalElements).toBe(1);
    expect(viewerCulture.items[0].title).toBe(rootCultureTitle);
    expect(JSON.stringify(viewerCulture)).not.toContain(siblingCultureTitle);
    await expectError(await viewerPage.request.get(`/api/v1/culture-items/${siblingCulture.cultureItemId}`), 404, /CULTURE_ITEM_NOT_FOUND|不存在|不可见/);

    await expectError(await outsiderPage.request.get(`/api/v1/clans/${clanId}/dashboard`), 403, /AUTH_FORBIDDEN|暂无权限|不是该宗族/);
    await expectError(await outsiderPage.request.get(
      `/api/v1/persons/search?clanId=${clanId}&dataStatus=official&pageNo=1&pageSize=20`
    ), 403, /AUTH_FORBIDDEN|暂无权限|不是该宗族/);
    await expectError(await outsiderPage.request.get(
      `/api/v1/clans/${clanId}/sources?verificationStatus=official&pageNo=1&pageSize=20`
    ), 403, /AUTH_FORBIDDEN|暂无权限|不是该宗族/);
    await expectError(await outsiderPage.request.get(`/api/v1/clans/${clanId}/culture-overview`), 403, /AUTH_FORBIDDEN|暂无权限|不是该宗族/);
    await expectError(await outsiderPage.request.get(
      `/api/v1/tracking/objects/person/${child.personId}/trace?clanId=${clanId}`
    ), 403, /AUTH_FORBIDDEN|暂无权限|不是该宗族/);

    await adminPage.goto(`/?view=personArchive&name=${encodeURIComponent(childName)}&dataStatus=official&pageSize=20&sort=name,asc`);
    await expect(adminPage.getByRole('button', { name: childName, exact: true }).first()).toBeVisible();
    await adminPage.reload();
    await expect(adminPage.getByRole('button', { name: childName, exact: true }).first()).toBeVisible();
    await adminPage.getByRole('button', { name: childName, exact: true }).first().click();
    await expect(adminPage).toHaveURL(new RegExp(`/persons/${child.personId}`));
    await expect(adminPage.getByText('在世私密人物完整传记与联系方式', { exact: false })).toBeVisible();
    await adminPage.goBack();
    await expect(adminPage.getByRole('button', { name: childName, exact: true }).first()).toBeVisible();
    await adminPage.goForward();
    await expect(adminPage).toHaveURL(new RegExp(`/persons/${child.personId}`));

    await adminPage.goto(`/?view=sourceLibrary&keyword=${encodeURIComponent(rootSourceName)}&verificationStatus=official&sourceId=${rootSource.sourceId}`);
    await expect(adminPage.getByText(rootSourceName, { exact: true }).first()).toBeVisible();
    await adminPage.reload();
    await expect(adminPage.getByText(rootSourceName, { exact: true }).first()).toBeVisible();
    await expect(adminPage.getByText(childName, { exact: false }).first()).toBeVisible();

    await adminPage.goto(`/?view=culture&cultureTab=items&cultureKeyword=${encodeURIComponent(rootCultureTitle)}&cultureStatus=official&cultureItem=${rootCulture.cultureItemId}`);
    await expect(adminPage.getByText(rootCultureTitle, { exact: true }).first()).toBeVisible();
    await adminPage.reload();
    await expect(adminPage.getByText(rootCultureTitle, { exact: true }).first()).toBeVisible();
    await expect(adminPage.getByText(`${rootCultureTitle}完整正文`, { exact: false }).first()).toBeVisible();

    await viewerPage.goto(`/?view=personArchive&dataStatus=official&pageSize=20&sort=name,asc`);
    await expect(viewerPage.getByText('受保护人物', { exact: true }).first()).toBeVisible();
    await expect(viewerPage.getByText(siblingName, { exact: true })).toHaveCount(0);

    await testInfo.attach('query-consistency-chain', {
      body: JSON.stringify({
        clanId,
        branches: { rootBranchId, childBranchId, siblingBranchId },
        people: { root, child, sibling },
        relationship,
        sources: { rootSource, siblingSource, rootBindingId, siblingBindingId },
        culture: { rootCulture, siblingCulture }
      }, null, 2),
      contentType: 'application/json'
    });

    await Promise.all(Object.values(sessions).map(session => session.context.close()));
  });
});
