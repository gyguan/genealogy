# Issue #119 执行看板

- Issue：[#119 修复审核链路拼装与追踪结果准确性](https://github.com/gyguan/genealogy/issues/119)
- 工作分支：`agent/issue-119-trace-accuracy`
- Draft PR：[#141](https://github.com/gyguan/genealogy/pull/141)
- 目标：使用真实审核详情修复追踪链路拼装，隔离不同业务对象的状态，稳定去重与排序，并在关键数据缺失时明确降级。
- 最后更新时间：2026-07-14 09:11（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. 审核任务通过 `GET /api/v1/review-tasks/{reviewTaskId}` 加载真实详情，不再查询 pending 列表。
2. 页面只展示后端返回且通过一致性校验的审核状态和审核意见，不根据 Diff 或日志自行推断状态。
3. 选择新对象时原子清理旧审核任务、Diff、追踪日志和提示状态，并使用请求版本隔离迟到响应。
4. 统一人物、关系、来源、支派、宗族及审核任务的日志关联参数。
5. 对对象日志和审核任务日志按业务键去重、按时间与稳定键排序，并明确处理缺失时间。
6. 关键详情、Diff、宗族或对象关联缺失/冲突时展示“追踪信息不完整”及实际覆盖范围。
7. 增加已通过、已驳回、待审核、无审核任务、连续切换、跨宗族和错配 Diff 等前端模型测试。

### 非目标

- 不建设业务对象搜索。
- 不新增统一聚合接口。
- 不修改数据库结构。
- 不重构页面信息架构或视觉体系。
- 不通过新的前端猜测逻辑弥补后端数据缺失。

### 兼容与回滚

- 公共 HTTP 路径、后端 DTO 和权限语义保持不变。
- 复用 #118 已生成的 `ReviewTaskDetailResponse`、`ReviewDiffResponse` 和日志 DTO。
- 新增纯前端追踪模型文件承载关联、信任校验、去重、排序和完整性判定；页面保留现有布局。
- 如需回滚，可回退追踪模型、页面接入、测试命令和 CI 步骤，无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现与当前追踪页面 | ✅ 已完成 | 约 10 分钟 | 确认 #117/#118 已合入，详情接口与生成 DTO 已存在 |
| 2 | 建立执行看板、分支、Draft PR 与 Issue 启动记录 | ✅ 已完成 | 约 4 分钟 | PR #141 与 Issue 启动评论已建立 |
| 3 | 提取追踪关联、清理、去重、排序与完整性模型 | ✅ 已完成 | 约 18 分钟 | `logTraceModel.js/.d.ts`，包含对象和宗族一致性校验 |
| 4 | 页面改用审核详情接口并接入追踪模型 | ✅ 已完成 | 约 20 分钟 | 移除 pending 反查，增加请求版本隔离和可信数据渲染 |
| 5 | 增加审核状态与连续切换场景测试 | ✅ 已完成 | 约 14 分钟 | 9 组测试覆盖状态、切换、去重、缺失和错配数据 |
| 6 | 执行测试、类型检查、API 检查、构建与最终 Review | ✅ 已完成 | 约 12 分钟 | test:logs、API Contract、typecheck、生产构建通过 |
| 7 | 收尾 PR、处理 Review、合入 main 并回写 Issue | 🔄 进行中 | 已累计约 4 分钟 | 正在转 Ready、核对主干和自动 Review |

## 影响模块

- `.github/workflows/backend-ci.yml`
- `frontend/genealogy-web/package.json`
- `frontend/genealogy-web/src/features/logs/LogPage.tsx`
- `frontend/genealogy-web/src/features/logs/logTraceModel.js`
- `frontend/genealogy-web/src/features/logs/logTraceModel.d.ts`
- `frontend/genealogy-web/src/features/logs/logTraceModel.test.js`

## 验证方案

```bash
cd frontend/genealogy-web
npm run test:logs
npm run typecheck
npm run api:check
npm run build
```

已验证：

- 审核详情使用真实 `task.status` 和 `task.reviewComment`；
- 页面不访问 pending 列表，也不根据 Diff 推断审核状态；
- 新对象选择清空上一对象数据，迟到请求不能覆盖新对象；
- 同一日志只出现一次，同时间按稳定键排序，缺失时间位于末尾；
- 错误任务 ID、跨宗族详情、对象冲突或 Diff 错配均不作为可信数据展示；
- 关键数据缺失时返回不完整覆盖说明，而不是“完整链路”。

## 验证结果

- ✅ Issue Delivery Governance。
- ✅ 9 组 `test:logs` 定向测试。
- ✅ API Contract 与生成文件一致性检查。
- ✅ TypeScript typecheck。
- ✅ Commercial Frontend Build / `npm run build`。
- ⚠️ Java Backend 与 PostgreSQL Startup Check 由全仓 Backend CI 执行；若失败需按实际日志区分是否为主干基线问题。

## 已知风险

- 当前页面只能从 `review_task` 类型日志直接获得 `reviewTaskId`；普通业务对象若日志没有审核任务关联信息，只展示对象日志并明确标注审核覆盖缺失，不猜测任务 ID。
- 本 Issue 仍是在前端基于现有多个接口拼装；S05 建成聚合接口后应迁移到服务端统一追踪结果。
- 不可信详情和 Diff 会被拒绝展示，但审核任务日志仍可按当前显式任务 ID加载，并在覆盖提示中说明对象关联缺失。

## 当前恢复检查点

- 当前 Issue：#119
- 当前分支：`agent/issue-119-trace-accuracy`
- 当前 Draft PR：#141
- 最后完成任务：完成追踪模型、页面接入、9 组测试与第二轮前端验证
- 当前进行中：PR Ready、自动 Review、主干同步与合入收尾
- 当前任务累计耗时：已累计约 4 分钟
- 最新 Commit：`035fa674270fa8052dcf7d4e15403ee8e89102a8`
- CI 状态：Governance、API Contract、TypeScript、test:logs 和前端构建通过
- 未解决 Review：无，待转 Ready 后检查自动 Review
- 已知阻塞：无 Issue 范围内阻塞
- 下一步最小任务：更新 PR 描述并转为 Ready，处理 Review 后 squash 合入
- 最后更新时间：2026-07-14 09:11（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 1 小时 18 分钟
- 当前收尾任务累计耗时：已累计约 4 分钟
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时
