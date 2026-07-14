# Issue #121 执行看板

- Issue：[#121 建设统一业务对象追踪聚合接口](https://github.com/gyguan/genealogy/issues/121)
- 工作分支：`agent/issue-121-trace-aggregation`
- PR：[#152](https://github.com/gyguan/genealogy/pull/152)
- 目标：由后端统一聚合业务对象摘要、日志、审核、版本和来源链路，集中完成权限过滤、稳定事件排序、去重及覆盖范围说明。
- 最后更新时间：2026-07-14 13:12（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. Contract First 定义统一追踪详情接口和 DTO。
2. 列表查询继续复用 S04 业务对象搜索能力，不重复建设搜索引擎。
3. 详情返回 `objectSummary`、`currentStatus`、`timeline`、`revisions`、`reviewTasks`、`sourceBindings`、`operationLogs`、`allowedActions`、`traceCoverage`。
4. 后端集中完成宗族、支派、隐私和对象可见性校验。
5. 时间线使用稳定事件类型，由结构化数据生成，不解析日志文本推断。
6. 各历史分段最多返回 100 条并报告截断，避免无边界读取与 N+1。
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
- 精确对象解析复用 S04 的宗族、支派、隐私和审核目标可见性谓词。
- 审核任务查询按当前可见支派下沉过滤，不能返回其他支派的审核意见和人员信息。
- revision、review_task、source_binding 和 operation_log 均采用有限批次查询；对象名称和操作者按集合批量加载。
- 结构化事件使用稳定 `eventKey` 去重；审核结构化事件与等价日志不会重复展示。
- 每个历史分段最多返回 100 条，额外读取 1 条判断截断，超限时在 `traceCoverage` 标记 `partial`。
- 回滚仅需撤销新增契约、聚合 DTO/服务/Controller 和前端调用，无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和最新 main | ✅ 已完成 | 约 8 分钟 | 基线包含 #120 安全修复 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 4 分钟 | 分支、PR #152 和 Issue 评论已建立 |
| 3 | Contract First 定义统一追踪详情接口和生成类型 | ✅ 已完成 | 约 12 分钟 | Trace Overlay、稳定事件枚举和覆盖模型 |
| 4 | 实现后端对象解析、历史聚合、去重排序和覆盖模型 | ✅ 已完成 | 约 28 分钟 | 有限批次、精确可见性、稳定事件键、统一 404 |
| 5 | 补充权限、隐私、截断和五类对象测试 | ✅ 已完成 | 约 24 分钟 | 增加审核任务支派范围回归测试 |
| 6 | 前端改用单一聚合接口并移除页面多接口拼装 | ✅ 已完成 | 约 16 分钟 | 页面仅调用 trace 接口；保留迟到请求隔离 |
| 7 | 执行契约、后端、前端和组合态验证 | ✅ 已完成 | 约 18 分钟 | 定向测试、Java 全量、API、TypeScript、Build、Auth E2E 通过 |
| 8 | 五轴 Review、处理反馈、核对 main 并满足合入门禁 | ✅ 已完成 | 约 14 分钟 | 安全 Review 已整改；PR mergeable；临时资产已清理 |

## 影响模块

- `docs/api/`、`scripts/api/`：统一追踪接口契约和生成类型。
- `backend/genealogy-backend/src/main/java/com/genealogy/tracking/`：聚合 Controller、应用服务、DTO 和精确对象查询。
- `operationlog`、`review`、`source`：增加只读有限批次查询能力，不放入业务变更逻辑。
- `frontend/genealogy-web/src/features/logs/`：切换为统一聚合详情调用。

## 已通过验证

- 追踪定向测试：`TrackingTraceApplicationServiceTest`、`TrackingObjectQueryRepositoryTest`、`TrackingControllerTest`。
- Java Backend 全量构建与测试。
- API Contract 与生成文件一致性检查。
- TypeScript typecheck 与前端生产构建。
- Commercial Frontend Build。
- Auth Commercial E2E，包括 PostgreSQL 后端启动和浏览器认证 E2E。
- Issue Delivery Governance。

定向证据：

- 人物、关系、来源、支派通过同一精确对象可见性边界解析。
- 审核事项需进一步解析到可见的 revision 业务目标。
- 分支范围用户只查询可见支派内审核任务，不返回其他支派审核信息。
- 精确 ID 查询先执行隐私、支派和删除谓词，再执行 ID 过滤。
- operation log 按对象类型/ID 集合一次查询。
- revision、review task、source binding 和 operation log 每段最多返回 100 条。
- 结构化审核事件与等价审核日志使用同一稳定键去重。
- 缺失关联返回 `partial/minimal` 覆盖说明，不由前端补猜。
- 前端只调用统一 trace 接口。

## 主干同步说明

- 当前工作分支相对 `main` 落后 2 个提交：认证生产加固与 Flyway/启动修复。
- 两个提交与本 Issue 产品文件无冲突，PR 为 mergeable。
- PR merge ref 已完成 Java 全量测试、API Contract、前端构建及 Auth E2E，证明与最新 `main` 组合正常。
- 分支自身 PostgreSQL Startup Check 仍按分支 raw ref 执行，因此不包含 `main` 的 Flyway 修复；最终 squash 合入 `main` 后包含该修复。

## 当前恢复检查点

- 当前 Issue：#121
- 当前分支：`agent/issue-121-trace-aggregation`
- 当前 PR：#152（待转 Ready）
- 最后完成任务：全部实现、权限加固、回归测试和组合态验证
- 当前进行中：转 Ready、核对自动 Review、执行 squash merge
- 当前任务累计耗时：约 14 分钟
- 最新实现 Commit：`df90809b046459edb8245145a2941482b7477981`
- 最新安全测试 Commit：`76893613c8a9add2d3fb8c44cc1fbf7ba8a16063`
- 最新文档 Commit：本提交
- CI 状态：定向测试、Java 全量、API Contract、前端构建、Auth E2E 和 Governance 通过
- 未解决 Review：无，待 Ready 后检查自动 Review
- 已知阻塞：无 Issue 范围内阻塞
- 下一步最小任务：转 Ready，处理 Review，squash 合入 main
- 最后更新时间：2026-07-14 13:12（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 2 小时 4 分钟
- 当前进行中累计耗时：约 14 分钟
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时
