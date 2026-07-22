# Issue 694 建谱向导查询结果结构清单

## `frontend/genealogy-web/e2e/culture-page-pattern.spec.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 1

```text
97: await expect(outerHeader.getByText('查询结果', { exact: true })).toBeVisible();
```

## `frontend/genealogy-web/e2e/home-dashboard-header.spec.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
176: await page.getByRole('button', { name: '开始建谱' }).click();
177: await expect(page).toHaveURL(/view=mvp1Wizard/);
186: await expect(page.getByRole('button', { name: '开始建谱' })).toHaveCount(0);
219: await expect(page.getByRole('button', { name: '开始建谱' })).toHaveCount(0);
```

## `frontend/genealogy-web/e2e/import-page-pattern.spec.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 1

```text
110: await expect(outerResultHeader.getByText('查询结果', { exact: true })).toBeVisible();
```

## `frontend/genealogy-web/e2e/tracking-page-pattern.spec.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 2

```text
48: await expect(outerHeader.getByText('查询结果', { exact: true })).toBeVisible();
63: await expect(page.locator('.tracking-result-card > .query-result-outer-card__header').getByText('查询结果', { exact: true })).toBeVisible();
```

## `frontend/genealogy-web/e2e/wizard-query-result-pattern.spec.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 1

```text
30: async function mockWizardApi(page: Page) {
33: localStorage.setItem('genealogy.mvp1Wizard.session', JSON.stringify({
53: if (path === '/auth/me') return route.fulfill(ok({ id: 7, username: 'wizard_admin', displayName: '建谱管理员', status: 'active' }));
68: async function openWizardStep(page: Page, step: string) {
69: await page.goto(`/?view=mvp1Wizard&step=${step}`);
72: await expect(page.locator('.wizard-step-content')).toHaveAttribute('aria-label', `${stepTitles[step]}步骤内容`);
73: await expect(page.locator('.wizard-step-content .wizard-query-result-card').first()).toBeVisible();
77: const cards = page.locator('.wizard-step-content .wizard-query-result-card');
86: await expect(card.locator(':scope > .query-result-outer-card__header').getByText('查询结果', { exact: true })).toBeVisible();
90: test('all active genealogy wizard nodes use query result card plus direct table', async ({ page }) => {
91: await mockWizardApi(page);
94: await openWizardStep(page, step);
98: await openWizardStep(page, 'generation');
100: const modalResult = page.locator('.ant-modal .wizard-query-result-card');
```

## `frontend/genealogy-web/src/app/App.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
24: import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
43: ['mvp1Wizard', '建谱向导', '创建宗族、支派、字辈、人物、关系、来源和审核'],
178: case 'mvp1Wizard': return <Mvp1WizardPage notify={notify} />;
```

## `frontend/genealogy-web/src/compact-ui.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
12: .wizard-hero p,
23: .wizard-hero,
35: .wizard-hero > div:first-child,
42: .wizard-hero:empty,
46: .wizard-hero h2,
59: .mvp1-wizard { gap: 16px; }
```

## `frontend/genealogy-web/src/features/culture/CultureEditorShell.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
63: <Card className="culture-editor-header">
```

## `frontend/genealogy-web/src/features/culture/CultureItemEditorPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
139: if (loading) return <Card loading title={editor.mode === 'create' ? '新增文化资料' : '正在加载文化资料'} />;
175: <Card title="基础信息">
185: <Card title="正文内容">
190: <Card title="治理与展示">
```

## `frontend/genealogy-web/src/features/culture/CultureItemMaintenanceTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 1

```text
32: message="文化资料刷新失败，仍显示上次查询结果"
```

