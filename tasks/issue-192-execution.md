# Issue #192 执行看板：安全可见性与统一图查询契约

- Issue：https://github.com/gyguan/genealogy/issues/192
- 工作分支：`agent/issue-192-tree-api-contract`
- Draft PR：https://github.com/gyguan/genealogy/pull/202
- 目标：以 Contract First 方式建立统一、可扩展且安全的世系图谱查询契约，覆盖人物中心世系、祖先、后代和支派全局世系，并同步设计文档与前端生成类型。
- 最后更新时间：2026-07-14 20:05:15，北京时间

## 实现范围

- 新增 Tree 领域 OpenAPI 分片，统一人物和支派世系查询路径、参数、响应、错误码及兼容窗口。
- 定义正式视图/编辑视图、关系范围、深度、节点和边容量限制。
- 定义节点、边、告警和 meta 结构，覆盖脱敏、截断、环、重复边和根节点过滤语义。
- 定义血缘、婚配、宗法承嗣、状态关系以及证据、审核、异常摘要预留字段。
- 通过专属设计文档集中同步 API、领域模型、权限隐私和兼容语义，避免继续扩展历史简表。
- 扩展前端契约生成，输出 Tree 专属操作和 DTO 类型，并纳入契约漂移检查。

## 非目标

- 不实现后端 Tree 查询运行时。
- 不修改数据库结构或 Flyway。
- 不修改世系图谱页面和现有 API 调用。
- 不在 Tree 模块新增人物或关系写操作。
- 不删除现有 Tree 路径；运行时切换和旧路径废弃由后续 Issue 完成。

## 方案、影响与回滚

- 方案：沿用仓库领域 OpenAPI 分片机制，新建 `docs/api/openapi.tree.json`；由 existing loader 合并为 effective OpenAPI，并通过 Tree 专属生成器输出稳定类型。
- 兼容：保留现有 `/tree/person/{personId}/family`、`/tree/ancestors`、`/tree/descendants` 和 `/tree/clans/{clanId}/branches/{branchId}/lineage` 路径；前三者标记为 `deprecated`，不在本 Issue 删除运行时入口。
- 影响：本 Issue 仅影响契约、生成类型、检查脚本和设计文档，不改变运行时行为。
- 回滚：删除 Tree 分片及其生成类型、恢复生成脚本和文档即可；不涉及数据迁移。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 和现有契约，建立分支、看板与 Draft PR | ✅ 已完成 | 约 6 分钟 | 检查点 Commit `b4640ed`；Draft PR #202 和 Issue 启动评论已建立 |
| 2 | 定义 Tree OpenAPI 路径、参数、响应和安全语义 | ✅ 已完成 | 约 6 分钟 | 新增 `openapi.tree.json`，包含统一入口、兼容入口、容量边界、节点/边/meta/warnings 与最小披露语义 |
| 3 | 更新 API、领域模型、权限文档与前端 Tree 类型生成 | ✅ 已完成 | 约 7 分钟 | 新增 `docs/12-lineage-tree-contract.md`，更新 API 维护说明，生成 Tree operations/DTO 类型并加入治理检查 |
| 4 | 执行契约生成、漂移检查和五轴 Review，满足门禁后合入 main | 🔄 进行中 | 已累计约 3 分钟 | API Contract 与 Frontend CI 已通过；diff 无无关文件、无未解决 Review，待更新 PR 并转 Ready/合入 |

## 影响模块

- API：`docs/api/openapi.tree.json`、effective OpenAPI。
- 文档：`docs/12-lineage-tree-contract.md`、`docs/api/README.md`。
- 前端生成：`tree-api-contract.ts`、`tree-types.ts`、统一生成入口和契约检查。
- 后端、数据库、页面运行时：不涉及。

## 验证结果

- API Contract：✅ GitHub Actions run #898 通过，覆盖生成文件漂移、Tree 契约治理和 TypeScript 检查。
- Frontend CI：✅ GitHub Actions run #161 通过，覆盖前端类型检查与生产构建。
- PR diff：✅ 12 个文件，均属于 Tree 契约、生成链路、设计文档或任务看板。
- Review：✅ 无未解决 Review 线程和已提交 Review。
- 本地验证：未执行完整仓库命令；当前协作模式无本地仓库，以 GitHub Actions 为交付证据。

## Issue 验收核对

- [x] Tree 主入口、当前运行入口和兼容窗口已明确；历史模糊支派路径不再作为有效契约。
- [x] `official` 与 `editing` 的授权条件、状态边界和后端最终判断原则已定义。
- [x] 节点和边可表达脱敏、状态、关系类别及宗法细分语义。
- [x] 响应包含深度、节点数、边数、截断、环、重复边和聚合告警元数据。
- [x] API 生成、契约漂移检查、TypeScript 和前端生产构建通过。
- [x] Tree 专属生成类型不依赖页面手写 `any` 或兼容字段猜测。
- [x] 契约保持 Tree 只读、后端鉴权、支派范围和在世人员最小披露红线。

## 已知风险与边界

- 本 Issue 定义目标契约但不修改运行时；统一入口、安全投影和新增查询参数由 #193～#195 落地。
- 编辑视图、masked 投影和证据/审核/异常摘要是目标语义，不代表当前后端已经实现。
- 兼容入口暂时保留；删除前必须完成后端、前端和 E2E 迁移。
- `openapi.tree.json` 当前采用紧凑 JSON，机器生成和治理检查可读；后续仅做格式化时不得改变契约语义。

## 五轴 Review

- Correctness：✅ 路径、参数、枚举、必需字段和容量硬上限由自动检查锁定。
- Readability：✅ 复杂权限与图模型语义集中在独立设计文档；生成产物标记为不可手工编辑。
- Architecture：✅ Tree 继续保持只读投影；领域分片与专属生成文件避免通用契约重复定义。
- Security：✅ 明确权限过滤顺序、masked 字段禁止项、过滤后计数及错误侧信道防护。
- Performance：✅ 契约定义深度/节点/边硬上限、截断原因和批量摘要边界，不允许无界全图。

## 当前恢复检查点

- 当前 Issue：#192
- 当前分支：`agent/issue-192-tree-api-contract`
- Draft PR：#202
- 最新 Commit：本次验证检查点更新提交
- 最后完成任务：契约、设计文档、生成类型与 GitHub Actions 验证
- 当前进行中：更新 PR 描述、转 Ready 并按门禁 squash 合入 main
- 当前任务累计耗时：已累计约 3 分钟
- CI 状态：API Contract、Frontend CI 均通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：同步 PR 看板后标记 Ready，并使用最新 head SHA squash 合入
- 最后更新时间：2026-07-14 20:05:15，北京时间
