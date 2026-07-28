# Issue #834 执行记录

## 目标

验证成员授权、支派子树数据范围、修谱工作台、成员状态和权限审计的完整协作闭环。

## 核心链路

```text
候选账号注册
→ 宗族管理员授予支派子树角色
→ 协作者登录
→ 可访问授权支派及下级支派
→ 兄弟支派查询拒绝且不泄漏任务总数
→ 修谱任务与审核入口保持范围一致
→ 撤销授权后工作台访问即时失效
→ 恢复授权后复用原授权记录并重新生效
→ 停用成员后当前会话访问失效
→ 恢复成员后继续协作
→ 并发核查同一任务只生效一次
→ 已核查任务从 API 和 UI 消失
→ 权限与任务操作均可审计
```

## 覆盖用例

- FT-MEMBER-001：候选成员搜索与支派子树授权；
- FT-MEMBER-002：下级支派访问允许；
- FT-MEMBER-003：兄弟支派访问拒绝；
- FT-MEMBER-004：支派列表与工作台 total 仅包含可见子树；
- FT-MEMBER-005：最后管理员撤销/停用保护；
- FT-MEMBER-006：撤销授权后当前会话立即失效；
- FT-MEMBER-007：成员停用后当前会话立即失效；
- FT-MEMBER-008：授权、撤销、恢复与停用审计留痕；
- FT-WORKBENCH-001：工作台 UI 仅展示授权范围任务；
- FT-WORKBENCH-002：核查动作真实持久化并从列表移除；
- FT-WORKBENCH-003：并发提交与重复提交返回同一动作 ID。

## 发现与修复

### 工作台与支派范围泄漏

- 原工作台只校验有效宗族成员，未校验业务角色；
- 人物、审核任务和分页 total 未按 `branch_subtree` 裁剪；
- 支派列表拥有 `branch:view` 后会返回全宗族支派；
- 修复后工作台基于 `person:view` 数据范围，支派列表基于 `branch:view` 数据范围；
- 无有效角色、兄弟支派和撤销授权场景均拒绝访问。

### #849 撤销授权后无法恢复

- 原创建逻辑对已撤销同键授权继续 INSERT，触发数据库唯一约束并返回 500；
- 修复后复用原授权记录并通过正式更新流程重新激活；
- 恢复后 grantId 保持不变，避免重复有效授权。

### #850 工作台批量核查接口不存在

- 原前端调用不存在的 `/workbench/tasks/{taskKey}/actions`，后端返回系统 500；
- 新增 `workbench_task_action` 持久化表和真实动作 API；
- 执行动作前重新验证当前用户的数据范围和任务版本；
- 进程锁与数据库唯一约束共同保障并发幂等；
- 已核查任务在分页前过滤，API total 与 UI 同步变化；
- 动态合成任务改用稳定业务时间作为版本；
- 动作写入操作审计。

## 验证证据

### 专用成员范围链

- 验证提交：`5c46eb46275541e220159158ea337eafc910ccb5`；
- Member Branch Scope E2E Run：`30318707587`；
- PostgreSQL、Spring Boot、React/Vite、Chromium：通过；
- 专用真实 Playwright：通过；
- Artifact：`member-scope-evidence-30318707587-1`；
- Artifact digest：`sha256:d33831a3ad608478fff9a57549fdb198a94ede80fd3f8d25940129ba62c1ae54`。

### 全量回归

- Functional E2E Run：`30318707528`；
- PostgreSQL Integration：通过；
- Real Playwright：12 条全部通过；
- Artifact：`functional-test-evidence-30318707528-1`；
- Artifact digest：`sha256:be8189ba060e6b4464693e2947d044706901defe39e79feec94677d96c51f656`。

### 其他门禁

- Database Migration Governance：通过；
- API Contract：通过；
- Backend CI：通过；
- Frontend CI：通过。

## 准出结论

- [x] 宗族、支派子树和跨范围隔离正确；
- [x] 工作台任务、分页 total 与 UI 均不泄漏兄弟支派；
- [x] 最后管理员保护有效；
- [x] 撤销授权和停用成员即时影响当前会话；
- [x] 恢复授权不产生重复记录；
- [x] 并发领取/处理同一任务不重复生效；
- [x] 权限与任务操作具备真实审计记录；
- [x] 真实 UI、API、PostgreSQL 与完整回归均通过；
- [x] 满足 #834 P0 功能准出要求。
