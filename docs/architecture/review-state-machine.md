# Review 显式状态机与并发一致性

## 状态与动作

审核任务和 Revision 共享同一生命周期语义：

| 当前状态 | 动作 | 目标状态 | 说明 |
|---|---|---|---|
| `pending` | `approve` | `approved` | 审批通过，随后在同一事务内执行正式数据生效 |
| `pending` | `reject` | `rejected` | 驳回并恢复或更新目标对象状态 |
| `pending` | `cancel` | `cancelled` | 为提交方取消能力预留的合法转换 |
| `approved` | `apply` | `applied` | 表达正式数据生效语义；重复 apply 视为已完成 |

未列出的转换全部拒绝，例如 `rejected -> approve`、`pending -> apply`、`applied -> apply`。

## 一致性边界

`ReviewDecisionConcurrencyAspect` 是 approve/reject 的统一入口：

1. 在外层事务中使用 `PESSIMISTIC_WRITE` 锁定审核任务；
2. 加载对应 Revision；
3. 由 `ReviewStateMachine` 校验任务与 Revision 状态一致；
4. 校验提交人和审核人隔离；
5. 执行原有 Application Service；
6. 任务、Revision、正式数据副作用和操作日志在同一事务中提交或回滚。

同一任务的两个并发审核请求会被 PostgreSQL 行锁串行化。首个请求完成后，第二个请求读取到终态并得到可定位的状态转换冲突，不会再次执行 `RevisionApplyService`。

## 幂等语义

- approve/reject 仅允许从 `pending` 发起；重复请求不会重复修改正式数据。
- apply 的领域语义为 `approved -> applied`；`applied` 可被识别为已经完成。
- 现有真实 PostgreSQL 并发测试验证同一审核任务最多调用一次正式生效逻辑。

## 审计

审核操作继续通过统一 Operation Log 记录：操作者、目标类型、目标 ID、Revision ID、任务 ID、动作结果、备注和 traceId。系统业务时区统一使用 `Asia/Shanghai`，审核时间以北京时间落库和展示。

## 扩展边界

状态机只负责状态、动作和角色隔离，不包含 targetType 分支。不同目标类型的正式数据处理继续封装在审核生效服务边界中，后续可按目标类型逐步拆分为独立 `RevisionApplyHandler`，不影响状态机契约。
