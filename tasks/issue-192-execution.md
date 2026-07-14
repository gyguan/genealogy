# Issue #192 执行看板：安全可见性与统一图查询契约

- Issue：https://github.com/gyguan/genealogy/issues/192
- 工作分支：`agent/issue-192-tree-api-contract`
- Draft PR：https://github.com/gyguan/genealogy/pull/202
- 目标：以 Contract First 方式建立统一、可扩展且安全的世系图谱查询契约，覆盖人物中心世系、祖先、后代和支派全局世系，并同步设计文档与前端生成类型。
- 最后更新时间：2026-07-14 19:53:12，北京时间

## 实现范围

- 新增 Tree 领域 OpenAPI 分片，统一现有人物和支派世系查询路径、参数、响应、错误码及兼容窗口。
- 定义正式视图/编辑视图、关系范围、深度、节点和边容量限制。
- 定义节点、边、告警和 meta 结构，覆盖脱敏、截断、环、重复边和根节点过滤语义。
- 定义血缘、婚配、宗法承嗣、状态关系以及证据、审核、异常摘要预留字段。
- 更新 API、领域模型和权限设计文档。
- 扩展前端契约生成，输出 Tree 专属类型并同步生成文件。

## 非目标

- 不实现后端 Tree 查询运行时。
- 不修改数据库结构或 Flyway。
- 不修改世系图谱页面和现有 API 调用。
- 不在 Tree 模块新增人物或关系写操作。
- 不删除现有 Tree 路径；运行时切换和旧路径废弃由后续 Issue 完成。

## 方案、影响与回滚

- 方案：沿用仓库领域 OpenAPI 分片机制，新建 `docs/api/openapi.tree.json`；由现有 loader 合并为 effective OpenAPI。
- 兼容：保留现有 `/tree/person/{personId}/family`、`/tree/ancestors`、`/tree/descendants` 和 `/tree/clans/{clanId}/branches/{branchId}/lineage` 路径，并在契约中统一参数与响应，不删除旧入口。
- 影响：本 Issue 仅影响契约、生成类型和设计文档，不改变运行时行为。
- 回滚：删除 Tree 分片及其生成类型、恢复生成脚本和文档即可；不涉及数据迁移。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 和现有契约，建立分支、看板与 Draft PR | ✅ 已完成 | 约 6 分钟 | 检查点 Commit `b4640ed`；Draft PR #202 和 Issue 启动评论已建立 |
| 2 | 定义 Tree OpenAPI 路径、参数、响应和安全语义 | 🔄 进行中 | 已累计 <1 分钟 | 正在设计 Tree 领域分片和兼容说明 |
| 3 | 更新 API、领域模型、权限文档与前端 Tree 类型生成 | ⏳ 待处理 | — |  |
| 4 | 执行契约生成、漂移检查和五轴 Review，满足门禁后合入 main | ⏳ 待处理 | — |  |

## 影响模块

- API：`docs/api/openapi.tree.json`、effective OpenAPI。
- 文档：`docs/07-api-design.md`、`docs/03-domain-model.md`、`docs/09-permission-management.md`、`docs/api/README.md`。
- 前端生成：`scripts/api/generate-frontend-client.mjs` 与 `frontend/genealogy-web/src/shared/api/generated/`。
- 后端、数据库、页面运行时：不涉及。

## 验证方案

- `cd frontend/genealogy-web && npm run api:generate`
- `cd frontend/genealogy-web && npm run api:check`
- `cd frontend/genealogy-web && npm run typecheck`
- 检查 effective OpenAPI 中 Tree operationId、参数和 Schema 引用完整性。
- 五轴 Review：Correctness、Readability、Architecture、Security、Performance。

## 已知风险与边界

- 本 Issue 定义目标契约但不修改运行时，契约与 Controller 的完整一致性由后续实现 Issue 收敛；兼容差异必须在契约描述中明确。
- 编辑视图、脱敏投影和摘要聚合仅定义语义，不代表当前后端已实现。
- 多父、多承嗣和兼祧必须保留为图/DAG 关系，不能降维为单一 parentId。

## 当前恢复检查点

- 当前 Issue：#192
- 当前分支：`agent/issue-192-tree-api-contract`
- Draft PR：#202
- 最新 Commit：本次启动检查点更新提交
- 最后完成任务：七道启动门禁、分支、任务文件、Draft PR 和 Issue 回写
- 当前进行中：定义 Tree OpenAPI 路径、参数、响应和安全语义
- 当前任务累计耗时：已累计 <1 分钟
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：本地环境不可用，验证以 GitHub Actions 和远程生成文件一致性为准
- 下一步最小任务：新增 `docs/api/openapi.tree.json`
- 最后更新时间：2026-07-14 19:53:12，北京时间
