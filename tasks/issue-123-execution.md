# Issue #123 执行看板

- Issue：[#123 增加跨模块查看追踪入口与可恢复深链接](https://github.com/gyguan/genealogy/issues/123)
- 工作分支：`agent/issue-123-tracking-deep-links`
- PR：[#201](https://github.com/gyguan/genealogy/pull/201)
- 目标：在五类核心业务页面增加统一“查看追踪”入口，并通过可复制 URL 恢复宗族、对象、页签和详情状态。
- 基线：`main` commit `492a6a32f578787d0fe90482029d9861b23f3de6`，已包含 #122 双页签追踪中心。
- 最后更新时间：2026-07-14 21:20（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. 建立统一追踪深链接协议：`view=auditTrace&tab=object&clanId=<id>&targetType=<type>&targetId=<id>`，审核入口可附带 `reviewTaskId`，但业务对象类型与 ID 必须同时存在。
2. 追踪中心兼容 #122 既有参数，并优先读取统一参数；刷新、复制链接、前进/后退均可恢复。
3. 在人物档案详情、关系记录、来源详情及引用关系、支派记录、审核详情中增加“查看追踪”入口。
4. 入口仅在对象已经由后端成功返回时展示，不基于前端角色常量判断权限。
5. 审核详情跳转使用审核对象的 `targetType + targetId`，不以审核任务 ID 作为唯一追踪对象。
6. 深链接访问无权对象时仅展示统一无权限/不可用状态，不显示来自来源页面的对象摘要。
7. 补充统一深链接与追踪中心状态恢复测试。

### 非目标

- 不新增或修改后端 API、数据库字段、Flyway、审核流程或正式数据写入逻辑。
- 不在来源资料库重复实现追踪时间线。
- 不在审核中心增加操作审计列表。
- 不为单一页面新增全局状态管理库。

### 兼容与回滚

- 保留 `trackingTab/traceType/traceId` 旧参数读取兼容，统一新入口写入 `tab/targetType/targetId`。
- 继续复用 #121 的统一追踪详情接口及其后端权限、支派和隐私校验。
- 回滚只需移除共享深链接工具和各页面入口，并恢复追踪中心参数模型；无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、已有现场和五类页面影响范围 | ✅ 已完成 | 约 14 分钟 | 首次启动、无已有分支/PR，不需要 API 变更 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 4 分钟 | 分支、看板、PR #201 和 Issue 启动检查点已建立 |
| 3 | 实现统一深链接协议与追踪中心兼容恢复 | ✅ 已完成 | 约 18 分钟 | 规范参数、旧参数兼容、宗族恢复和正整数 ID 校验 |
| 4 | 增加人物、关系、来源/引用、支派、审核详情入口 | ✅ 已完成 | 约 24 分钟 | 共享按钮接入五类页面，审核入口使用业务对象 |
| 5 | 完善无权限状态与浏览器导航恢复 | ✅ 已完成 | 约 16 分钟 | 403/404 清空来源摘要，pushState + popstate 支持前进/后退 |
| 6 | 补充模型测试并执行 typecheck、build、api:check | ✅ 已完成 | 约 17 分钟 | 深链接/兼容测试、类型、构建、契约均通过 |
| 7 | 五轴 Review、处理反馈并合入 main | ✅ 已完成 | 约 12 分钟 | Ready 后无 Review 线程；分支 behind 0，进入 squash merge |

## 核心实现

### 统一深链接

- 共享工具：`src/shared/navigation/trackingDeepLink.js`。
- 共享入口：`TrackingLinkButton.tsx`。
- 新链接仅接受人物、关系、来源和支派，宗族 ID 与对象 ID 必须为正整数。
- 链接使用 `history.pushState` 并派发 `popstate`，复用应用壳现有页面切换逻辑。
- 保留无关查询参数及 hash，不保留旧追踪参数，避免新旧状态冲突。

### 追踪中心恢复

- 优先读取 `tab/clanId/targetType/targetId/reviewTaskId`。
- 继续兼容 `trackingTab/traceType/traceId`。
- 跨宗族深链接先恢复工作区宗族，再同步 URL 和加载对象，避免旧宗族覆盖链接参数。
- 403/404 时清空来源页传入的对象摘要，仅展示统一“无权或对象不可用”状态。

### 页面入口

- 人物档案：只读详情态展示，编辑态隐藏，避免未保存内容丢失。
- 关系记录：列表已返回对象旁直接进入关系追踪。
- 来源资料：来源详情和可追踪引用对象均提供入口。
- 支派记录：列表已返回支派旁提供入口。
- 审核详情：使用审核任务的业务 `targetType + targetId`，`reviewTaskId` 仅作为上下文；不支持的审核对象类型自动隐藏入口。

## 验证结果

- ✅ `npm run test:logs`
- ✅ `npm run test:tracking-center`
- ✅ `npm run typecheck`
- ✅ `npm run build`
- ✅ `npm run api:check`
- ✅ Frontend CI
- ✅ API Contract
- ✅ 新旧参数兼容、复制链接、正整数 ID、pushState/popstate 单元测试
- ✅ 跨宗族首次恢复保护
- ✅ 临时补丁脚本和 workflow 已自动删除
- ✅ `package-lock.json` 未进入最终差异

Auth Commercial E2E 与 Issue Delivery Governance 当前仅支持手动触发，不是本 PR 自动门禁；本次未修改认证、后端、数据库或迁移代码。

## 五轴 Review

- **Correctness**：修复跨宗族首次加载时 URL 被旧工作区覆盖的问题；审核入口追踪业务对象。
- **Readability**：入口行为集中在共享工具与共享按钮，页面只传业务上下文。
- **Architecture**：不增加全局状态库，不重复实现追踪详情，不增加 N+1 权限预检。
- **Security**：仅允许白名单对象类型和正整数 ID；403/404 不展示来源页摘要，最终权限由后端追踪接口执行。
- **Performance**：页面入口不发请求，点击后仅调用一次统一聚合接口。

## 已知风险与处理

- 审核中心存在 `import_job/source_binding/generation_scheme/clan` 等当前追踪接口不支持的对象类型：共享按钮自动隐藏，不生成错误链接。
- 入口展示代表来源接口已允许当前用户读取对象，不代表追踪权限；追踪接口仍执行 `operation_log.view`、宗族、支派和隐私校验。
- 关系与支派以列表作为详情载体：入口不预加载追踪数据，不产生 N+1。

## 最终恢复检查点

- 当前 Issue：#123，PR 合入后由 `Closes #123` 自动关闭。
- 当前分支：`agent/issue-123-tracking-deep-links`。
- 当前 PR：#201，Ready。
- 最后完成任务：标准门禁、五轴 Review、自动 Review 和主干同步核对。
- CI 状态：Frontend CI、API Contract、定向测试、类型、构建和契约全部通过。
- 未解决 Review：无评论、无 Review 提交、无未解决线程。
- 主干同步：`behind 0`，PR 可合并。
- 下一步最小任务：使用当前 head SHA 执行 squash merge。
- 最后更新时间：2026-07-14 21:20（Asia/Shanghai）。

### 耗时汇总

- Issue #123 活跃耗时：约 1 小时 45 分钟。
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时。
