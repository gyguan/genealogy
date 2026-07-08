# MVP1 前端页面重构交接记录

日期：2026-07-08
仓库：gyguan/genealogy
范围：frontend/genealogy-web/src/features/mvp1

> 用途：当前 ChatGPT 会话上下文过长，新开聊天时可直接引用本文继续推进。

---

## 一、重构原则

后续继续重构时必须遵守：

1. 不再新增 Portal 外挂组件。
2. 不再新增 `document.querySelector / activeStepIndex / setInterval` 判断步骤。
3. 新增步骤功能必须放到对应 Step 目录。
4. 新增列表不要使用通用 `DataTable`，除非明确是通用业务列表。
5. 不要全仓扫描。
6. 严格按顺序推导，不要跳到后面直接给结论。
7. 先列文件清单，再读取关键文件。
8. 每个问题单独回答。
9. 最后给出实施优先级。
10. 小步重构，每次只处理一个 Step 或一个清晰小范围，替换后立即验证。

---

## 二、当前总体结论

前端重构已经完成“主干解耦 + 公共领域函数/service 下沉 + ReviewProgressStep 深化拆分”。

当前尚未完成“所有 Step 查询/提交/类型/展示逻辑全面 service 化”。也就是说，页面耦合的大头已经拆开，后续主要是横向补齐和编译验证。

---

## 三、已完成事项

### 1. 页面入口瘦身

`Mvp1WizardPage.tsx` 当前主要负责：

- step 状态；
- ready 状态；
- `WizardShell` 组合；
- `StepRenderer` 组合；
- 审核提交后跳转 Review 的轻量状态处理。

该文件已不再承载各 Step 的表单、列表和业务 API 逻辑。

### 2. Step 分发独立

`StepRenderer.tsx` 当前负责：

- `clan`
- `branch`
- `generation`
- `person`
- `relationship`
- `source`
- `review`
- `tree`

各 Step 的组件分发。

注意：`StepRenderer` 里仍有 switch，但这是合法的“步骤分发器”职责，不是旧页面级强耦合 `renderCurrentStep()`。

### 3. Workspace 去全局化

`WorkspaceContext.tsx` 已完成：

- 删除 `window.__genealogyWorkspace`；
- 删除外部全局暴露；
- 只保留 `clanId` 持久化到 localStorage；
- 其他状态如 `branchId / personId / relationshipId / sourceId / reviewTaskId` 只保留 React Context 内存态。

### 4. 删除旧 Portal 外挂组件

已删除旧外挂组件：

- `BranchStepListPanel.tsx`
- `GenerationStepListsPanel.tsx`
- `PersonStepListPanel.tsx`
- `RelationshipStepPanel.tsx`
- `RelationshipStepListPanel.tsx`
- `SourceStepListPanel.tsx`
- `ReviewObjectQueryPanel.tsx`

删除后曾做过精确符号核验，确认这些组件名无残留引用。

### 5. 清理旧 CSS hack

已清理：

- `review-object-query-panel.css`
- `step-draft-review-panel.css`
- `.branch-step-host`
- `.relationship-step-host`
- placeholder / host / portal 相关 CSS hack

`main.tsx` 已不再 import：

- `review-object-query-panel.css`
- `step-draft-review-panel.css`

### 6. 公共 normalize / status 函数

已新增：

- `frontend/genealogy-web/src/features/mvp1/domain/normalize.ts`
- `frontend/genealogy-web/src/features/mvp1/domain/status.ts`

主要能力：

- `toRows`
- `nullableString`
- `nullableNumber`
- `nullableBoolean`
- `statusOf`
- `isOfficial`
- `isReviewable`
- `statusText`
- `statusColor`

已逐步接入：

- `BranchStep`
- `TreeStep`
- `GenerationStep`
- `PersonStep`
- `RelationshipStep`
- `SourceStep`
- `ReviewProgressStep`

### 7. 关系领域函数抽取

已新增：

- `frontend/genealogy-web/src/features/mvp1/domain/relationship.ts`

主要能力：

- `RelationshipMode`
- `RELATIONSHIP_MODE_LABEL`
- `genderText`
- `personLabel`
- `expectedGenerationNo`
- `relationshipRuleText`
- `isRelationshipCandidate`
- `buildRelationshipBody`
- `relationshipName`
- `relativeName`
- `relationTypeText`

已接入：

- `RelationshipStep`
- `SourceStep`
- `ReviewProgressStep`

### 8. 审核领域函数抽取

已扩展：

- `frontend/genealogy-web/src/features/mvp1/domain/review.ts`

主要能力：

- `ReviewTargetType`
- `reviewTargetTypeText`
- `toApiReviewTargetType`
- `reviewTaskTitle`
- `createdAtText`
- `buildReviewTargetOptions`
- `ReviewTargetOption`
- `ReviewTargetOptionData`

其中 `buildReviewTargetOptions(type, data)` 已用于 `ReviewProgressStep` 的候选对象 options 构造。

### 9. review task 提交 service

已新增：

- `frontend/genealogy-web/src/features/mvp1/services/reviewTaskService.ts`

主要能力：

- `submitReviewTask`
- `submitReviewTasks`
- `approveReview`
- `countSettledResults`

已接入：

- `SourceStep`
- `BranchStep`
- `GenerationStep`
- `PersonStep`
- `RelationshipStep`
- `ReviewProgressStep`

