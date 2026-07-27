# Issue #832 执行记录

## 目标

验证审核治理从提交、Diff、驳回、修改、自动重提到批准，以及并发处理和批量部分冲突的完整闭环。

## 业务链

```text
编辑者创建人物与关键事件
→ 提交审核
→ 审核员查看任务与字段 Diff
→ 驳回并填写原因
→ 人物进入 rejected，正式数据未发布
→ 编辑者通过聚合 Revision 修改人物与事件
→ 系统自动生成新的待审任务
→ 批准前正式查询仍保持旧值
→ 独立审核员批准
→ 新人物资料与事件正式生效
→ 驳回、重提和批准 Revision 全程可追溯
```

## 并发与批量场景

- 同一任务两个并发批准请求：仅一次成功；
- 第二个请求等待任务行锁后读取终态并稳定失败；
- Revision Apply 最多执行一次；
- 已处理任务再次批准：返回明确任务状态冲突；
- 模拟批量逐任务处理时，一个已处理任务失败、一个待处理任务成功；
- 不同任务仍可并行处理；
- 每个目标对象最终状态与任务结果一致。

## 用例编号

- FT-REVIEW-003：审核 Diff 可读取；
- FT-REVIEW-004：驳回后修改并自动重提，批准后正式生效；
- FT-REVIEW-005：同一任务并发处理仅一次生效；
- FT-REVIEW-006：批量处理部分冲突不影响其他任务；
- FT-AUDIT-002：驳回和批准 Revision 均可追溯。

## 发现并修复的问题

### #842 Review Task Diff 重复路由

`GET /api/v1/review-tasks/{taskId}/diff` 同时映射到两个 Controller，运行时返回 500。已移除无权限校验的重复入口，正式接口统一走带 `review_task:view` 权限校验的 `ApprovalController`。

### #843 同一审核任务可被并发重复批准

两个并发批准请求曾同时返回 200。已增加：

- `CheckTaskRepository.findByIdForUpdate` 悲观写锁；
- approve/reject 事务化并发切面；
- 真实 PostgreSQL 双线程回归；
- HTTP 层一成一败及批量部分冲突回归。

## 最终验证

- 验证提交：`8aae789ca694492f7749ad5eec76787567707a36`；
- Functional E2E Run：`30251075526`；
- Backend CI：通过；
- Frontend CI：通过；
- API Contract：通过；
- PostgreSQL Integration：通过；
- ReviewDecisionConcurrencyPostgreSqlIT：通过；
- Real Playwright：11 条用例全部通过；
- Artifact：`functional-test-evidence-30251075526-1`；
- Artifact digest：`sha256:64d93f61aad62d9af4b4cfd52e7a20d91480462d8489fb2df9dee513eb3217d9`。

## 执行结果

- [x] 核对审核提交、Diff、驳回、批准和人物更新接口；
- [x] 明确当前批量处理由前端逐任务调用，不存在后端原子批量 API；
- [x] 新增真实 Playwright 治理闭环用例；
- [x] 增加真实 PostgreSQL 并发回归；
- [x] 执行 Functional E2E；
- [x] 分类并修复失败；
- [x] 回填最终 Run 与 Artifact；
- [x] 满足 #832 当前准出条件。
