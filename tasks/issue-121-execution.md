# Issue #121 执行看板

- Issue：[#121 建设统一业务对象追踪聚合接口](https://github.com/gyguan/genealogy/issues/121)
- 工作分支：`agent/issue-121-trace-aggregation`
- PR：[#152](https://github.com/gyguan/genealogy/pull/152)
- 目标：由后端统一聚合业务对象摘要、日志、审核、版本和来源链路，集中完成权限过滤、稳定事件排序、去重及覆盖范围说明。
- 基线：最新 `main`，包含 #120 及后续追踪 SQL 安全修复 `13942a6f85691404cadeb6f55309539257ac9be1`
- 最后更新时间：2026-07-14 11:34（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. Contract First 定义统一追踪详情接口和 DTO。
2. 列表查询继续复用 S04 业务对象搜索能力，不重复建设搜索引擎。
3. 详情返回 `objectSummary`、`currentStatus`、`timeline`、`revisions`、`reviewTasks`、`sourceBindings`、`operationLogs`、`allowedActions`、`traceCoverage`。
4. 后端集中完成宗族、支派、隐私和对象可见性校验。
5. 时间线使用稳定事件类型，由结构化数据生成，不解析日志文本推断。
6. 查询按对象和有限批次执行，每个历史分段最多返回 100 条并报告截断，避免无边界读取与 N+1。
7. 前端追踪页切换为单一详情接口，不再并行拼接日志、审核任务和 Diff。
8. 覆盖人物、关系、来源、支派和审核事项的契约与服务测试。

### 非目标

- 不新增 `trace_id`、数据库表或 Flyway 迁移。
- 不修改审核通过、驳回或正式数据生效流程。
- 不重构最终追踪中心页面布局；由 #122（S06）负责。
- 不移除 S04 业务对象搜索接口和现有日志接口。

### 方案、兼容与回滚

- 新增只读接口 `GET /api/v1/tracking/objects/{targetType}/{targetId}/trace`，保留现有搜索和日志接口兼容。
- 聚合层位于 `tracking` 模块应用服务，只编排各只读查询，不承载业务写规则。
- 精确对象解析复用 S04 的宗族、支派、隐私和审核目标可见性谓词；不可见、已删除或不存在统一返回“对象不存在或当前不可见”。
- revision、review_task、source_binding 和 operation_log 均采用有限批次查询；对象名称和操作者按集合批量加载。
- 结构化事件使用稳定 `eventKey` 去重；审核结构化事件与等价日志不会重复展示。
- 每个历史分段最多返回 100 条，额外读取 1 条判断截断，超限时在 `traceCoverage` 标记 `partial` 和具体分段。
- 回滚仅需撤销新增契约、聚合 DTO/服务/Controller 和前端调用，无数据库和数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和最新 main | ✅ 已完成 | 约 8 分钟 | 已确认无已有分支/PR，基线包含 #120 安全修复 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 4 分钟 | 分支、PR #152 和 Issue 启动评论已建立 |
| 3 | Contract First 定义统一追踪详情接口和生成类型 | ✅ 已完成 | 约 12 分钟 | 新增 trace Overlay、稳定事件枚举、覆盖模型和生成 DTO |
| 4 | 实现后端对象解析、历史聚合、去重排序和覆盖模型 | ✅ 已完成 | 约 28 分钟 | 有限批次聚合、精确可见性、稳定事件键和统一 404 |
| 5 | 补充权限、隐私、截断和五类对象测试 | ✅ 已完成 | 约 18 分钟 | 五类对象、审核目标、去重、截断和精确 SQL 边界测试 |
| 6 | 前端改用单一聚合接口并移除页面多接口拼装 | ✅ 已完成 | 约 16 分钟 | 页面仅调用 trace 接口；保留迟到请求隔离 |
| 7 | 执行契约、后端和前端定向验证 | ✅ 已完成 | 约 12 分钟 | API Check、定向后端测试、TypeScript、Build 通过 |
| 8 | 五轴 Review、处理反馈、同步 main 并合入 | 🔄 进行中 | 已累计约 4 分钟 | 正在跑最终标准 CI、更新治理记录并检查 Review |

## 影响模块

- `docs/api/`、`scripts/api/`：统一追踪接口契约和生成类型。
- `backend/genealogy-backend/src/main/java/com/genealogy/tracking/`：聚合 Controller、应用服务、DTO 和精确对象查询。
- `operationlog`、`review`、`source`：增加只读有限批次查询能力，不放入业务变更逻辑。
- `frontend/genealogy-web/src/features/logs/`：切换为统一聚合详情调用。

## 已通过验证

```bash
cd backend/genealogy-backend
mvn -q -DskipTests compile
mvn -Dtest=TrackingTraceApplicationServiceTest,TrackingObjectQueryRepositoryTest,TrackingControllerTest test

cd frontend/genealogy-web
npm run api:check
npm run typecheck
npm run build
```

定向证据：

- 人物、关系、来源、支派通过同一精确对象可见性边界解析。
- 审核事项需进一步解析到可见的 revision 业务目标；不可见目标不能返回名称或历史。
- 精确 ID 查询先执行原有隐私、支派和删除谓词，再执行 `targetIds` 过滤。
- operation log 按对象类型/ID 集合一次查询，不逐对象或逐任务查询。
- revision、review task、source binding 和 operation log 每段最多返回 100 条。
- 结构化审核事件与等价审核日志使用同一稳定键去重。
- 缺失关联返回 `partial/minimal` 覆盖说明，不由前端补猜。
- 前端只调用统一 trace 接口，API Contract、TypeScript 和生产构建通过。

## 已知风险与后续边界

- 历史数据缺少 revision、审核或来源绑定时，接口通过 `traceCoverage` 如实降级，不能补猜。
- 当前单段上限固定为 100；S06 可根据交互设计决定是否增加历史分段展开能力。
- 标准 Backend CI 的 Java 全量测试和 PostgreSQL Startup Check 可能继续受仓库其他模块测试或重复 Flyway `V3` 基线影响；本 Issue 定向后端测试独立通过。
- 当前不新增索引；生产数据增长后需基于真实执行计划评估 operation_log 和 revision 查询索引。

## 当前恢复检查点

- 当前 Issue：#121
- 当前分支：`agent/issue-121-trace-aggregation`
- 当前 PR：#152（Draft）
- 最后完成任务：完成契约、后端聚合、五类/安全/截断测试、前端单接口接入及临时资产清理
- 当前进行中：最终标准 CI、五轴 Review、主干同步和合入收尾
- 当前任务累计耗时：已累计约 4 分钟
- 最新实现 Commit：`38778eca3f6b8ab29c3099df281bec641d33fdf8`
- CI 状态：API Contract 通过；定向后端测试、前端 typecheck/build 已通过；标准 Backend CI 运行中
- 未解决 Review：无，待转 Ready 后检查自动 Review
- 已知阻塞：无 Issue 范围内阻塞
- 下一步最小任务：确认标准检查、转 Ready、处理 Review、squash 合入 main
- 最后更新时间：2026-07-14 11:34（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 1 小时 38 分钟
- 当前进行中累计耗时：已累计约 4 分钟
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时
