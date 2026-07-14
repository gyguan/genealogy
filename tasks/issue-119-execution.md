# Issue #119 执行看板

- Issue：[#119 修复审核链路拼装与追踪结果准确性](https://github.com/gyguan/genealogy/issues/119)
- 工作分支：`agent/issue-119-trace-accuracy`
- 目标：使用真实审核详情修复追踪链路拼装，隔离不同业务对象的状态，稳定去重与排序，并在关键数据缺失时明确降级。
- 最后更新时间：2026-07-14 09:01（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. 审核任务通过 `GET /api/v1/review-tasks/{reviewTaskId}` 加载真实详情，不再查询 pending 列表。
2. 页面只展示后端返回的审核状态和审核意见，不根据 Diff 或日志自行推断状态。
3. 选择新对象时原子清理旧审核任务、Diff、追踪日志和提示状态，防止跨对象串联。
4. 统一人物、关系、来源、支派、宗族及审核任务的日志关联参数。
5. 对对象日志和审核任务日志按业务键去重、按时间与稳定键排序，并明确处理缺失时间。
6. 关键详情、Diff 或对象标识缺失时展示“追踪信息不完整”及实际覆盖范围。
7. 增加已通过、已驳回、待审核、无审核任务和连续切换对象等前端模型测试。

### 非目标

- 不建设业务对象搜索。
- 不新增统一聚合接口。
- 不修改数据库结构。
- 不重构页面信息架构或视觉体系。
- 不通过新的前端猜测逻辑弥补后端数据缺失。

### 兼容与回滚

- 公共 HTTP 路径、后端 DTO 和权限语义保持不变。
- 复用 #118 已生成的 `ReviewTaskDetailResponse`、`ReviewDiffResponse` 和日志 DTO。
- 新增纯前端追踪模型文件承载关联、去重、排序和完整性判定；页面保留现有布局。
- 如需回滚，可回退追踪模型、页面接入和测试文件，无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现与当前追踪页面 | ✅ 已完成 | 约 10 分钟 | 确认 #117/#118 已合入，详情接口与生成 DTO 已存在 |
| 2 | 建立执行看板、分支、Draft PR 与 Issue 启动记录 | 🔄 进行中 | 已累计约 2 分钟 | 正在建立可恢复治理现场 |
| 3 | 提取追踪关联、清理、去重、排序与完整性模型 | ⏳ 待处理 | — | 纯函数实现，避免页面继续内联拼装 |
| 4 | 页面改用审核详情接口并接入追踪模型 | ⏳ 待处理 | — | 不改变现有页面信息架构 |
| 5 | 增加审核状态与连续切换场景测试 | ⏳ 待处理 | — | approved/rejected/pending/无任务/连续切换 |
| 6 | 执行测试、类型检查、API 检查、构建与最终 Review | ⏳ 待处理 | — | 验证契约无漂移及主干组合态 |
| 7 | 收尾 PR、合入 main 并回写 Issue | ⏳ 待处理 | — | 满足门禁后直接 squash 合入 |

## 影响模块

- `frontend/genealogy-web/src/features/logs/LogPage.tsx`
- `frontend/genealogy-web/src/features/logs/logTraceModel.js`
- `frontend/genealogy-web/src/features/logs/logTraceModel.d.ts`
- `frontend/genealogy-web/src/features/logs/logTraceModel.test.js`
- `frontend/genealogy-web/package.json`

## 验证方案

```bash
cd frontend/genealogy-web
npm run test:logs
npm run typecheck
npm run api:check
npm run build
```

定向断言：

- 审核详情使用真实 `task.status` 和 `task.reviewComment`；
- 不从 pending 列表反查，不根据 Diff 推断状态；
- 新对象选择结果不携带上一对象的 `reviewTaskId` 或追踪数据；
- 同一日志只出现一次，排序在相同或缺失时间下保持稳定；
- 关键数据缺失时返回不完整覆盖说明，而不是“完整链路”。

## 已知风险

- 当前页面只能从 `review_task` 类型日志直接获得 `reviewTaskId`；普通业务对象若日志没有审核任务关联信息，只能展示对象日志并明确标注审核覆盖缺失，不得猜测任务 ID。
- 详情接口返回 `task + auditRecord`，页面必须优先使用真实 task，并校验任务所属宗族和目标与当前对象是否一致。
- 仓库其他模块的 Backend CI 或数据库迁移基线问题需与本 Issue 改动区分记录。

## 当前恢复检查点

- 当前 Issue：#119
- 当前分支：`agent/issue-119-trace-accuracy`
- 当前 Draft PR：待创建
- 最后完成任务：刷新规则、需求、前置实现和现有追踪页面
- 当前进行中：建立执行看板、Draft PR 与 Issue 启动记录
- 当前任务累计耗时：已累计约 2 分钟
- 最新 Commit：由本执行检查点提交生成
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR 并回写 Issue，随后提取纯追踪模型
- 最后更新时间：2026-07-14 09:01（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 10 分钟
- 当前进行中累计耗时：已累计约 2 分钟
- 外部等待：无