## `frontend/genealogy-web/src/features/culture/CultureItemStandardTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
83: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
498: <Card size="small" className="culture-page-header culture-search-card" title="宗族文化">
527: <QueryResultCard
537: <Table<CultureItemSummaryResponse>
550: </QueryResultCard>
```

## `frontend/genealogy-web/src/features/culture/CultureItemTable.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
92: <Table<CultureItemSummaryResponse>
```

## `frontend/genealogy-web/src/features/culture/CultureSearchPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
94: <Card size="small" title="文化资料检索">
```

## `frontend/genealogy-web/src/features/culture/CultureSiteEditorPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
154: return <Card loading title={editor.mode === 'create' ? '新增文化场所' : '正在加载文化场所'} />;
205: <Card title="基本信息">
220: <Card title="所属范围与关联对象">
240: <Card title="地址与历史">
270: <Card title="坐标信息">
286: <Card title="治理与展示">
```

## `frontend/genealogy-web/src/features/culture/CultureSiteMaintenanceTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
536: <Card title="文化场所查询" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增场所</Button>}>
550: <Card title="祠堂与文化场所">
556: <Table<CultureSiteSummaryResponse>
595: <Card size="small" title="摘要与历史说明"><Paragraph>{detail.summary || '暂无摘要'}</Paragraph><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
596: <Card size="small" title="来源证据">
599: <Card size="small" title="附件">
605: <Card size="small" title="审核与追踪">
```

## `frontend/genealogy-web/src/features/culture/CultureSitePanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
316: return <Card title="祠堂与文化场所" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增场所</Button>}>
329: <Card size="small" loading={loading} title={item.name} extra={<Tag>{siteTypeLabel(item.siteType)}</Tag>}>
340: <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={items} pagination={{ current: search.pageNo, pageSize: search.pageSize, total, showSizeChanger: true, onChange: (pageNo, pageSize) => setSearch({ ...search, pageNo, pageSize }) }} scroll={{ x: 1280 }} />
358: <Card size="small" title="摘要与说明"><Paragraph>{detail.summary || '暂无摘要'}</Paragraph><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
359: <Card size="small" title="来源证据">
362: <Card size="small" title="影像附件">
363: {detail.attachments.length ? <List grid={{ gutter: 12, xs: 1, sm: 2 }} dataSource={detail.attachments} renderItem={attachment => <List.Item><Card size="small"><Space direction="vertical"><Image preview={false} width={64} height={48} style={{ objectFit: 'cover' }} fallback="data:image/gif;base64,R0lG
365: <Card size="small" title="审核与追踪">
```

## `frontend/genealogy-web/src/features/culture/CultureSiteStandardTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
48: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
306: <Card size="small" className="culture-page-header culture-search-card" title="宗族文化">
319: <QueryResultCard className="culture-result-card" extra={<Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: 'site', mode: 'create' })}>{culturePrimaryAction(activeTab)}</Button>} total={total} resultExtra={<Select aria-label="文化场所排序" className="culture-result-sort" value={s
325: {clanId && !listForbidden && !listError ? <Table<CultureSiteSummaryResponse> rowKey="id" size="middle" loading={listLoading} columns={columns} dataSource={items} scroll={{ x: 1300 }} onRow={item => ({ onClick: () => openDetail(item), tabIndex: 0, onKeyDown: event => { if (event.key === 'Enter') open
327: </QueryResultCard>
332: { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}><Descriptions.Item label="场所名称">{detail.name}</Descriptions.Item><Descriptions.Item label="类型">{siteTypeLabel(detail.siteType)}</
```

## `frontend/genealogy-web/src/features/culture/CultureSiteTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
498: <Card size="small" title="祠堂与文化场所" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增场所</Button>}>
515: <Card title="文化场所列表">
519: {clanId && !listForbidden ? <Table<CultureSiteSummaryResponse>
559: <Card size="small" title="摘要与历史说明"><Paragraph>{detail.summary || '暂无摘要'}</Paragraph><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
560: <Card size="small" title="来源证据">
563: <Card size="small" title="附件">
569: <Card size="small" title="审核与追踪">
```

## `frontend/genealogy-web/src/features/culture/MigrationEventEditorPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
139: return <Card loading title={editor.mode === 'create' ? '新增迁徙事件' : '正在加载迁徙事件'} />;
190: <Card title="迁徙范围">
205: <Card title="路线与时期">
225: <Card title="始迁祖与原因">
245: <Card title="详细说明">
251: <Card title="治理与展示">
```

## `frontend/genealogy-web/src/features/culture/MigrationEventMaintenanceTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
500: <Card title="迁徙脉络" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增迁徙事件</Button>}>
521: <Table<MigrationEventSummaryResponse>
558: <Card size="small" title="详细说明"><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
559: <Card size="small" title={`来源证据（${detail.sources.length}）`}>
564: <Card size="small" title="审核与追踪">
```

## `frontend/genealogy-web/src/features/culture/MigrationEventStandardTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
48: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
284: <Card size="small" className="culture-page-header culture-search-card" title="宗族文化">
297: <QueryResultCard className="culture-result-card" extra={<Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: 'migration', mode: 'create' })}>{culturePrimaryAction(activeTab)}</Button>} total={total} resultExtra={<Select aria-label="迁徙脉络排序" className="culture-result-sort" val
303: {clanId && !listForbidden && !listError ? <Table<MigrationEventSummaryResponse> rowKey="id" size="middle" loading={listLoading} columns={columns} dataSource={items} scroll={{ x: 1300 }} onRow={item => ({ onClick: () => openDetail(item), tabIndex: 0, onKeyDown: event => { if (event.key === 'Enter') o
305: </QueryResultCard>
310: { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}><Descriptions.Item label="所属支派">{detail.scope.branchName || '未命名支派'}</Descriptions.Item><Descriptions.Item label="迁徙顺序">{detail.s
```

## `frontend/genealogy-web/src/features/culture/MigrationEventTab.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
471: <Card title="迁徙脉络" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增迁徙事件</Button>}>
492: <Table<MigrationEventSummaryResponse>
529: <Card size="small" title="详细说明"><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
530: <Card size="small" title={`来源证据（${detail.sources.length}）`}>
535: <Card size="small" title="审核与追踪">
```

## `frontend/genealogy-web/src/features/culture/MigrationTimelinePanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
236: return <Card title="迁徙脉络" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增迁徙事件</Button>}>
252: <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={items} pagination={{ current: search.pageNo, pageSize: search.pageSize, total, showSizeChanger: true, onChange: (pageNo, pageSize) => setSearch({ ...search, pageNo, pageSize }) }} scroll={{ x: 1100 }} />
267: <Card size="small" title="说明"><Paragraph>{detail.description || '暂无说明'}</Paragraph></Card>
268: <Card size="small" title={`来源证据（${detail.sources.length}）`}>
```

## `frontend/genealogy-web/src/features/home/UnifiedStatisticsHomePage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
317: <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
325: <Card className="public-home-page__empty">
342: <Card className="public-home-page__hero">
375: <Col key={index} xs={24} sm={12} xl={6}><Card><Skeleton active paragraph={{ rows: 2 }} /></Card></Col>
382: <Card className="public-home-page__metric-card">
393: <Card title="宗族历史与文化" className="public-home-page__feature-card">
410: <Card title="公共浏览入口" className="public-home-page__entry-card">
431: <Card title="支派分布" extra={<Button type="link" onClick={() => navigateToView('treeProduct')}>进入世系图谱</Button>}>
448: <Card title="宗族纪事" extra={<Button type="link" onClick={() => openCulture('items')}>查看全部文化资料</Button>}>
```

## `frontend/genealogy-web/src/features/imports/AsyncImportExecutionPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
230: <Table<ImportTaskRecord>
251: {loading ? <Card loading /> : visibleJobs.length ? visibleJobs.map(job => {
255: <Card key={job.id} size="small" title={<Space><span className={`import-task-type-icon import-task-type-icon--${presentation.className}`}>{presentation.icon}</span>{presentation.label}</Space>} extra={<Tag color={importTaskStatusColor(status)}>{importTaskStatusText[status]}</Tag>}>
286: <Card size="small" title="技术执行信息"><Descriptions column={1} size="small" items={[
```

## `frontend/genealogy-web/src/features/imports/ImportFailureBulkActions.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
142: <Card size="small" title="批量处理失败行" style={{ marginBottom: 12 }}>
230: <Table<ImportRowBulkItemResult>
```

## `frontend/genealogy-web/src/features/imports/ImportHistoryOverviewPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
120: <Card title="导入记录概览" extra={<Button loading={loading} onClick={() => void load()}>刷新</Button>}>
129: <Table<ImportJobSummary>
148: {loading ? <Card loading /> : jobs.length ? jobs.map(job => (
149: <Card key={job.id} size="small" title={importTypeText(job.importType || job.legacyImportType)} extra={<Tag color={processingColor(job)}>{processingText(job)}</Tag>}>
```

## `frontend/genealogy-web/src/features/imports/ImportJobManagementPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
404: <Card title="导入任务" style={{ marginTop: 16 }} extra={<Button loading={loading} onClick={() => void loadJobs()}>刷新</Button>}>
412: <Table<ImportJobSummary>
457: <Card title={`批次处理 · ${selectedJob.originalFilename || importTypeText(selectedJob.importType)}`} loading={detailLoading} style={{ marginTop: 16 }} extra={canSubmitReview(selectedJob) ? <Button type="primary" onClick={() => { setReviewJob(selectedJob); setReviewComment(''); }}>{selectedJob.reviewStat
488: <Table<ImportJobRow>
```

## `frontend/genealogy-web/src/features/imports/ImportPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
28: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
188: <Card className="import-query-card" title="导入任务查询">
216: <QueryResultCard
234: </QueryResultCard>
256: <Card size="small" title="导入目标">
```

## `frontend/genealogy-web/src/features/imports/ImportReviewHistoryPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
78: <Card
86: <Table<ReviewTaskListItemResponse>
```

## `frontend/genealogy-web/src/features/imports/StandardImportWorkspace.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
227: <Card title={title} extra={<Space wrap><Button loading={templateDownloading === 'csv'} disabled={Boolean(templateDownloading)} onClick={() => void downloadTemplate('csv')}>下载 CSV 模板</Button><Button loading={templateDownloading === 'xlsx'} disabled={Boolean(templateDownloading)} onClick={() => void d
238: {preview ? <Card title={`${title}预检结果`}>
249: <div className="import-preview-table"><Table<Row> size="middle" rowKey={(row, index) => String(row.rowNo || index)} dataSource={filteredRows} pagination={{ pageSize: 20, showSizeChanger: true, showTotal: total => `共 ${total} 条` }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} desc
250: <div className="import-preview-card-list">{filteredRows.map((row, index) => <Card key={String(row.rowNo || index)} size="small" title={`第 ${row.rowNo || index + 1} 行`} extra={statusTag(importValidationStatus(row))}><Space direction="vertical" size={4}>{mobileEntries(row).map(([key, value]) => <Typog
```

## `frontend/genealogy-web/src/features/logs/LogPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
55: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
395: <Table<TrackingObjectResponse> size="small" rowKey={row => `${row.objectType}-${row.objectId}`} dataSource={objectRows} loading={objectLoading} scroll={{ x: 900 }} onRow={row => ({ onClick: () => openTrace(row) })} rowClassName="tracking-clickable-row" locale={{ emptyText: <Empty image={Empty.PRESEN
407: <Table<OperationLogResponse> size="small" rowKey={row => String(row.id)} dataSource={auditRows} loading={auditLoading} scroll={{ x: 980 }} onRow={row => ({ onClick: () => { setSelectedAuditLog(row); setSelectedAuditLogId(String(row.id)); } })} rowClassName="tracking-clickable-row" locale={{ emptyTex
419: <Table<RiskAuditEventResponse> size="small" rowKey={row => String(row.id)} dataSource={riskRows} loading={riskLoading} scroll={{ x: 1180 }} onRow={row => ({ onClick: () => { setSelectedRiskLog(row); setSelectedRiskLogId(String(row.id)); } })} rowClassName="tracking-clickable-row" locale={{ emptyText
438: <Card className="tracking-query-card" title="审计追踪">
447: <QueryResultCard
454: </QueryResultCard>
```

## `frontend/genealogy-web/src/features/logs/RiskAuditPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
187: <Card className="tracking-filter-card">
242: <Card title="高风险操作事件" extra={<Text type="secondary">点击记录查看原始日志；可追踪对象可直接跳转</Text>}>
243: <Table<RiskAuditEventResponse>
```

## `frontend/genealogy-web/src/features/logs/TrackingDetailDrawers.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
116: <Table<TrackingTraceChangeChainResponse>
157: <Table<TrackingTraceRevisionResponse>
178: <Table<TrackingTraceReviewTaskResponse>
200: <Table<TrackingTraceSourceBindingResponse>
222: <Table<OperationLogResponse>
```

## `frontend/genealogy-web/src/features/logs/TrackingTraceDetailPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
215: <Card title="对象摘要"><TraceOverview detail={summary} /></Card>
217: <Card className="tracking-detail-page__content">
232: <Table
239: <Table<FieldDiff>
265: key: 'reviews', label: `审核记录 (${reviews.data.length})`, children: <SectionStateView state={reviews} onRetry={() => void loadSection('reviews')}><Table rowKey={row => String(row.id)} dataSource={reviews.data} pagination={false} columns={[{ key: 'status', title: '审核状态', width: 110, render: (_value, ro
268: key: 'sources', label: `来源证据 (${sources.data.length})`, children: <SectionStateView state={sources} onRetry={() => void loadSection('sources')}><Table rowKey={row => String(row.id)} dataSource={sources.data} pagination={false} columns={[{ key: 'source', title: '来源资料', dataIndex: 'sourceDisplayName' 
271: key: 'logs', label: `操作日志 (${logs.data.length})`, children: <SectionStateView state={logs} onRetry={() => void loadSection('logs')}><Table rowKey={row => String(row.id)} dataSource={logs.data} pagination={false} columns={[{ key: 'action', title: '动作', width: 130, render: (_value, row) => actionText(
274: key: 'chains', label: `链路诊断 (${chains.data.length})`, children: <SectionStateView state={chains} onRetry={() => void loadSection('chains')}><Table rowKey={row => row.chainKey} dataSource={chains.data} pagination={false} columns={[{ key: 'trace', title: '变更链路', render: (_value, row) => <Text code cop
```

## `frontend/genealogy-web/src/features/members/MemberPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
44: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
530: <Card title="成员与权限">
619: <QueryResultCard className="member-result-card" extra={<Button type="primary" onClick={openCreateGrant} disabled={!selectedClanId || !roles.length}>新增成员授权</Button>} style={{ marginTop: 16 }} total={total} totalSuffix="名成员">
643: <Table<MemberAggregate>
665: </QueryResultCard>
722: <Table<MemberGrant>
747: <Table<MemberPermissionAudit>
```

## `frontend/genealogy-web/src/features/mvp1/Mvp1WizardPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
5: deriveWizardStepStates,
6: emptyWizardStateSnapshot,
7: getWizardStepGate,
9: type WizardStateSnapshot
10: } from './domain/wizardStepState';
13: captureWizardStepDraft,
14: createLocalWizardSessionStore,
15: createWizardSession,
16: readWizardStepFromUrl,
17: restoreWizardStepDraft,
18: writeWizardStepToUrl,
19: type WizardSession,
20: type WizardStepDraft
21: } from './services/wizardSessionService';
22: import { loadWizardStateSnapshot } from './services/wizardStepStateService';
23: import { WizardShell, type WizardGateNotice } from './WizardShell';
29: type DraftState = Partial<Record<Mvp1StepKey, WizardStepDraft>>;
40: function normalizeWizardStep(step?: Mvp1StepKey): Mvp1StepKey {
58: function loadFailureSnapshot(active: Mvp1StepKey, message: string): WizardStateSnapshot {
59: const snapshot = emptyWizardStateSnapshot();
71: export function Mvp1WizardPage({ notify }: Props) {
73: const sessionStore = useMemo(() => createLocalWizardSessionStore(), []);
74: const [storedSession] = useState<WizardSession | undefined>(() => sessionStore.load());
75: const urlStep = useMemo(() => readWizardStepFromUrl(new URL(window.location.href)), []);
76: const [active, setActive] = useState<Mvp1StepKey>(normalizeWizardStep(urlStep || storedSession?.activeStep));
83: const [wizardSnapshot, setWizardSnapshot] = useState<WizardStateSnapshot>(emptyWizardStateSnapshot);
85: const [gateNotice, setGateNotice] = useState<WizardGateNotice<Mvp1StepKey> | undefined>();
89: function restoreWorkspace(session: WizardSession) {
119: setResult({ message: '已开始新的建谱会话。' });
120: window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), 'clan'));
128: title: '继续上次建谱？',
129: content: `上次保存于 ${new Date(storedSession.savedAt).toLocaleString('zh-CN')}，停留在“${stepOrder.find(step => step.key === storedSession.activeStep)?.title || '建谱'}”。`,
136: setActive(normalizeWizardStep(urlStep || storedSession.activeStep));
155: void loadWizardStateSnapshot({
163: if (!cancelled) setWizardSnapshot(snapshot);
167: setWizardSnapshot(loadFailureSnapshot(active, message));
188: const stepDecisions = useMemo(() => deriveWizardStepStates({
189: ...wizardSnapshot,
197: wizardSnapshot,
220: const selectedClan = wizardSnapshot.clans.find(clan => String(clan.id || '') === String(workspace.clanId || ''));
230: const session = createWizardSession({
248: notify({ message: '建谱草稿已保存' });
258: const root = document.querySelector('.wizard-step-content');
260: const nextDrafts = { ...drafts, [active]: captureWizardStepDraft(root) };
270: const nextUrl = writeWizardStepToUrl(new URL(window.location.href), step);
279: if (getWizardStepGate(stepDecisions, key).allowed) return key;
285: const gate = getWizardStepGate(stepDecisions, step);
301: const requested = normalizeWizardStep(readWizardStepFromUrl(new URL(window.location.href)) || active);
302: const gate = getWizardStepGate(stepDecisions, requested);
305: else window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), active));
316: window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), fallback));
322: const root = document.querySelector('.wizard-step-content');
323: if (root) restoreWizardStepDraft(root, drafts[active]);
331: const requestedStep = readWizardStepFromUrl(new URL(window.location.href));
333: window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), active));
336: const requested = normalizeWizardStep(requestedStep);
337: const gate = getWizardStepGate(stepDecisions, requested);
348: window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), fallback));
362: function saveWizardProgress() {
389: title: '退出建谱？',
392: cancelText: '继续建谱',
417: <WizardShell
418: title="建谱向导"
419: description="按宗族、支派、字辈、人物、关系和来源顺序完成建谱。"
438: onSaveDraft: saveWizardProgress,
448: </WizardShell>
```

## `frontend/genealogy-web/src/features/mvp1/StepDraftReviewPanel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 1

```text
111: const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
116: const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
168: const stepContainer = document.querySelector('.mvp1-wizard-page .wizard-steps');
245: <Typography.Paragraph type="secondary">复用当前步骤对象查询结果；草稿/已驳回版本可在列表中勾选后批量提交审批。</Typography.Paragraph>
```

## `frontend/genealogy-web/src/features/mvp1/StepRenderer.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
2: import type { Mvp1StepKey } from './domain/wizardStepState';
9: import { WizardResultListBoundary } from './WizardResultListBoundary';
10: import { WizardValidationBoundary } from './WizardValidationBoundary';
11: import './wizard-step-state.css';
13: export type { Mvp1StepKey } from './domain/wizardStepState';
34: <WizardValidationBoundary step={activeStep}>
35: <WizardResultListBoundary>{content}</WizardResultListBoundary>
36: </WizardValidationBoundary>
```

## `frontend/genealogy-web/src/features/mvp1/WizardCompletionContext.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: type WizardCompletionStatus = {
10: type WizardCompletionContextValue = {
12: status: WizardCompletionStatus;
13: reportStatus: (status: WizardCompletionStatus) => void;
16: export const initialWizardCompletionStatus: WizardCompletionStatus = {
20: reason: '正在检查建谱完成条件。'
23: export const WizardCompletionContext = createContext<WizardCompletionContextValue>({
25: status: initialWizardCompletionStatus,
29: export function useWizardCompletion() {
30: return useContext(WizardCompletionContext);
```

## `frontend/genealogy-web/src/features/mvp1/WizardFormContext.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: import type { Mvp1StepKey } from './domain/wizardStepState';
4: import type { WizardFieldErrors } from './domain/wizardFormValidation';
6: type WizardFormContextValue = {
10: applyServerErrors: (errors?: WizardFieldErrors, message?: string) => void;
13: const WizardFormContext = createContext<WizardFormContextValue>({
18: export function WizardFormProvider({ value, children }: { value: WizardFormContextValue; children: React.ReactNode }) {
19: return <WizardFormContext.Provider value={value}>{children}</WizardFormContext.Provider>;
22: export function useWizardFormContext() {
23: return useContext(WizardFormContext);
```

## `frontend/genealogy-web/src/features/mvp1/WizardResultListBoundary.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
2: import './wizard-result-list.css';
6: export function WizardResultListBoundary({ children }: Props) {
7: return <div className="wizard-result-list-boundary">{children}</div>;
```

## `frontend/genealogy-web/src/features/mvp1/WizardShell.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
4: import type { WizardBusinessState } from './domain/wizardStepState';
6: export type WizardStepMeta<TKey extends string = string> = {
10: state: WizardBusinessState;
17: export type WizardNavigationActions = {
31: export type WizardGateNotice<TKey extends string = string> = {
38: type WizardShellProps<TKey extends string = string> = {
43: steps: WizardStepMeta<TKey>[];
47: navigation: WizardNavigationActions;
48: gateNotice?: WizardGateNotice<TKey>;
55: export function WizardShell<TKey extends string = string>({
65: }: WizardShellProps<TKey>) {
78: <div className="mvp1-wizard-page">
79: <Card className="wizard-progress-card" size="small" aria-label="建谱步骤">
81: className="wizard-ant-steps"
97: <div className="wizard-progress-summary">
98: <div className="wizard-progress-summary__heading">
108: className="wizard-gate-alert"
120: className="wizard-step-content"
```

## `frontend/genealogy-web/src/features/mvp1/WizardValidationBoundary.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
4: import type { Mvp1StepKey } from './domain/wizardStepState';
5: import { mapWizardServerFieldErrors, type WizardFieldErrors } from './domain/wizardFormValidation';
6: import { WizardFormProvider } from './WizardFormContext';
13: export function WizardValidationBoundary({ step, children }: Props) {
22: function applyServerErrors(errors?: WizardFieldErrors, message = '保存失败，请修正当前步骤后重试') {
23: const mapped = mapWizardServerFieldErrors(errors);
45: <WizardFormProvider value={contextValue}>
54: <div className="wizard-validation-boundary">
57: className="wizard-step-local-error"
68: </WizardFormProvider>
```

## `frontend/genealogy-web/src/features/mvp1/domain/sourceStageModel.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
64: assert.doesNotMatch(activeSourceStageSource, /pagedLinks\.rows\.map\([\s\S]*?<Card/);
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardCompletionModel.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: import { deriveWizardCompletionControl } from '../../../../.wizard-completion-test/features/mvp1/domain/wizardCompletionModel.js';
6: const control = deriveWizardCompletionControl({ activeStep: 'review', ready: true, completed: false, blockerCount: 2 });
7: assert.equal(control.label, '完成建谱');
14: const control = deriveWizardCompletionControl({ activeStep: 'review', ready: true, completed: false, blockerCount: 0 });
20: const control = deriveWizardCompletionControl({ activeStep: 'review', ready: true, completed: true, blockerCount: 0 });
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardCompletionModel.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: export type WizardCompletionControlInput = {
9: export type WizardCompletionControl = {
17: export function deriveWizardCompletionControl(input: WizardCompletionControlInput): WizardCompletionControl {
22: return { label: '完成建谱', disabled: true, hidden: true, completed: true, reason: '本次建谱已完成。' };
26: label: '完成建谱',
30: reason: input.reason || '正在检查建谱完成条件。'
35: label: '完成建谱',
42: return { label: '完成建谱', disabled: false, hidden: false, completed: false, reason: '' };
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardDependencies.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: import { dependencyImpactText, planWizardDependencyChange } from '../../../../.wizard-dependency-test/features/mvp1/domain/wizardDependencies.js';
16: const plan = planWizardDependencyChange(complete, 'clanId', 'c2');
25: const plan = planWizardDependencyChange(complete, 'branchId', 'b2');
31: const plan = planWizardDependencyChange(complete, 'generationSchemeId', 'g2');
36: const plan = planWizardDependencyChange(complete, 'personId', 'p2');
41: const plan = planWizardDependencyChange(complete, 'relationshipId', 'r2');
47: const plan = planWizardDependencyChange(empty, 'clanId', 'c1');
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardDependencies.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: import type { Mvp1StepKey } from './wizardStepState';
3: export type WizardSelectionField =
11: export type WizardSelections = Record<WizardSelectionField | 'reviewTaskId', string>;
13: export type WizardDependencyPlan = {
14: changedField: WizardSelectionField;
17: clearedFields: Array<keyof WizardSelections>;
18: patch: Partial<WizardSelections>;
22: const fieldStep: Record<WizardSelectionField, Mvp1StepKey> = {
31: const dependencyFields: Record<WizardSelectionField, Array<keyof WizardSelections>> = {
40: const fieldLabel: Record<keyof WizardSelections, string> = {
50: export const wizardSelectionFields: WizardSelectionField[] = [
59: export function planWizardDependencyChange(
60: current: WizardSelections,
61: changedField: WizardSelectionField,
63: ): WizardDependencyPlan {
65: const patch: Partial<WizardSelections> = { [changedField]: nextValue };
70: affectedSteps: clearedFields.map(field => field === 'reviewTaskId' ? 'review' : fieldStep[field as WizardSelectionField]),
77: export function dependencyImpactText(plan: WizardDependencyPlan) {
82: return fieldLabel[step === 'review' ? 'reviewTaskId' : `${step}Id` as keyof WizardSelections] || step;
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardFormValidation.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
4: mapWizardServerFieldErrors,
5: validateWizardStep,
6: wizardFieldName
7: } from '../../../../.wizard-form-test/features/mvp1/domain/wizardFormValidation.js';
10: assert.deepEqual(validateWizardStep('clan', { clanName: '', surname: '' }), {
17: const errors = validateWizardStep('person', {
30: const errors = validateWizardStep('person', {
44: const errors = validateWizardStep('relationship', {
54: const errors = validateWizardStep('relationship', {
64: assert.equal(wizardFieldName('人物姓名'), '人物姓名');
65: assert.equal(wizardFieldName('姓名 *'), 'personName');
66: assert.equal(wizardFieldName('逝世日期'), 'deathDate');
70: assert.deepEqual(mapWizardServerFieldErrors({ '姓名': '姓名已存在', deathDate: '日期冲突' }), {
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardFormValidation.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: import type { Mvp1StepKey } from './wizardStepState';
3: export type WizardFieldValues = Record<string, string | boolean | undefined>;
4: export type WizardFieldErrors = Record<string, string>;
6: export const WIZARD_FIELD_ALIASES: Record<string, string> = {
42: export function wizardFieldName(label: string) {
44: return WIZARD_FIELD_ALIASES[normalized] || normalized;
47: function valueOf(values: WizardFieldValues, semanticName: string) {
49: const label = Object.entries(WIZARD_FIELD_ALIASES).find(([, name]) => name === semanticName)?.[0];
64: export function validateWizardStep(step: Mvp1StepKey, values: WizardFieldValues): WizardFieldErrors {
65: const errors: WizardFieldErrors = {};
94: export function mapWizardServerFieldErrors(errors: WizardFieldErrors | undefined) {
95: const mapped: WizardFieldErrors = {};
97: mapped[wizardFieldName(field)] = message;
102: export function firstWizardFieldError(errors: WizardFieldErrors) {
107: export function mergeWizardFieldErrors(...groups: Array<WizardFieldErrors | undefined>) {
108: return Object.assign({}, ...groups.filter(Boolean).map(mapWizardServerFieldErrors));
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardQueryResultStructure.test.mjs`

- Card: 1
- Table: 0
- QueryResultCard: 1
- 查询结果文本: 0

```text
14: test('wizard ResultListCard renders one query result card with a direct table and no nested card', () => {
16: assert.match(source, /<QueryResultCard[\s\S]*<Table<RecordType>/);
17: assert.doesNotMatch(source, /<Card\b/);
21: test('all active wizard nodes use the shared strict two-layer result implementation', () => {
33: assert.doesNotMatch(source, /pagedLinks\.rows\.map\([\s\S]*?<Card/);
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardResultListModel.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: import { pageWizardResults, retainWizardResultsAfterRefreshFailure, wizardBatchToolbarVisible, wizardMobileListMode, wizardSelectionLabel } from '../../../../.wizard-result-list-test/features/mvp1/domain/wizardResultListModel.js';
6: const result = pageWizardResults(Array.from({ length: 23 }, (_, i) => i + 1), 2);
13: assert.equal(wizardBatchToolbarVisible(0), false);
14: assert.equal(wizardBatchToolbarVisible(2), true);
18: const state = retainWizardResultsAfterRefreshFailure([{ id: 1 }], new Error('网络异常'));
25: assert.equal(wizardSelectionLabel('张三', false), '选择张三');
26: assert.equal(wizardSelectionLabel('张三', true), '张三，已选择');
30: assert.equal(wizardMobileListMode(375), 'scroll');
31: assert.equal(wizardMobileListMode(1024), 'table');
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardResultListModel.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: export const WIZARD_RESULT_PAGE_SIZE = 10;
3: export type WizardResultListState<T> = {
9: export function pageWizardResults<T>(items: T[], page: number, pageSize = WIZARD_RESULT_PAGE_SIZE) {
16: export function wizardBatchToolbarVisible(selectedCount: number) {
20: export function retainWizardResultsAfterRefreshFailure<T>(previous: T[], error: unknown): WizardResultListState<T> {
28: export function wizardSelectionLabel(name: string, selected: boolean) {
32: export function wizardMobileListMode(width: number) {
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardStepState.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
5: deriveWizardStepStates,
6: emptyWizardStateSnapshot,
7: getWizardStepGate
8: } from '../../../../.wizard-state-test/features/mvp1/domain/wizardStepState.js';
14: ...emptyWizardStateSnapshot(),
39: const steps = deriveWizardStepStates(completedSnapshot());
43: assert.equal(getWizardStepGate(steps, 'review').allowed, true);
47: const snapshot = emptyWizardStateSnapshot();
50: const steps = deriveWizardStepStates(snapshot);
56: assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
60: const snapshot = emptyWizardStateSnapshot();
67: const steps = deriveWizardStepStates(snapshot);
71: assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
80: const steps = deriveWizardStepStates(snapshot);
82: assert.equal(getWizardStepGate(steps, 'person').allowed, true);
84: assert.equal(getWizardStepGate(steps, 'relationship').allowed, true);
92: const steps = deriveWizardStepStates(snapshot);
95: assert.equal(getWizardStepGate(steps, 'source').allowed, true);
96: assert.equal(getWizardStepGate(steps, 'branch').allowed, true);
104: const steps = deriveWizardStepStates(snapshot);
108: assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
120: const steps = deriveWizardStepStates(snapshot);
127: const steps = deriveWizardStepStates(emptyWizardStateSnapshot());
128: assert.equal(getWizardStepGate(steps, 'branch').allowed, true);
129: assert.equal(getWizardStepGate(steps, 'generation').allowed, true);
130: assert.equal(getWizardStepGate(steps, 'person').allowed, true);
131: assert.equal(getWizardStepGate(steps, 'relationship').allowed, true);
132: assert.equal(getWizardStepGate(steps, 'source').allowed, true);
133: assert.equal(getWizardStepGate(steps, 'review').allowed, false);
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardStepState.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
5: export type WizardBusinessState = 'waiting' | 'editing' | 'completed' | 'reviewing' | 'rejected' | 'invalid' | 'error';
7: export type WizardEntity = StatusLike & {
12: export type WizardTask = StatusLike & {
18: export type WizardStateErrors = Partial<Record<Mvp1StepKey, string>>;
20: export type WizardStateSnapshot = {
26: clans: WizardEntity[];
27: branches: WizardEntity[];
28: schemes: WizardEntity[];
29: persons: WizardEntity[];
30: relationships: WizardEntity[];
31: sources: WizardEntity[];
32: tasks: WizardTask[];
39: errors: WizardStateErrors;
42: export type WizardStepDecision = {
44: state: WizardBusinessState;
53: export type WizardStepGate = {
62: export const WIZARD_STEP_KEYS: Mvp1StepKey[] = ['clan', 'branch', 'generation', 'person', 'relationship', 'source', 'review'];
64: export const WIZARD_STEP_TITLES: Record<Mvp1StepKey, string> = {
74: const STATE_LABELS: Record<WizardBusinessState, string> = {
87: export function emptyWizardStateSnapshot(): WizardStateSnapshot {
97: function findById(rows: WizardEntity[], id: string) { return id ? rows.find(row => idOf(row.id) === id) : undefined; }
100: function taskMatches(task: WizardTask, targetType: string, targetId?: string) {
104: function hasPendingTask(tasks: WizardTask[], targetType: string, targetId?: string) { return tasks.some(task => taskMatches(task, targetType, targetId)); }
106: function decision(key: Mvp1StepKey, state: WizardBusinessState, reason: string, action: string, options?: { stateLabel?: string; blockingStep?: Mvp1StepKey; canEnter?: boolean }): WizardStepDecision {
110: function waitingDecision(key: Mvp1StepKey, prerequisite: WizardStepDecision) {
111: const prerequisiteTitle = WIZARD_STEP_TITLES[prerequisite.key];
119: function entityDecision(input: { key: Mvp1StepKey; rows: WizardEntity[]; selectedId: string; pendingTargetType: string; tasks: WizardTask[]; noun: string; completedReason: string; editingReason: string; editingAction: string }): WizardStepDecision {
133: export function deriveWizardStepStates(snapshot: WizardStateSnapshot): WizardStepDecision[] {
134: const decisions: WizardStepDecision[] = [];
139: let generation: WizardStepDecision;
154: let relationship: WizardStepDecision;
156: else if (snapshot.skipped.relationship) relationship = decision('relationship','completed','已确认本次建谱暂不维护人物关系。','可继续维护来源',{stateLabel:'已跳过'});
169: let source: WizardStepDecision;
171: else if (snapshot.skipped.source) source = decision('source','completed','已确认本次建谱暂不绑定来源。','可进入审核中心',{stateLabel:'已跳过'});
190: export function getWizardStepGate(steps: WizardStepDecision[], target: Mvp1StepKey): WizardStepGate {
193: return { allowed: false, target, title: `暂不能进入${WIZARD_STEP_TITLES[target]}步骤`, reason: targetStep.reason, action: targetStep.action, blockingStep: targetStep.blockingStep };
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardSummaryModel.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: import { buildWizardSummary } from '../../../../.wizard-summary-test/features/mvp1/domain/wizardSummaryModel.js';
18: const result = buildWizardSummary({ ...completeInput, persons: [{ dataStatus: 'draft' }], relationships: [] });
25: const result = buildWizardSummary(completeInput);
31: const result = buildWizardSummary({ ...completeInput, sources: [{ dataStatus: 'pending_review' }] });
37: const result = buildWizardSummary({ ...completeInput, errors: { generation: '字辈查询失败' } });
```

## `frontend/genealogy-web/src/features/mvp1/domain/wizardSummaryModel.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: import type { Mvp1StepKey } from './wizardStepState';
29: export function buildWizardSummary(input: {
```

## `frontend/genealogy-web/src/features/mvp1/services/reviewTaskService.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
27: window.dispatchEvent(new CustomEvent('genealogy:wizard-api-error', {
```

## `frontend/genealogy-web/src/features/mvp1/services/wizardSessionService.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
4: WIZARD_SESSION_STORAGE_KEY,
5: WIZARD_SESSION_VERSION,
6: createLocalWizardSessionStore,
7: createWizardSession,
8: parseWizardSession,
9: readWizardStepFromUrl,
10: writeWizardStepToUrl
11: } from '../../../../.wizard-session-test/features/mvp1/services/wizardSessionService.js';
24: return createWizardSession({
40: const url = new URL('https://example.test/?view=mvp1Wizard&step=person&foo=bar#top');
41: assert.equal(readWizardStepFromUrl(url), 'person');
42: assert.equal(writeWizardStepToUrl(url, 'source'), '/?view=mvp1Wizard&step=source&foo=bar#top');
46: assert.equal(readWizardStepFromUrl(new URL('https://example.test/?step=unknown')), undefined);
50: const parsed = parseWizardSession(JSON.stringify(session()));
51: assert.equal(parsed?.version, WIZARD_SESSION_VERSION);
59: assert.equal(parseWizardSession('{bad'), undefined);
60: assert.equal(parseWizardSession(JSON.stringify({ ...session(), version: 99 })), undefined);
64: const storage = memoryStorage({ [WIZARD_SESSION_STORAGE_KEY]: JSON.stringify({ version: 99 }) });
65: const store = createLocalWizardSessionStore(storage);
67: assert.equal(storage.value(WIZARD_SESSION_STORAGE_KEY), undefined);
```

## `frontend/genealogy-web/src/features/mvp1/services/wizardSessionService.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: import type { Mvp1StepKey } from '../domain/wizardStepState';
3: export const WIZARD_SESSION_VERSION = 1;
4: export const WIZARD_SESSION_STORAGE_KEY = 'genealogy.mvp1Wizard.session';
6: export type WizardControlDraft = string | boolean;
7: export type WizardStepDraft = Record<string, WizardControlDraft>;
9: export type WizardSession = {
25: drafts: Partial<Record<Mvp1StepKey, WizardStepDraft>>;
30: export function isWizardStepKey(value: unknown): value is Mvp1StepKey {
34: export function readWizardStepFromUrl(url: URL): Mvp1StepKey | undefined {
36: return isWizardStepKey(value) ? value : undefined;
39: export function writeWizardStepToUrl(url: URL, step: Mvp1StepKey): string {
41: next.searchParams.set('view', 'mvp1Wizard');
50: function validDrafts(value: unknown): WizardSession['drafts'] {
52: const drafts: WizardSession['drafts'] = {};
56: const fields: WizardStepDraft = {};
65: export function parseWizardSession(raw: string | null): WizardSession | undefined {
69: if (value.version !== WIZARD_SESSION_VERSION || !isWizardStepKey(value.activeStep)) return undefined;
71: version: WIZARD_SESSION_VERSION,
93: export interface WizardSessionStore {
94: load(): WizardSession | undefined;
95: save(session: WizardSession): void;
99: export function createLocalWizardSessionStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage): WizardSessionStore {
102: const session = parseWizardSession(storage.getItem(WIZARD_SESSION_STORAGE_KEY));
103: if (!session && storage.getItem(WIZARD_SESSION_STORAGE_KEY)) storage.removeItem(WIZARD_SESSION_STORAGE_KEY);
107: storage.setItem(WIZARD_SESSION_STORAGE_KEY, JSON.stringify(session));
110: storage.removeItem(WIZARD_SESSION_STORAGE_KEY);
122: const explicit = control.getAttribute('data-wizard-draft-key') || control.getAttribute('name') || control.getAttribute('aria-label');
126: export function captureWizardStepDraft(root: ParentNode): WizardStepDraft {
127: const draft: WizardStepDraft = {};
137: function setNativeValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: WizardControlDraft) {
154: export function restoreWizardStepDraft(root: ParentNode, draft: WizardStepDraft | undefined) {
166: export function createWizardSession(input: Omit<WizardSession, 'version' | 'savedAt'>, now = new Date()): WizardSession {
169: version: WIZARD_SESSION_VERSION,
```

## `frontend/genealogy-web/src/features/mvp1/services/wizardStepStateService.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
4: emptyWizardStateSnapshot,
5: type WizardEntity,
6: type WizardStateSnapshot,
7: type WizardTask
8: } from '../domain/wizardStepState';
10: export type WizardStateLoadInput = {
44: export async function loadWizardStateSnapshot(input: WizardStateLoadInput): Promise<WizardStateSnapshot> {
45: const snapshot = emptyWizardStateSnapshot();
53: const clans = await loadRows<WizardEntity>('/clans', '加载宗族失败');
60: loadRows<WizardEntity>(`/clans/${input.clanId}/branches`, '加载支派失败'),
61: loadRows<WizardEntity>(`/clans/${input.clanId}/generation-schemes`, '加载字辈方案失败'),
62: loadRows<WizardEntity>(`/clans/${input.clanId}/persons`, '加载人物失败'),
63: loadRows<WizardEntity>(`/clans/${input.clanId}/sources`, '加载来源失败'),
64: loadRows<WizardTask>(`/clans/${input.clanId}/review-tasks/pending`, '加载审核任务失败')
83: const items = await loadRows<WizardEntity>(`/generation-schemes/${schemeId}/items`, '加载字辈明细失败');
93: const relationships = await loadRows<WizardEntity>(`/persons/${input.personId}/relationships`, '加载人物关系失败');
99: const links = await loadRows<WizardEntity>(`/source-bindings/sources/${input.sourceId}`, '加载来源绑定失败');
```

## `frontend/genealogy-web/src/features/mvp1/services/wizardSummaryService.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
2: import { buildWizardSummary, type SummarySectionKey } from '../domain/wizardSummaryModel';
13: export async function loadWizardSummary(clanId: string, selectedPersonId?: string) {
50: return buildWizardSummary({
```

## `frontend/genealogy-web/src/features/mvp1/steps/branch/BranchStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
212: <div className="wizard-form-grid">
```

## `frontend/genealogy-web/src/features/mvp1/steps/clan/ClanStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
174: {String(clan.id || '') === workspace.clanId ? '继续建谱' : '选择并继续'}
192: <Panel title="创建宗族" description="宗族作为建谱容器暂不进入审核流；创建后继续维护支派。">
193: <div className="wizard-form-grid">
```

## `frontend/genealogy-web/src/features/mvp1/steps/generation/GenerationStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
313: <section className="wizard-generation-section">
315: <div className="wizard-form-grid wizard-generation-scheme-grid">
400: <div className="wizard-generation-detail-form wizard-generation-word-grid">
401: <label className="wizard-inline-form-field">
405: <label className="wizard-inline-form-field">
409: <label className="wizard-inline-form-field wizard-generation-modal-action">
```

## `frontend/genealogy-web/src/features/mvp1/steps/person/PersonStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
442: <Card size="small" title="适用范围" className="person-step-form-card">
443: <div className="wizard-form-grid">
481: <Card size="small" title="基础信息" className="person-step-form-card">
482: <div className="wizard-form-grid">
504: <Card size="small" title="世系信息" className="person-step-form-card">
505: <div className="wizard-form-grid">
523: <Card size="small" title="生卒与居住" className="person-step-form-card">
524: <div className="wizard-form-grid">
552: <Card size="small" title="传记与隐私" className="person-step-form-card">
553: <div className="wizard-form-grid">
```

## `frontend/genealogy-web/src/features/mvp1/steps/person/PersonStepDraftDelete.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
9: test('wizard person list exposes the shared draft delete action', () => {
17: test('wizard person delete uses the existing person DELETE endpoint', () => {
```

## `frontend/genealogy-web/src/features/mvp1/steps/relationship/RelationshipStepDraftDelete.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
7: const wizardEnhancementStyles = readFileSync(new URL('../../../../mvp1-wizard-enhancements.css', import.meta.url), 'utf8');
9: test('wizard relationship list exposes the shared draft delete action', () => {
17: test('wizard relationship delete uses the existing relationship DELETE endpoint', () => {
33: test('relationship save actions are right aligned within the wizard step', () => {
35: wizardEnhancementStyles,
```

## `frontend/genealogy-web/src/features/mvp1/steps/review/ReviewProgressStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
196: <div className="wizard-form-grid">
228: <Table<ReviewCandidate>
256: <Table<ReviewTaskLike>
```

## `frontend/genealogy-web/src/features/mvp1/steps/review/WizardSummaryStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
5: import type { Mvp1StepKey } from '../../domain/wizardStepState';
6: import type { SummarySection } from '../../domain/wizardSummaryModel';
7: import { loadWizardSummary } from '../../services/wizardSummaryService';
8: import { useWizardCompletion } from '../../WizardCompletionContext';
9: import './wizard-summary-step.css';
16: type SummaryData = Awaited<ReturnType<typeof loadWizardSummary>>;
36: <Card className="wizard-summary-section" size="small" title={section.title} extra={<Button type="link" onClick={() => onRetry()}>刷新</Button>}>
42: <Space size={[6, 6]} wrap className="wizard-summary-statuses">
50: export function WizardSummaryStep({ notify, onStepChange }: Props) {
52: const completion = useWizardCompletion();
62: setLoadError('请先选择宗族，再生成建谱结果汇总。');
63: completion.reportStatus({ ready: false, completed: false, blockerCount: 1, reason: '请先选择宗族，再完成建谱。' });
68: completion.reportStatus({ ready: false, completed: false, blockerCount: 0, reason: '正在检查建谱完成条件。' });
70: const nextSummary = await loadWizardSummary(workspace.clanId, workspace.personId);
79: const message = (error as Error).message || '加载建谱汇总失败';
94: completion.reportStatus({ ready: true, completed: true, blockerCount: 0, reason: '本次建谱已完成。' });
95: notify?.({ message: '本次建谱已完成' });
102: title="建谱完成"
114: <Panel title="建谱结果汇总" description="集中查看各步骤完成情况、审核状态和阻塞项；审批操作请进入独立审核中心。">
115: <div className="wizard-summary-header-actions">
120: {loading && !summary ? <div className="wizard-summary-loading"><Spin /><Typography.Text type="secondary">正在汇总建谱结果…</Typography.Text></div> : null}
123: <div className="wizard-summary-grid">
127: <Card className="wizard-summary-blockers" title={`完成检查（${summary.blockers.length} 项阻塞）`}>
141: ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有阻塞项，可以完成建谱" />}
144: <Card className="wizard-summary-completion" size="small">
146: <Typography.Title level={4}>{summary.complete ? '所有完成条件均已满足' : '建谱尚未完成'}</Typography.Title>
149: ? '请使用页面底部固定操作栏中的“完成建谱”确认完成。'
```

## `frontend/genealogy-web/src/features/mvp1/steps/review/wizard-summary-step.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: .wizard-summary-header-actions { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px; }
2: .wizard-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
3: .wizard-summary-statuses { margin-top: 12px; }
4: .wizard-summary-blockers { margin-bottom: 16px; }
5: .wizard-summary-completion .ant-card-body { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
6: .wizard-summary-completion .ant-typography { margin-bottom: 4px; }
7: .wizard-summary-loading { min-height: 180px; display: flex; align-items: center; justify-content: center; gap: 12px; }
9: .wizard-summary-grid { grid-template-columns: 1fr; }
10: .wizard-summary-header-actions { justify-content: stretch; }
11: .wizard-summary-header-actions .ant-btn { flex: 1; min-height: 44px; }
12: .wizard-summary-completion .ant-card-body { align-items: stretch; flex-direction: column; }
13: .wizard-summary-completion .ant-btn { width: 100%; min-height: 44px; }
14: .wizard-summary-blockers .ant-alert-action { margin-inline-start: 0; padding-top: 10px; }
15: .wizard-summary-blockers .ant-btn { min-height: 44px; }
```

## `frontend/genealogy-web/src/features/mvp1/steps/source/SourceStageStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
164: <Card title={<Space><span>阶段一：创建来源</span><Tag color="processing">创建与审核</Tag></Space>}>
165: <div className="wizard-form-grid">
173: <Card title={<Space><span>阶段二：选择正式来源并绑定对象</span><Tag color={stage.bindingOpen ? 'success' : 'default'}>{stage.bindingOpen ? '已开放' : '待选择'}</Tag></Space>}>
174: <div className="wizard-form-grid source-stage-bind-grid">
179: <div className="wizard-form-grid source-stage-bind-grid">
```

## `frontend/genealogy-web/src/features/mvp1/steps/source/SourceStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
462: <div className="wizard-form-grid">
573: <Table<SourceLike>
```

## `frontend/genealogy-web/src/features/mvp1/steps/tree/TreeStep.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
115: <div className="wizard-form-grid">
152: <Table<TreeNodeLike>
166: <Table<TreeEdgeLike>
```

## `frontend/genealogy-web/src/features/mvp1/wizard-result-list.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: .wizard-result-list-boundary .step-draft-review-header .ant-btn-primary:disabled,
2: .wizard-result-list-boundary .branch-step-list-header .ant-btn-primary:disabled,
3: .wizard-result-list-boundary .wizard-inline-list-header .ant-btn-primary:disabled {
8: .wizard-result-list-boundary button {
```

## `frontend/genealogy-web/src/features/mvp1/wizard-step-state.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: .wizard-step-title {
9: .wizard-step-title .ant-tag {
16: .wizard-progress-summary {
20: .wizard-progress-summary__heading {
28: .wizard-progress-summary__heading .ant-tag {
32: .wizard-progress-summary__detail {
39: .wizard-gate-alert .ant-alert-description {
43: .wizard-ant-steps .ant-steps-item-description {
49: .wizard-validation-boundary {
54: .wizard-step-local-error {
58: [data-wizard-field-error="true"] input,
59: [data-wizard-field-error="true"] textarea,
60: [data-wizard-field-error="true"] select,
61: [data-wizard-field-error="true"] .ant-select-selector,
62: [data-wizard-field-error="true"] .ant-picker {
67: .wizard-field-error-help {
75: .wizard-step-title {
81: .wizard-progress-summary__detail {
86: .wizard-gate-alert .ant-alert-action {
91: .wizard-gate-alert .ant-btn {
```

## `frontend/genealogy-web/src/features/persons/PersonArchiveSearchPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
21: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
249: url.searchParams.set('view', 'mvp1Wizard');
289: <Card className="person-archive-query-card" title="人物档案查询" loading={filterLoading}>
324: <QueryResultCard className="person-archive-result-card" extra={resultActions} total={total}>
331: <div className="person-archive-desktop-list"><Table<any> size="small" bordered rowKey={(row, index) => String(personId(row) || index)} dataSource={rows} pagination={hasQueried ? { current: currentPage, pageSize: form.pageSize, total, showSizeChanger: true, pageSizeOptions: PERSON_PAGE_SIZE_OPTIONS.m
336: <div className="person-archive-mobile-list" aria-label="人物档案卡片列表">{querying ? <Card loading /> : rows.length ? rows.map(row => <Card key={String(personId(row))} className="person-archive-mobile-card" title={<Button id={focusId(row, 'name')} type="link" className="person-archive-mobile-name" onClick=
339: </QueryResultCard>
```

## `frontend/genealogy-web/src/features/persons/PersonDetailPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
114: if (loading) return <div className="person-detail-page"><EntityPageBackButton label="返回人物档案" onBack={onBack} /><Card><Skeleton active paragraph={{ rows: 12 }} /></Card></div>;
115: if (pageError) return <div className="person-detail-page"><Card><Result status={pageError.status} title={pageError.title} subTitle={pageError.description} extra={<Space wrap><EntityPageBackButton label="返回人物档案" onBack={onBack} />{pageError.status === 500 ? <Button type="primary" onClick={() => void 
131: <Card className="person-detail-summary-card"><div className="person-detail-completeness"><Typography.Text type="secondary">资料完整度</Typography.Text><Progress percent={completeness} /></div><Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small"><Descriptions.Item label="支派">{branchText(person)}</D
132: <Card className="person-detail-content-card"><Tabs activeKey={activeTab} onChange={changeTab} items={[
133: { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="middle" className="person-detail-section-stack"><Card size="small" title="身份与世系"><Descriptions column={{ xs: 1, md: 2 }} bordered size="small"><Descriptions.Item label="姓名">{personName(person)}</Descriptions.Item><Description
134: { key: 'events', label: '生平事迹', children: <Space direction="vertical" size="middle" className="person-detail-section-stack"><Card size="small" title="关键事件"><SectionFrame state={events} emptyText="暂无关键事件记录" errorTitle="事件加载失败" onRetry={() => void loadEvents()}><Timeline items={eventItems} /></Section
135: { key: 'relationships', label: '亲属关系', children: <SectionFrame state={relationships} emptyText="暂无亲属关系" errorTitle="关系加载失败" onRetry={() => void loadRelationships()}><Table<any> size="small" bordered rowKey={(row, index) => String(row.id || index)} dataSource={relationships.data} pagination={false} c
136: { key: 'sources', label: '来源证据', children: <SectionFrame state={sources} emptyText="暂无来源证据" errorTitle="来源加载失败" onRetry={() => void loadSources()}><Table<any> size="small" bordered rowKey={(row, index) => String(row.id || row.sourceId || index)} dataSource={sources.data} pagination={false} columns={
137: { key: 'tracking', label: '审核追踪', children: tracking.status === 'loading' && !tracking.data ? <Skeleton active paragraph={{ rows: 5 }} /> : tracking.status === 'error' ? <Alert type="error" showIcon message="审核追踪加载失败" description={tracking.error} action={<Button onClick={() => void loadTracking(clan
```

## `frontend/genealogy-web/src/features/persons/PersonEditPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
348: if (loading) return <div className="person-edit-page"><EntityPageBackButton label={backLabel} onBack={leavePage} disabled={busy} /><Card className="person-edit-loading"><Space direction="vertical" align="center" size={16}><Spin size="large" /><Typography.Text type="secondary">正在加载人物档案…</Typography.T
351: return <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError || '人物档案不存在'}><Space><EntityPageBackButton label={backLabel} onBack={leavePage} /><Button type="primary" onClick={() => void loadPerson()}>重新加载</Button></Space></Empty></Card>;
391: <Card title="基本身份"><div className="person-edit-fields">
399: <Card title="世系与支派"><div className="person-edit-fields">
410: <Card title="生卒与地点"><div className="person-edit-fields">
439: <Card title="生平与墓志"><div className="person-edit-fields">
445: <Card title="治理与展示"><div className="person-edit-fields">
```

## `frontend/genealogy-web/src/features/reviews/ReviewCenterPageContent.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
17: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
626: <Card size="small" style={{ width: '100%' }}>
652: <Table<ReviewTaskListItemResponse>
685: <Card title="审核中心">
698: <QueryResultCard
723: </QueryResultCard>
748: <div><Typography.Title level={5}>字段变更</Typography.Title>{reviewDiff?.fields?.length ? <Table size="small" pagination={false} rowKey={row => `${row.fieldName}-${row.changeType}`} dataSource={reviewDiff.fields} columns={[{ title: '字段', dataIndex: 'fieldName', width: 140 }, { title: '变更前', dataIndex: '
```

## `frontend/genealogy-web/src/features/reviews/ReviewDiffPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
61: <div className="wizard-form-grid">
```

## `frontend/genealogy-web/src/features/sources/SourceDraftDeleteAction.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
101: <Card size="small" title="草稿来源操作" style={{ marginBottom: 12 }}>
```

## `frontend/genealogy-web/src/features/sources/SourceLibraryFocusBridge.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
83: <Card size="small" title="新增资料 / 绑定来源引导">
```

## `frontend/genealogy-web/src/features/sources/SourceLibraryPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
766: if (detailLoading) return <Card><Space direction="vertical" align="center" style={{ width: '100%', padding: 48 }}><Spin size="large" /><Text type="secondary">正在加载来源资料…</Text></Space></Card>;
774: <Card>
788: <Card>
802: <Card>
846: : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未录入来源资料，可先在资料库创建来源草稿，也可通过建谱向导完成首条主流程。"><Space><Button type="primary" icon={<PlusOutlined />} disabled={!clanId} onClick={openCreateSource}>新增来源</Button><Button onClick={() => window.location.assign('/?view=wizard')}>前往建谱向导</Button></Space><
851: <Card className="source-library-query-card" title="来源资料查询">
864: <Card title={`来源资料（共 ${sourceTotal} 条）`} extra={<Space><Tooltip title={!clanId ? '请先选择宗族' : '新增来源草稿'}><span><Button type="primary" icon={<PlusOutlined />} disabled={!clanId} onClick={openCreateSource}>新增来源</Button></span></Tooltip><Tooltip title="刷新"><Button icon={<ReloadOutlined />} aria-label="刷新来
867: <Table<SourceRecord>
965: return <Table<SourceBindingSummary> size="small" rowKey={(row, index) => String(row.id || index)} dataSource={rows} loading={loading} pagination={{ current: pageNo, pageSize, total, showSizeChanger: false, showTotal: value => `共 ${value} 条引用`, onChange: onPageChange }} scroll={{ x: 980 }} locale={{ 
980: return <Table<SourceAttachmentRecord>
```

## `frontend/genealogy-web/src/features/sources/SourceLibraryQueryPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 2

```text
73: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
831: if (detailLoading) return <Card><Space direction="vertical" align="center" className="source-library-loading"><Spin size="large" /><Text type="secondary">正在加载来源资料…</Text></Space></Card>;
839: <Card>
853: <Card>
867: <Card>
919: <Tooltip title="刷新查询结果"><Button icon={<ReloadOutlined />} aria-label="刷新查询结果" loading={loading} onClick={() => void loadSources(search, true)} /></Tooltip>
936: <Card className="source-library-query-card" title="来源资料查询">
971: <QueryResultCard className="source-library-result-card" extra={resultActions} total={sourceTotal}>
990: <Card size="small" className="source-library-mobile-card">
1010: <Table<SourceRecord>
1032: </QueryResultCard>
1097: return <Table<SourceBindingSummary> size="small" rowKey={(row, index) => String(row.id || index)} dataSource={rows} loading={loading} pagination={{ current: pageNo, pageSize, total, showSizeChanger: false, showTotal: value => `共 ${value} 条引用`, onChange: onPageChange }} scroll={{ x: 980 }} locale={{ 
1112: return <Table<SourceAttachmentRecord>
```

## `frontend/genealogy-web/src/features/sources/source-library-query-page.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 1

```text
103: .source-library-query-page button[aria-label="刷新查询结果"],
```

## `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
76: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
808: <Card className="lineage-double-card-query" title="图谱查询" size="small">
879: <QueryResultCard className="lineage-double-card-result" size="small" total={activeGraph?.nodes.length || 0} totalSuffix="个人物">
899: </QueryResultCard>
```

## `frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 1

```text
18: import { QueryResultCard } from '../../shared/ui/QueryResultCards';
23: type WorkbenchNavigateKey = 'reviewCenter' | 'personArchive' | 'sourceLibrary' | 'treeProduct' | 'mvp1Wizard';
84: if (type === 'reviewCenter' || type === 'personArchive' || type === 'sourceLibrary' || type === 'treeProduct' || type === 'mvp1Wizard') return type;
296: if (currentClanId && onNavigate) onNavigate('mvp1Wizard');
407: <Card title="修谱工作台">
443: <QueryResultCard className="workbench-result-card" extra={resultActions} total={total}>
448: {screens.md ? <Table<WorkbenchTask>
470: {!taskLoading && tasks.map(task => <Card key={task.key} role="button" tabIndex={0} aria-label={`打开任务：${taskTitle(task)}`} onClick={() => openTask(task)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTask(task); } }} style={{ borderColor: selected
483: </QueryResultCard>
488: <Card size="small" title="任务信息"><Descriptions column={1} size="small"><Descriptions.Item label="谱书名称">{display(selectedTask.bookName, bookLabel(activeClan))}</Descriptions.Item><Descriptions.Item label="创建人">{display(selectedTask.creatorName, '-')}</Descriptions.Item><Descriptions.Item label="创建时间">
489: <Card size="small" title="处理记录" extra={<Button type="link" size="small" loading={historyLoading} onClick={() => void loadHistory(selectedTask.key)}>刷新</Button>}>
499: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Alert type="warning" showIcon message={`将处理任务：${taskTitle(selectedTask)}`} description="确认后将更新任务状态并刷新查询结果；若任务已被他人处理，系统会提示冲突并加载最新状态。" /><Space direction="vertical" size={4} style={{ width: '100%' }}><Typography.Text>处理说明（可选）</Typogr
505: <Table size="small" rowKey="key" pagination={false} dataSource={templateRows} columns={[{ title: '模板名称', dataIndex: 'name', width: 160 }, { title: '任务类型', dataIndex: 'type', width: 150 }, { title: '默认优先级', dataIndex: 'priority', width: 110, render: value => <Tag>{value}</Tag> }, { title: '生成规则', dat
```

## `frontend/genealogy-web/src/guidance-cleanup.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
31: /* Wizard flow rules are available from Panel help; lists keep only actionable states. */
36: .wizard-generation-inline-list > .ant-alert,
37: .wizard-generation-word-grid + .wizard-inline-list-header + .ant-typography-paragraph,
```

## `frontend/genealogy-web/src/home-dashboard-overrides.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
5: * Historical wizard-only overrides were moved to mvp1-wizard-enhancements.css.
6: * Keep this file empty to avoid reintroducing global home or wizard overrides.
```

## `frontend/genealogy-web/src/main.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
9: import './mvp1-wizard.css';
10: import './mvp1-wizard-simplified.css';
11: import './mvp1-wizard-enhancements.css';
```

## `frontend/genealogy-web/src/module-title-dedup.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 6

```text
136: content: '查询结果';
186: content: '查询结果';
221: content: '查询结果';
247: content: '查询结果';
265: content: '查询结果';
289: content: '查询结果';
```

## `frontend/genealogy-web/src/mvp1-person-step.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: /* MVP1 wizard person step layout.
3: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field {
8: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(1) {
13: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(2) {
18: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(4) {
23: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(8) {
28: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(3) {
33: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(9) {
38: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(10) {
43: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(5) {
47: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(6) {
51: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(7) {
56: .mvp1-wizard-page:has(.wizard-steps > button:nth-child(4).active) .panel:has(select option[value="normal"]):has(select option[value="adopted_in"]) .wizard-form-grid > .antd-field:nth-child(n+11) {
```

## `frontend/genealogy-web/src/mvp1-source-step.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
2: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) > .ant-card-body {
8: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) > .ant-card-body::before,
9: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) > .ant-card-body::after {
19: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) > .ant-card-body::before {
24: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) > .ant-card-body::after {
30: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .panel-description {
35: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid,
36: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .actions {
40: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field {
44: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field:nth-child(1) { order: 2; }
45: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field:nth-child(3) { order: 3; }
46: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field:nth-child(4) { order: 4; }
47: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .actions > .ant-space-item:nth-child(1) { order: 4; justify-self: start; margin-top: 2px; }
48: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field:nth-child(2) { order: 6; }
49: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field:nth-child(5) { order: 7; }
50: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .wizard-form-grid > .antd-field:nth-child(6) { order: 8; }
51: .mvp1-wizard .panel:has(input[placeholder="例如：民国二十年族谱"]) .actions > .ant-space-item:nth-child(2) { order: 9; justify-self: start; margin-top: 2px; }
```

## `frontend/genealogy-web/src/mvp1-tree-step.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: /* MVP1 wizard lineage result tables. */
2: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .antd-table-wrap {
12: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .antd-table-wrap::before {
22: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .antd-table-wrap:nth-of-type(1)::before {
26: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .antd-table-wrap:nth-of-type(2)::before {
30: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .antd-table-wrap .table-hint {
34: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table {
38: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table table {
44: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-container,
45: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-content,
46: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead,
47: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead > tr {
51: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-cell {
60: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead > tr,
61: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-tbody > tr {
65: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead > tr > th,
66: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-tbody > tr > td {
73: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead > tr > th .ant-table-cell-content,
74: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead > tr > th .ant-table-column-title {
84: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-tbody > tr > td:last-child,
85: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-table-thead > tr > th:last-child {
90: .mvp1-wizard-page .panel:has(select option[value="family"]):has(select option[value="ancestors"]):has(select option[value="descendants"]) .ant-empty {
```

## `frontend/genealogy-web/src/mvp1-wizard-enhancements.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: /* MVP 建谱向导：维护字辈步骤增强。 */
2: .wizard-generation-section,
3: .wizard-generation-section h4,
4: .wizard-generation-section label,
5: .wizard-generation-section .ant-form-item-label > label,
6: .wizard-generation-section--items,
7: .wizard-generation-section--items h4,
8: .wizard-generation-section--items label,
9: .wizard-generation-section--items .ant-form-item-label > label {
13: .wizard-generation-section--scheme-enhanced,
14: .wizard-generation-section--items-enhanced {
21: .wizard-generation-section--scheme-enhanced h4,
22: .wizard-generation-section--items-enhanced h4 {
28: .wizard-generation-section--scheme-enhanced .wizard-form-grid,
29: .wizard-generation-section--items-enhanced .wizard-form-grid {
38: .wizard-generation-section--scheme-enhanced .actions,
39: .wizard-generation-section--items-enhanced .actions {
50: .wizard-generation-scheme-field--moved {
54: .wizard-relationship-list-enhanced,
55: .wizard-person-list-enhanced {
64: .wizard-generation-items-list-enhanced {
75: .wizard-generation-list-header,
76: .wizard-relationship-list-header,
77: .wizard-person-list-header {
86: .wizard-generation-list-header {
93: .wizard-generation-list-header h4,
94: .wizard-relationship-list-header h4,
95: .wizard-person-list-header h4 {
102: .wizard-generation-list-header span,
103: .wizard-relationship-list-header span,
104: .wizard-person-list-header span {
109: .wizard-generation-list-table-wrap,
110: .wizard-relationship-list-table-wrap,
111: .wizard-person-list-table-wrap {
116: .wizard-generation-list-table,
117: .wizard-relationship-list-table,
118: .wizard-person-list-table {
126: .wizard-generation-list-table th,
127: .wizard-generation-list-table td,
128: .wizard-relationship-list-table th,
129: .wizard-relationship-list-table td,
130: .wizard-person-list-table th,
131: .wizard-person-list-table td {
138: .wizard-generation-list-table th,
139: .wizard-relationship-list-table th,
140: .wizard-person-list-table th {
146: .wizard-generation-list-table td.empty,
147: .wizard-relationship-list-table td.empty,
148: .wizard-person-list-table td.empty {
153: /* MVP 建谱向导：绑定来源步骤增强。 */
154: .wizard-source-panel-enhanced .wizard-source-section {
160: .wizard-source-section-head h4 {
167: .wizard-source-section-head p {
174: .wizard-source-section-grid {
185: .wizard-source-section-grid .field,
186: .wizard-source-section-grid .ant-form-item {
190: .wizard-source-section-actions {
202: .wizard-source-section-actions .ant-space-item {
206: /* MVP 建谱向导：录入人物日期输入增强。 */
207: .wizard-direct-date-input {
211: .wizard-date-input-hint {
219: /* MVP 建谱向导：录入人物教育程度下拉增强。 */
220: .wizard-person-education-origin-input {
224: .wizard-person-education-select {
234: /* MVP 建谱向导：步骤内操作按钮统一右对齐。 */
235: .mvp1-wizard-page .wizard-step-content .relationship-step-panel > .ant-space-vertical > .ant-space-item > .ant-space:has(> .ant-space-item > button),
236: .mvp1-wizard-page .wizard-step-content .actions,
237: .mvp1-wizard-page .wizard-step-content .antd-actions,
238: .mvp1-wizard-page .wizard-step-content .source-stage-actions,
239: .mvp1-wizard-page .wizard-step-content .wizard-source-section-actions {
244: .mvp1-wizard-page .wizard-step-content .source-stage-actions {
248: .mvp1-wizard-page .wizard-step-content .actions .ant-space-item,
249: .mvp1-wizard-page .wizard-step-content .antd-actions .ant-space-item,
250: .mvp1-wizard-page .wizard-step-content .source-stage-actions .ant-space-item,
251: .mvp1-wizard-page .wizard-step-content .wizard-source-section-actions .ant-space-item {
256: .mvp1-wizard-page .wizard-step-content .relationship-step-panel > .ant-space-vertical > .ant-space-item > .ant-space:has(> .ant-space-item > button),
257: .mvp1-wizard-page .wizard-step-content .actions,
258: .mvp1-wizard-page .wizard-step-content .antd-actions,
259: .mvp1-wizard-page .wizard-step-content .source-stage-actions,
260: .mvp1-wizard-page .wizard-step-content .wizard-source-section-actions {
```

## `frontend/genealogy-web/src/mvp1-wizard-simplified.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: /* Genealogy wizard layout: standard page header, progress, content and fixed actions. */
2: .mvp1-wizard-page {
10: .mvp1-wizard-page > * {
14: .wizard-progress-card {
19: .wizard-progress-card .ant-card-body {
24: .wizard-progress-card .wizard-ant-steps {
28: .wizard-progress-card .ant-steps-item-title {
33: .wizard-progress-summary {
43: .wizard-progress-summary .ant-typography:last-child {
47: .wizard-step-content {
51: .wizard-fixed-action-card {
59: .wizard-fixed-action-card .ant-card-body {
63: .wizard-fixed-actions {
70: .wizard-fixed-actions__secondary,
71: .wizard-fixed-actions__primary {
77: .mvp1-wizard-page .antd-field .ant-select .ant-select-selection-search-input {
89: .mvp1-wizard-page .antd-field .ant-select-selection-search {
94: .mvp1-wizard-page .antd-field .ant-select-selection-item,
95: .mvp1-wizard-page .antd-field .ant-select-selection-placeholder {
118: .wizard-inline-list-header {
128: .wizard-inline-list-header h4 {
137: .wizard-inline-list-header {
142: .wizard-inline-list-header h4 {
146: .wizard-branch-list {
152: .wizard-branch-list h4 {
159: .wizard-generation-inline-list {
163: .wizard-generation-section,
172: .wizard-generation-section:first-of-type {
176: .wizard-generation-section h4,
193: .wizard-generation-section .actions {
199: .wizard-generation-scheme-grid,
200: .wizard-generation-word-grid {
204: .wizard-generation-detail-form {
210: .wizard-inline-form-field,
219: .wizard-inline-form-field > span,
224: .wizard-generation-modal-action {
249: .wizard-generation-scheme-grid,
250: .wizard-generation-word-grid {
256: .wizard-progress-card .ant-card-body {
261: .wizard-progress-card .wizard-ant-steps {
265: .wizard-progress-summary {
271: .wizard-progress-summary .ant-typography:last-child {
275: .wizard-fixed-action-card {
279: .wizard-fixed-actions {
285: .wizard-fixed-actions__secondary,
286: .wizard-fixed-actions__primary {
290: .wizard-fixed-actions__secondary .ant-space-item,
291: .wizard-fixed-actions__primary .ant-space-item {
295: .wizard-fixed-actions .ant-btn {
```

## `frontend/genealogy-web/src/mvp1-wizard.css`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
1: .mvp1-wizard { display: grid; gap: 16px; }
3: .wizard-hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 16px; border-radius: 12px; border: 1px solid #f0f0f0; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
4: .wizard-hero span { color: #1677ff; font-weight: 500; font-size: 12px; }
5: .wizard-hero h2 { margin: 4px 0 6px; font-size: 22px; font-weight: 600; }
6: .wizard-hero p { margin: 0; max-width: 820px; color: rgba(0,0,0,.45); line-height: 1.6; }
8: .wizard-layout { display: grid; grid-template-columns: 280px minmax(620px, 1fr); gap: 16px; align-items: start; }
9: .wizard-steps { display: grid; gap: 8px; position: sticky; top: 24px; }
10: .wizard-steps button { display: grid; gap: 4px; border: 1px solid #f0f0f0; background: #fff; color: rgba(0,0,0,.88); text-align: left; padding: 12px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.03); transition: all .2s; }
11: .wizard-steps button.active { border-color: #91caff; background: #f5faff; color: #1677ff; box-shadow: 0 6px 16px rgba(22,119,255,.08); }
12: .wizard-steps button span { color: rgba(0,0,0,.45); font-weight: 400; font-size: 12px; line-height: 1.5; }
13: .wizard-steps button em { justify-self: start; font-style: normal; font-size: 12px; border-radius: 999px; padding: 2px 8px; background: #f5f5f5; color: rgba(0,0,0,.65); }
14: .wizard-steps button.active em { background: #e6f4ff; color: #1677ff; }
16: .wizard-main { min-width: 0; }
17: .wizard-context { display: none !important; }
18: .wizard-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; margin-bottom: 8px; }
19: .wizard-form-grid .field { margin-bottom: 4px; }
20: .wizard-form-grid:has(input[placeholder="例如：江夏堂黄氏宗族"]) + .actions .secondary { display: none; }
21: .wizard-current { margin: 10px 0 16px; padding: 12px; border-radius: 8px; background: #fafafa; border: 1px solid #f0f0f0; color: rgba(0,0,0,.65); }
22: .wizard-current strong { color: #1677ff; }
24: .wizard-id-list { display: grid; gap: 8px; }
25: .wizard-id-list div, .wizard-mini-metrics div { display: flex; justify-content: space-between; align-items: center; gap: 8px; border: 1px solid #f0f0f0; background: #fafafa; border-radius: 8px; padding: 8px 10px; }
26: .wizard-id-list span, .wizard-mini-metrics span { color: rgba(0,0,0,.45); font-size: 12px; }
27: .wizard-id-list strong, .wizard-mini-metrics strong { color: rgba(0,0,0,.88); word-break: break-all; }
28: .wizard-mini-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
29: .wizard-mini-metrics div { display: grid; gap: 4px; }
30: .wizard-mini-metrics strong { font-size: 22px; color: #1677ff; }
32: .mvp1-wizard .panel { margin-bottom: 0; }
33: .mvp1-wizard .table-wrap { margin-top: 16px; }
34: .mvp1-wizard .summary-card { grid-template-columns: repeat(3, minmax(0, 1fr)); }
36: /* 建谱向导前三步：左侧列表选择，右侧表单和操作，避免列表在底部、按钮在中部的割裂体验。 */
37: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) > .ant-card-body,
38: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) > .ant-card-body,
39: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body {
47: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .panel-description,
48: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .panel-description,
49: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .panel-description {
54: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) > .ant-card-body::before,
55: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) > .ant-card-body::before,
56: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body::before {
66: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) > .ant-card-body::after,
67: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) > .ant-card-body::after,
68: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body::after {
78: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .wizard-form-grid,
79: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-form-grid,
80: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .wizard-form-grid {
89: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .wizard-form-grid,
90: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-current:first-of-type,
91: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .wizard-current {
95: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-form-grid,
96: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .wizard-form-grid {
100: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .actions,
101: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .actions,
102: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .actions {
113: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .actions { grid-row: 4; }
114: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .actions,
115: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .actions { grid-row: 5; }
117: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .table-wrap,
118: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .empty,
119: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .table-wrap,
120: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .empty {
127: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-current {
132: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-current:nth-of-type(2) {
136: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > h4 {
144: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > h4:nth-of-type(1) { grid-row: 3; }
145: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > h4:nth-of-type(2) { grid-row: 5; }
147: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > .table-wrap:nth-of-type(4),
148: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > .empty:nth-of-type(4) {
154: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > .table-wrap:nth-of-type(5),
155: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > .empty:nth-of-type(5) {
161: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .wizard-current {
166: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .table-wrap,
167: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .table-wrap,
168: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .table-wrap {
176: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .empty,
177: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .empty,
178: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .empty {
249: .wizard-layout { grid-template-columns: 260px minmax(480px, 1fr); }
255: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) > .ant-card-body,
256: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) > .ant-card-body,
257: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body {
260: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) > .ant-card-body::before,
261: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) > .ant-card-body::before,
262: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body::before,
263: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) > .ant-card-body::after,
264: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) > .ant-card-body::after,
265: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body::after,
266: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .wizard-form-grid,
267: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-form-grid,
268: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .wizard-form-grid,
269: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .actions,
270: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .actions,
271: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .actions,
272: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .table-wrap,
273: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .table-wrap,
274: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .table-wrap,
275: .mvp1-wizard .panel:has(input[placeholder="例如：江夏堂黄氏宗族"]) .empty,
276: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .empty,
277: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .empty,
278: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) > .ant-card-body > h4,
279: .mvp1-wizard .panel:has(input[placeholder="例如：长沙支"]) .wizard-current,
280: .mvp1-wizard .panel:has(input[placeholder="例如：德"]) .wizard-current {
287: .wizard-layout { grid-template-columns: 1fr; }
```

## `frontend/genealogy-web/src/prototypes/PagePatternsPrototype.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
197: <Card className="pp-page-header" bordered={false}>
215: <Card size="small" className="pp-rule-strip">
276: <Card
290: <Card title="统一设计基线">
379: const columns = useMemo<TableProps<CultureRecord>['columns']>(() => [
419: <Table<CultureRecord>
485: <Card size="small" title="查询条件" extra={<Text type="secondary">常用条件直接展示，低频条件折叠</Text>}>
489: <Card
541: <Card title="文化资料列表" extra={<Text type="secondary">背景页面保持可识别，但不与抽屉争夺视觉焦点</Text>}>
583: <Card size="small" title="摘要">
586: <Card size="small" title="正文">
663: <Card title="基本信息" className="pp-form-section">
701: <Card title="内容信息" className="pp-form-section">
710: <Card title="治理与展示" className="pp-form-section">
881: <Card
899: <Card title="按钮与反馈规则">
```

## `frontend/genealogy-web/src/shared/context/WorkspaceContext.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
6: planWizardDependencyChange,
7: wizardSelectionFields,
8: type WizardSelectionField,
9: type WizardSelections
10: } from '../../features/mvp1/domain/wizardDependencies';
11: import type { Mvp1StepKey } from '../../features/mvp1/domain/wizardStepState';
13: export type WorkspaceSelectionKey = keyof WizardSelections;
60: function activeWizardStep(): Mvp1StepKey {
66: const root = document.querySelector('.wizard-step-content');
104: function hasUnsavedWizardInput() {
105: const tags = Array.from(document.querySelectorAll('.wizard-progress-card .ant-tag'));
111: [...wizardSelectionFields, 'reviewTaskId'].includes(key as WizardSelectionField | 'reviewTaskId')
133: const selections = useMemo<WizardSelections>(() => ({
161: const changedField = wizardSelectionFields.find(field =>
169: const plan = planWizardDependencyChange(selections, changedField, String(values[changedField] || ''));
170: const activeStep = activeWizardStep();
171: const affectsUnsavedInput = hasUnsavedWizardInput() && plan.affectedSteps.includes(activeStep);
204: if (!target?.closest('.wizard-step-content')) return;
205: const active = activeWizardStep();
218: const items = Array.from(document.querySelectorAll<HTMLElement>('.wizard-ant-steps .ant-steps-item'));
220: item.querySelector('.wizard-dependency-invalid-tag')?.remove();
221: item.removeAttribute('data-wizard-invalidated');
224: item.setAttribute('data-wizard-invalidated', 'true');
225: const title = item.querySelector('.wizard-step-title');
228: tag.className = 'wizard-dependency-invalid-tag';
265: .wizard-ant-steps .ant-steps-item[data-wizard-invalidated="true"] .ant-steps-item-icon {
269: .wizard-dependency-invalid-tag {
```

## `frontend/genealogy-web/src/shared/forms/mapApiErrors.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
62: export function reportWizardApiError(error: unknown) {
64: window.dispatchEvent(new CustomEvent('genealogy:wizard-api-error', { detail }));
```

## `frontend/genealogy-web/src/shared/navigation/urlState.ts`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
3: | 'mvp1Wizard'
16: mvp1Wizard: ['clanId', 'step'],
```

## `frontend/genealogy-web/src/shared/ui/DataTable.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
298: <Table<T>
```

## `frontend/genealogy-web/src/shared/ui/DetailCard.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
17: <Card className="detail-card antd-detail-card" title={title} size="small">
```

## `frontend/genealogy-web/src/shared/ui/Form.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
5: import { validateWizardStep, wizardFieldName } from '../../features/mvp1/domain/wizardFormValidation';
6: import { useWizardFormContext } from '../../features/mvp1/WizardFormContext';
152: const context = useWizardFormContext();
155: const name = props.name || wizardFieldName(props.label);
198: const errors = validateWizardStep(context.step!, context.form?.getFieldsValue(true) || {});
226: const context = useWizardFormContext();
```

## `frontend/genealogy-web/src/shared/ui/Panel.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
14: <Card
```

## `frontend/genealogy-web/src/shared/ui/QueryResultCards.test.mjs`

- Card: 0
- Table: 0
- QueryResultCard: 5
- 查询结果文本: 0

```text
19: test('pages use one QueryResultCard without business-card configuration', () => {
22: assert.equal((source.match(/<QueryResultCard/g) || []).length, 1, `${relativePath} should render one result container`);
28: test('QueryResultCard renders result children directly after its header', () => {
29: const source = readFileSync(new URL('./QueryResultCards.tsx', import.meta.url), 'utf8');
30: const component = source.slice(source.indexOf('export function QueryResultCard'));
32: assert.doesNotMatch(component, /BusinessResultCard|business-result-card|<Card|ant-card-body|query-result-content/);
```

## `frontend/genealogy-web/src/shared/ui/QueryResultCards.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 1
- 查询结果文本: 1

```text
6: type QueryResultProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
15: export function QueryResultCard({
24: }: QueryResultProps) {
34: <Typography.Text strong>查询结果</Typography.Text>
```

## `frontend/genealogy-web/src/shared/ui/ResultListCard.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 4
- 查询结果文本: 0

```text
4: import { WIZARD_RESULT_PAGE_SIZE, wizardBatchToolbarVisible, wizardSelectionLabel } from '../../features/mvp1/domain/wizardResultListModel';
5: import { QueryResultCard } from './QueryResultCards';
73: aria-label={wizardSelectionLabel(label, selected)}
86: ? rows.length > WIZARD_RESULT_PAGE_SIZE
87: ? { pageSize: WIZARD_RESULT_PAGE_SIZE, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }
90: const summaryExtra = resultExtra || stale || wizardBatchToolbarVisible(selectedCount)
95: {wizardBatchToolbarVisible(selectedCount) ? <Tag color="processing">已选择 {selectedCount} 项</Tag> : null}
101: <QueryResultCard
102: className={`result-list-card wizard-query-result-card ${cardClassName}`.trim()}
116: <Table<RecordType>
126: </QueryResultCard>
```

## `frontend/genealogy-web/src/shared/ui/page-patterns/dashboard.tsx`

- Card: 0
- Table: 0
- QueryResultCard: 0
- 查询结果文本: 0

```text
73: <Card title={title} extra={extra}>
100: <Card className={`dashboard-metric-card dashboard-metric-card--${status}`} hoverable={Boolean(onOpen)}>
```

