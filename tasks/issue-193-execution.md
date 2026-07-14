# Issue #193 执行看板：后端安全可见性投影与最小披露

- Issue：https://github.com/gyguan/genealogy/issues/193
- 所属 EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置契约：Issue #192 / `docs/api/openapi.tree.json` / `docs/12-lineage-tree-contract.md`
- 工作分支：`agent/issue-193-tree-visibility`
- Draft PR：https://github.com/gyguan/genealogy/pull/204
- 目标：在后端建立统一的 Tree 查询可见性投影，使人物中心、祖先、后代和支派世系遵循功能权限、支派范围、人物隐私、关系隐私、数据状态和最小披露规则。
- 最后更新时间：2026-07-14 20:20（北京时间）

## 实现范围

- 抽取可复用的人物与关系只读可见性策略，供 Person、Relationship 和 Tree 查询共用。
- 基于 #192 契约增加人物中心统一授权入口，并保持现有兼容路径可用。
- 正式视图仅返回 `official` 人物和关系；编辑视图需要明确编辑或审核权限，并继续受支派范围约束。
- 对支派范围外对象完全裁剪；对范围内的 `private`、`relatives_only`、`sealed` 等对象执行隐藏或安全占位。
- 关联边仅在两端节点和关系本身都可安全披露时返回；统计、根节点和错误不泄露被过滤对象。
- 支派世系只在请求支派与调用方授权支派子树的交集中投影。
- 增加正向授权、跨支派、在世人员、private、sealed、状态过滤和脱敏字段测试。

## 非目标

- 不实现 #194 的环检测、节点/边去重和容量截断。
- 不实现 #195 的批量 SQL 与数据库性能优化。
- 不修改人物、关系、成员权限或审核流程的写入规则。
- 不修改数据库 schema、Flyway、前端页面或图布局。
- 不删除历史 Tree 兼容入口。

## 方案、影响与回滚

- 方案：新增只读可见性策略服务，统一人物隐私和敏感关系判定；TreeApplicationService 接收调用人、数据视图和关系范围，先安全投影再组装返回。
- 权限：沿用现有 `person:view`、`relationship:view`、`person:update/delete`、`relationship:update`、`review_task:approve` 权限及 RBAC 支派数据范围，不新增权限种子。
- 兼容：保留现有 `/family`、`/ancestors`、`/descendants`、支派世系路径；新增 #192 人物中心统一入口。旧前端依赖的基础字段在本 Issue 保持兼容，不提前实施前端拓扑改造。
- 影响：核心影响后端 Tree、Person/Relationship 可见性策略和聚焦测试；不产生数据迁移。
- 回滚：恢复 Tree Controller/Application Service、Person/Relationship 调用点并删除新增只读策略及测试即可；数据与写入流程不受影响。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置契约和现有实现，建立分支、看板与 Draft PR | ✅ 已完成 | 约 8 分钟 | 检查点 `82285f3`；Draft PR #204 和 Issue 启动评论已建立 |
| 2 | 抽取人物与关系共享可见性策略并保持现有接口行为 | 🔄 进行中 | 已累计 <1 分钟 | 正在实现共享人物隐私与敏感关系策略 |
| 3 | 将人物中心、祖先、后代和支派世系接入统一安全投影 | ⏳ 待处理 | — |  |
| 4 | 补充聚焦测试并执行后端、契约、CI 与五轴 Review，满足门禁后合入 main | ⏳ 待处理 | — |  |

## 影响模块

- 后端：`auth`、`person`、`relationship`、`tree`。
- API：实现 #192 既有 Tree 路径和参数，不扩大契约。
- 测试：共享可见性策略、Tree Application Service、Tree Controller 聚焦测试。
- 数据库、Flyway、前端页面：不涉及。

## 验证方案

- 聚焦测试：共享人物/关系可见性与 Tree 投影测试。
- `cd backend/genealogy-backend && mvn test`
- `cd frontend/genealogy-web && npm run api:check`（仅在后端路由/DTO 与契约一致性需要验证时执行）。
- GitHub Actions：Backend CI、API Contract（如触发）。
- 五轴 Review：重点检查 Correctness、Security、Architecture，同时检查 Readability、Performance 边界。

## 已知风险与边界

- 现有 Person/Relationship 私有方法存在规则重复，抽取时必须保持既有接口兼容，不能借机放宽权限。
- `private/relatives_only/sealed` 的占位节点若会暴露敏感关系，必须同时裁剪关联边。
- 本 Issue 仍使用现有遍历和查询方式，循环、重复和大数据量风险由 #194、#195 处理。
- #192 的完整 meta/warnings 和容量治理由后续 Issue 落地；本 Issue 聚焦权限与最小披露。

## 当前恢复检查点

- 当前 Issue：#193
- 当前分支：`agent/issue-193-tree-visibility`
- Draft PR：#204
- 最新 Commit：本次启动检查点更新提交
- 最后完成任务：七道启动门禁、分支、任务文件、Draft PR 和 Issue 回写
- 当前进行中：抽取人物与关系共享可见性策略
- 当前任务累计耗时：已累计 <1 分钟
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：新增共享可见性策略服务并补充聚焦单元测试
- 最后更新时间：2026-07-14 20:20（北京时间）
