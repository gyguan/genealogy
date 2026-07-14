# Issue #121 执行看板

- Issue：[#121 建设统一业务对象追踪聚合接口](https://github.com/gyguan/genealogy/issues/121)
- 工作分支：`agent/issue-121-trace-aggregation`
- 目标：由后端统一聚合业务对象摘要、日志、审核、版本和来源链路，集中完成权限过滤、稳定事件排序、去重及覆盖范围说明。
- 基线：最新 `main`，包含 #120 及后续追踪 SQL 安全修复 `13942a6f85691404cadeb6f55309539257ac9be1`
- 最后更新时间：2026-07-14 10:30（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. Contract First 定义统一追踪详情接口和 DTO。
2. 列表查询继续复用 S04 业务对象搜索能力，不重复建设搜索引擎。
3. 详情返回 `objectSummary`、`currentStatus`、`timeline`、`revisions`、`reviewTasks`、`sourceBindings`、`operationLogs`、`allowedActions`、`traceCoverage`。
4. 后端集中完成宗族、支派、隐私和对象可见性校验。
5. 时间线使用稳定事件类型，由结构化数据生成，不解析日志文本推断。
6. 查询按对象和有限批次执行，设置单段返回上限和截断覆盖说明，避免无边界读取与 N+1。
7. 前端追踪页切换为单一详情接口，不再并行拼接日志、审核任务和 Diff。
8. 覆盖人物、关系、来源、支派和审核事项的契约与服务测试。

### 非目标

- 不新增 `trace_id`、数据库表或 Flyway 迁移。
- 不修改审核通过、驳回或正式数据生效流程。
- 不重构最终追踪中心页面布局；由 #122（S06）负责。
- 不移除 S04 业务对象搜索接口和现有日志接口。

### 方案、兼容与回滚

- 新增只读聚合接口，保留现有搜索和日志接口兼容。
- 聚合层位于 `tracking` 模块应用服务，只编排各只读查询，不承载业务写规则。
- 复用现有权限数据范围、业务对象可见性和日志业务化展示能力。
- 每个历史分段设置明确上限，超限时在 `traceCoverage` 标记 `partial` 和对应缺失段。
- 回滚仅需撤销新增契约、聚合 DTO/服务/Controller 和前端调用，无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和最新 main | ✅ 已完成 | 约 8 分钟 | 已确认无已有分支/PR，基线包含 #120 安全修复 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | 🔄 进行中 | 已累计约 2 分钟 | 分支与本检查点已建立，下一步创建 Draft PR |
| 3 | Contract First 定义统一追踪详情接口和生成类型 | ⏳ 待开始 | — | — |
| 4 | 实现后端对象解析、历史聚合、去重排序和覆盖模型 | ⏳ 待开始 | — | — |
| 5 | 补充权限、隐私、截断和五类对象测试 | ⏳ 待开始 | — | — |
| 6 | 前端改用单一聚合接口并移除页面多接口拼装 | ⏳ 待开始 | — | — |
| 7 | 执行契约、后端、前端和 PostgreSQL 相关验证 | ⏳ 待开始 | — | — |
| 8 | 五轴 Review、处理反馈、同步 main 并合入 | ⏳ 待开始 | — | — |

## 影响模块

- `docs/api/`、`scripts/api/`：统一追踪接口契约和生成类型。
- `backend/genealogy-backend/src/main/java/com/genealogy/tracking/`：聚合 Controller、应用服务、DTO 和只读查询。
- `operationlog`、`review`、`source`：复用现有只读服务/Repository，不放入业务变更逻辑。
- `frontend/genealogy-web/src/features/logs/`：切换为统一聚合详情调用。

## 验证方案

```bash
cd backend/genealogy-backend
mvn -q -DskipTests compile
mvn -q -Dtest=TrackingTrace*Test,TrackingControllerTest test

cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run test:logs
npm run typecheck
npm run build
```

如涉及 PostgreSQL 特有查询，将增加 PostgreSQL 16 定向测试；全仓基线失败需单独记录，不通过降低断言规避。

## 已知风险

- 历史链路分散于日志、revision、review_task 和 source_binding，部分旧数据缺少完整关联，必须通过 `traceCoverage` 显式降级。
- 审核事项的目标可见性必须沿用 #120 修复后的严格语义，不能只根据 review_task 支派判断。
- 历史记录可能较多，必须限制每段查询规模并报告截断，不允许无界全表读取。

## 当前恢复检查点

- 当前 Issue：#121
- 当前分支：`agent/issue-121-trace-aggregation`
- 当前 Draft PR：待创建
- 最后完成任务：刷新规则、需求和最新 main；创建分支与执行检查点
- 当前进行中：创建 Draft PR 并回写 Issue
- 当前任务累计耗时：已累计约 2 分钟
- 最新 Commit：本执行检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，回写 Issue，然后进入 Contract First
- 最后更新时间：2026-07-14 10:30（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 8 分钟
- 当前进行中累计耗时：已累计约 2 分钟
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时