说明：`RelationshipStep` 后来检查时发现已接入，无需重复提交。

### 10. ReviewProgress 查询 service

已新增：

- `frontend/genealogy-web/src/features/mvp1/services/reviewProgressService.ts`

主要能力：

- `loadReviewData(clanId, personId)`

该 service 查询并归一化：

- branches
- persons
- sources
- generation-schemes
- pending review-tasks
- relationships

并导出类型：

- `ReviewProgressBranchLike`
- `ReviewProgressGenerationSchemeLike`
- `ReviewProgressPersonLike`
- `ReviewProgressRelationshipLike`
- `ReviewProgressSourceLike`
- `ReviewProgressTaskLike`
- `ReviewProgressData`

`ReviewProgressStep` 已复用这些类型。

### 11. clan 查询 service

已新增：

- `frontend/genealogy-web/src/features/mvp1/services/clanService.ts`

主要能力：

- `loadClans()`
- `ClanLike`

当前已接入：

- `ReviewProgressStep`

---

## 四、当前未完成事项

### 1. clanService 还没有横向接入其他 Step

目前只确认 `ReviewProgressStep` 接入了 `clanService.loadClans()`。

还需逐个接入：

1. `BranchStep`
2. `GenerationStep`
3. `PersonStep`
4. `RelationshipStep`
5. `SourceStep`

注意：用户已经明确要求下一步处理：

- P8-1：BranchStep 接入 clanService
- P8-2：GenerationStep 接入 clanService
- P8-3：PersonStep 接入 clanService
- P8-4：RelationshipStep 接入 clanService
- P8-5：SourceStep 接入 clanService

要求仍是按顺序逐个处理，不能一次性大范围替换。

### 2. 各 Step 的业务查询 service 还没有全部抽完

目前只有 `ReviewProgressStep` 的聚合查询被抽成 `reviewProgressService.loadReviewData(clanId, personId)`。

其他 Step 后续可能还需要逐步抽：

- `loadBranches`
- `loadSchemes`
- `loadPersons`
- `loadRelationships`
- `loadSources`
- `loadTree`

建议不要抽“万能 service”，要按 Step 小步推进。

### 3. 各 Step 的局部展示函数还未完全领域化

仍可能保留局部展示函数：

- `branchName`
- `schemeName`
- `sourceName`
- `clanLabel`
- `genderText`

建议原则：跨两个以上 Step 使用再抽；只在一个 Step 使用先保留。

### 4. 类型定义还没有统一为最终领域模型

当前已有：

- `ReviewProgress*Like` 类型
- `ClanLike`
- 各 Step 自己的局部 Like 类型

后续可以逐步统一为领域模型，但不建议立刻全局重构，因为影响面较大。

### 5. 缺真实前端编译验证

GitHub status checks 多次返回 `statuses: []`，说明仓库没有自动 CI / 编译状态。

必须本地执行：

```bash
cd frontend/genealogy-web
npm install
npm run build
```

如果开启 `noUnusedLocals`，重点关注 unused import / unused type。

---

## 五、下一步推荐顺序

当前用户最新任务是 P8，建议新聊天从这里继续：

```text
P8-1：BranchStep 接入 clanService
P8-2：GenerationStep 接入 clanService
P8-3：PersonStep 接入 clanService
P8-4：RelationshipStep 接入 clanService
P8-5：SourceStep 接入 clanService
```

执行方式：

1. 每次只处理一个 Step。
2. 先列文件清单。
3. 读取该 Step 和 `clanService.ts`。
4. 只替换 clan 查询逻辑。
5. 保留组件内默认选中、workspace 写入、loading 状态。
6. 替换后读取 import 和 `loadClans()` 片段做静态核验。
7. 查 GitHub commit status。
8. 最后给出下一步优先级。

---

## 六、新聊天接续提示

新聊天可以直接输入：

```text
请读取 GitHub 文件 frontend/genealogy-web/docs/mvp1-frontend-refactor-handoff-2026-07-08.md，继续从 P8-1：BranchStep 接入 clanService 开始。严格遵守文档中的小步重构原则，不要全仓扫描，先列文件清单，再读取关键文件，每个问题单独回答，最后给出实施优先级。
```

---

## 七、当前不建议做的事情

暂不建议：

1. 一次性把 P8-1 到 P8-5 全部改完。
2. 一次性抽全局 Entity 类型。
3. 一次性把所有 Step 的查询都 service 化。
4. 新增 Portal / DOM 查询 / 定时器判断步骤。
5. 为每个列表统一套通用 DataTable。
6. 大范围格式化文件，导致 diff 失控。

---

## 八、推荐下一步具体动作

下一步只做：

```text
P8-1：BranchStep 接入 clanService
```

建议文件清单：

1. `frontend/genealogy-web/src/features/mvp1/services/clanService.ts`
2. `frontend/genealogy-web/src/features/mvp1/steps/branch/BranchStep.tsx`

预期改动：

- 删除 `BranchStep` 中 `apiClient.get('/clans').catch(() => []) + toRows<ClanLike>` 的本地查询实现。
- 引入 `loadClans as queryClans, type ClanLike`。
- 组件内 `loadClans()` 保留 loading、setClans、默认设置 workspace.clanId。
- 不改支派查询、支派创建、提交审核、列表 Table。
