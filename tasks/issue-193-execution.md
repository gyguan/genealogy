# Issue #193 执行看板：后端安全可见性投影与最小披露

- Issue：https://github.com/gyguan/genealogy/issues/193
- 所属 EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置契约：Issue #192 / `docs/api/openapi.tree.json` / `docs/12-lineage-tree-contract.md`
- 工作分支：`agent/issue-193-tree-visibility`
- Draft PR：https://github.com/gyguan/genealogy/pull/204
- 目标：在后端建立统一的 Tree 查询可见性投影，使人物中心、祖先、后代和支派世系遵循功能权限、支派范围、人物隐私、关系隐私、数据状态和最小披露规则。
- 最后更新时间：2026-07-14 20:40（北京时间）

## 实现范围

- 新增 Tree 统一只读可见性策略，复用 Person/Relationship 既有查询权限与隐私判断，不复制一套宽松规则。
- 基于 #192 契约实现人物中心统一入口，并保持现有兼容路径可用。
- 正式视图仅返回 `official` 人物和关系；编辑视图同时要求人物和关系编辑/审核权限，并继续受支派范围约束。
- 对支派范围外对象完全裁剪；对范围内的在世、`private`、`relatives_only`、`sealed` 对象执行隐藏或安全占位。
- 关联边仅在两端节点和关系本身都可安全披露时返回；根节点和结果数量只基于过滤后数据。
- 支派世系只投影请求支派范围内且调用人实际有权查看的人物与关系。
- 增加正向授权、跨支派、在世人员、private、relatives-only、sealed、人物/关系状态过滤和脱敏字段测试。

## 非目标

- 不实现 #194 的环检测、节点/边去重和容量截断。
- 不实现 #195 的批量 SQL 与数据库性能优化。
- 不修改人物、关系、成员权限或审核流程的写入规则。
- 不修改数据库 schema、Flyway、前端页面或图布局。
- 不删除历史 Tree 兼容入口。

## 方案、影响与回滚

- 方案：`TreeVisibilityApplicationService` 统一编排功能权限、支派范围、人物状态、人物隐私、关系状态和关系隐私；TreeApplicationService 只使用安全投影后的节点和边组装结果。
- 复用：人物字段通过 `PersonApplicationService.get` 的既有隐私投影读取；敏感关系通过 `RelationshipApplicationService.get` 的既有规则复核，并额外要求关系两端支派范围均可访问。
- 权限：沿用现有 `person:view`、`relationship:view`、`person:update/delete`、`relationship:update`、`review_task:approve` 权限及 RBAC 支派数据范围，不新增权限种子。
- 兼容：保留现有 `/family`、`/ancestors`、`/descendants`、支派世系路径；新增 #192 人物中心统一入口。旧前端依赖的基础响应字段保持兼容。
- 影响：核心影响后端 Tree 和聚焦测试；Person/Relationship 现有实现、数据库和写入流程未修改。
- 回滚：恢复 Tree Controller/Application Service并删除新增 Tree 可见性策略及测试即可；不涉及数据回滚。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置契约和现有实现，建立分支、看板与 Draft PR | ✅ 已完成 | 约 8 分钟 | 检查点 `82285f3`；Draft PR #204 和 Issue 启动评论已建立 |
| 2 | 建立 Tree 统一可见性策略并复用人物/关系既有安全规则 | ✅ 已完成 | 约 5 分钟 | 新增 `TreeVisibilityApplicationService`，覆盖状态、支派、在世人员和敏感隐私投影 |
| 3 | 将人物中心、祖先、后代和支派世系接入统一安全投影 | ✅ 已完成 | 约 6 分钟 | 新增统一人物入口；所有兼容入口和支派查询均传入 actor、dataView、relationScopes 并过滤节点/边 |
| 4 | 补充聚焦测试并执行后端、契约、CI 与五轴 Review，满足门禁后合入 main | 🔄 进行中 | 已累计约 3 分钟 | 17 个 Tree 聚焦测试已提交；Backend CI #2223、API Contract #923 通过，待最终 Review 和合入 |

## 影响模块

- 后端：`tree/application`、`tree/controller`。
- API：实现 #192 既有路径、参数和查询上限，不扩大契约。
- 测试：Tree 可见性策略和 Tree Application Service。
- Person/Relationship、数据库、Flyway、前端页面：不修改。

## 验证结果

- Backend CI run #2223：✅ 通过，执行后端完整 Maven 测试。
- API Contract run #923：✅ 通过，Controller 路径、参数与契约生成检查无漂移。
- Tree 聚焦测试：✅ 17 个用例，覆盖授权、跨支派、在世、private、relatives-only、sealed、编辑视图、人物/关系状态和边裁剪。
- PR diff：✅ 当前仅 6 个文件，均属于 Tree 实现、测试或任务看板。
- Review：✅ 暂无未解决 Review 线程。

## Issue 验收核对

- [x] 无权查看目标人物或支派时，不返回节点、边或隐藏数量。
- [x] 普通成员不能通过 Tree 绕过 Person/Relationship 既有隐私规则。
- [x] `official` 视图只接受 `official` 人物和关系。
- [x] `editing` 视图要求人物和关系编辑/审核权限，并逐节点保持支派范围。
- [x] 占位节点使用通用文本，`personId`、性别、世次、字辈和支派字段均为空，且不返回关联边。
- [x] 人物中心、家庭、祖先、后代和支派世系使用同一可见性策略。
- [x] 正向授权、跨支派、在世、private、relatives-only、sealed 和状态过滤均有聚焦测试。
- [x] Tree 模块仍为只读，没有写操作或审核生效逻辑。

## 已知风险与边界

- 本 Issue 仍使用现有遍历和查询方式；循环、重复边、节点/边容量实际截断由 #194 完成。
- `maxNodes/maxEdges` 已按 #192 契约接收并校验硬上限，但本 Issue 不实施截断逻辑。
- 支派查询仍先加载候选数据后执行安全投影；数据库级范围过滤和 N+1 优化由 #195 完成。
- #192 的完整新响应 `meta/warnings` 由 #194 结合遍历治理落地；本 Issue 保持旧页面可用的基础响应字段。

## 五轴 Review

- Correctness：✅ 所有入口统一通过安全投影；状态、关系范围和参数上限有实现与测试。
- Readability：✅ Controller 只做协议适配；可见性策略与图组装职责分离。
- Architecture：✅ Tree 保持只读，并复用 Person/Relationship 现有规则而非复制弱化逻辑。
- Security：✅ 过滤先于节点/边组装；敏感占位不带技术 ID 或谱系字段；被拒绝关系不会留下孤立泄露节点。
- Performance：⚠️ 本 Issue 未扩大无界上限；既有内存查询和逐节点校验明确移交 #194/#195。

## 当前恢复检查点

- 当前 Issue：#193
- 当前分支：`agent/issue-193-tree-visibility`
- Draft PR：#204
- 最新 Commit：本次验证检查点更新提交
- 最后完成任务：安全投影实现、17 个聚焦测试、Backend CI 和 API Contract 验证
- 当前进行中：最终 diff/Review 检查、更新 PR 描述并按门禁合入 main
- 当前任务累计耗时：已累计约 3 分钟
- CI 状态：Backend CI #2223、API Contract #923 均通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：确认最新看板提交的 CI，更新 PR 描述、转 Ready 并使用最新 head SHA squash 合入
- 最后更新时间：2026-07-14 20:40（北京时间）
