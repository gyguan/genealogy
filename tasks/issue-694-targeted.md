# Issue 694 建谱向导结果区域定向清单

## `frontend/genealogy-web/src/features/mvp1/steps/branch/BranchStep.tsx`

- ResultListCard: 3
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
8: import { ResultListCard } from '../../../../shared/ui/ResultListCard';
211:     <Panel title="建立支派" description="支派保存后默认为草稿；审核通过后才能用于字辈、人物和来源关联。">
236:       <ResultListCard<BranchLike>
237:         cardClassName="branch-step-query-results"
288:                       <Popconfirm title="确认删除该支派草稿？" okText="删除" cancelText="取消" onConfirm={() => void deleteDraft(row)}>
```

## `frontend/genealogy-web/src/features/mvp1/steps/clan/ClanStep.tsx`

- ResultListCard: 3
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
8: import { ResultListCard } from '../../../../shared/ui/ResultListCard';
192:       <Panel title="创建宗族" description="宗族作为建谱容器暂不进入审核流；创建后继续维护支派。">
209:       <ResultListCard<ClanRecord>
210:         cardClassName="clan-step-query-results"
```

## `frontend/genealogy-web/src/features/mvp1/steps/generation/GenerationStep.tsx`

- ResultListCard: 4
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
7: import { ResultListCard } from '../../../../shared/ui/ResultListCard';
312:     <Panel title="维护字辈" description="字辈方案保存后默认为草稿；审核通过后才能用于人物录入。">
339:       <ResultListCard<GenerationSchemeLike>
340:         cardClassName="generation-step-query-results"
387:         title="维护字辈"
414:           <ResultListCard<GenerationItemLike>
415:             cardClassName="generation-item-query-results"
```

## `frontend/genealogy-web/src/features/mvp1/steps/person/PersonStep.tsx`

- ResultListCard: 3
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
7: import { ResultListCard } from '../../../../shared/ui/ResultListCard';
440:     <Panel title="录入人物" description="人物保存后默认为草稿；审核通过后才能作为中心人物建立关系。">
442:         <Card size="small" title="适用范围" className="person-step-form-card">
481:         <Card size="small" title="基础信息" className="person-step-form-card">
504:         <Card size="small" title="世系信息" className="person-step-form-card">
523:         <Card size="small" title="生卒与居住" className="person-step-form-card">
552:         <Card size="small" title="传记与隐私" className="person-step-form-card">
574:       <ResultListCard<PersonLike>
575:         cardClassName="person-step-query-results"
```

## `frontend/genealogy-web/src/features/mvp1/steps/relationship/RelationshipStep.tsx`

- ResultListCard: 3
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
7: import { ResultListCard } from '../../../../shared/ui/ResultListCard';
252:     <Panel title="建立亲属关系" description="只能选择已审核通过的人物建立关系；新关系审核通过后才能绑定来源。">
327:       <ResultListCard<RelationshipLike>
328:         cardClassName="relationship-step-query-results"
```

## `frontend/genealogy-web/src/features/mvp1/steps/review/ReviewProgressStep.tsx`

- ResultListCard: 0
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
195:     <Panel title="审核进度" description="查看待审任务；创建页内已支持保存并提交审核，这里只提供进度查询和补充提交入口。">
221:       <section className="review-progress-submit-list step-object-result-panel">
228:         <Table<ReviewCandidate>
249:       <section className="review-progress-task-list step-object-result-panel">
256:         <Table<ReviewTaskLike>
```

## `frontend/genealogy-web/src/features/mvp1/steps/review/WizardSummaryStep.tsx`

- ResultListCard: 0
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
36:     <Card className="wizard-summary-section" size="small" title={section.title} extra={<Button type="link" onClick={() => onRetry()}>刷新</Button>}>
39:         <Col xs={12} sm={8}><Statistic title="总数" value={section.counts.total} /></Col>
40:         {section.detailCount !== undefined ? <Col xs={12} sm={8}><Statistic title="明细/绑定" value={section.detailCount} /></Col> : null}
102:         title="建谱完成"
103:         subTitle="本次宗族、支派、字辈、人物、关系和来源均已满足完成条件。"
114:     <Panel title="建谱结果汇总" description="集中查看各步骤完成情况、审核状态和阻塞项；审批操作请进入独立审核中心。">
127:           <Card className="wizard-summary-blockers" title={`完成检查（${summary.blockers.length} 项阻塞）`}>
144:           <Card className="wizard-summary-completion" size="small">
```

## `frontend/genealogy-web/src/features/mvp1/steps/source/SourceStageStep.tsx`

- ResultListCard: 3
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
6: import { ResultListCard } from '../../../../shared/ui/ResultListCard';
162:     <Panel title="来源证据" description="先创建并审核来源，再在绑定阶段选择已审核通过的来源。">
164:         <Card title={<Space><span>阶段一：创建来源</span><Tag color="processing">创建与审核</Tag></Space>}>
173:         <Card title={<Space><span>阶段二：选择正式来源并绑定对象</span><Tag color={stage.bindingOpen ? 'success' : 'default'}>{stage.bindingOpen ? '已开放' : '待选择'}</Tag></Space>}>
185:           <ResultListCard<SourceLinkLike>
```

## `frontend/genealogy-web/src/features/mvp1/steps/source/SourceStep.tsx`

- ResultListCard: 0
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
461:     <Panel title="绑定来源证据" description="来源和绑定对象都必须审核通过后才能建立绑定。">
505:         <button className="secondary" disabled={!!sourceBindDisabledReason} title={sourceBindDisabledReason || undefined} onClick={() => void bindSource()}>绑定来源</button>
509:       <section className="source-step-bound-panel step-object-result-panel">
522:               <div className="source-step-bound-list">
558:       <section className="source-step-list-panel step-object-result-panel">
573:           <Table<SourceLike>
```

## `frontend/genealogy-web/src/features/mvp1/steps/tree/TreeStep.tsx`

- ResultListCard: 0
- QueryResultCard: 0
- Card 标签: 0
- Table 标签: 0

```text
114:     <Panel title="查看世系" description="只允许选择已审核通过的人物查看世系。">
152:         <Table<TreeNodeLike>
166:         <Table<TreeEdgeLike>
```

