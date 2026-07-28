# Issue #835 执行看板

## DEFINE

- 目标：验证正式数据在首页、人物档案、来源资料、世系图谱、宗族文化和审计追踪中的查询展示、权限与状态一致性。
- 范围：真实 PostgreSQL + Spring Boot + React/Vite + Playwright 完整业务链测试；必要时修复测试发现的业务缺陷。
- 非目标：不覆盖谱册导出与下载（#836），不覆盖会话与深层世系稳定性专项（#837）。
- 成功标准：满足 Issue #835 验收项，CI 留存可追溯证据。

## PLAN

1. 恢复现有完整业务链基线与测试数据。
2. 补充查询、分页、排序、URL 恢复和深链接测试。
3. 补充在世人物隐私、跨宗族隔离和审计异常语义测试。
4. 验证正式对象、Revision、Review Task 与审计 before/after 一致。
5. 执行 CI，修复缺陷并回归。

## BUILD

- [x] 创建远程分支与执行检查点。
- [x] 创建 Draft PR #851 并回写 Issue。
- [x] 新增 `query-culture-audit-consistency.spec.ts` 真实业务链测试。
- [x] 覆盖人物与来源创建、独立审核、正式查询和状态一致性。
- [x] 覆盖查询分页、排序、URL 刷新恢复、人物详情深链接及前进后退。
- [x] 覆盖来源、世系、文化和审计菜单真实页面入口。
- [x] 覆盖在世人物 `clan_only` 隐私策略、跨宗族人物/来源隔离及响应不泄漏。
- [x] 覆盖 Review Task、Revision、字段 before/after 及不存在任务异常语义。
- [x] 根据 CI 结果修复两处测试契约断言并完成回归。

## VERIFY

- [x] Frontend CI：Run `30321868334`，结论 `success`。
- [x] Functional E2E：Run `30321868330`，结论 `success`。
- [x] PostgreSQL 集成、Spring Boot、React/Vite、Chromium 和真实 Playwright 全链路通过。
- [x] 验证人物正式状态、来源正式可读、审核记录与 Review Task 一致。
- [x] 验证查询条件、分页、排序、URL 刷新恢复、深链接及浏览器前进后退。
- [x] 验证跨宗族查询不返回对象内容、名称或来源摘要。
- [x] 成功证据 Artifact：`functional-test-evidence-30321868330-1`，digest `sha256:ba0a6d5cab5d6578b5bdc10fb0c0eb82d83b81ddd3e602e77f9db1f654e3c31c`。

## REVIEW

- [x] 变更仅包含 #835 执行看板和真实 E2E 用例。
- [x] 权限、隐私、审核、Revision 和正式数据状态一致性已检查。
- [x] Frontend CI 与 Functional E2E 均通过。
- [x] PR #851 已具备合并条件。
- [x] Issue #835 准出证据完整。
