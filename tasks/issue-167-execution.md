# Issue #167 执行看板：文化资料分页搜索、维护与详情聚合

- Issue：https://github.com/gyguan/genealogy/issues/167
- 工作分支：`agent/issue-167-culture-item-core`
- Draft PR：https://github.com/gyguan/genealogy/pull/181
- 目标：实现 `culture_item` 的后端分页搜索、草稿维护、详情聚合、基础范围保护和状态约束，形成独立可测试的文化资料核心能力。
- 最后更新时间：2026-07-14 17:49:00，北京时间

## 实现范围

- 实现文化资料 Controller、Application Service、Domain Service、Repository 查询、DTO 和 Mapper。
- 实现数据库分页搜索，支持关键词、分类、支派、状态、隐私、来源覆盖、首页精选和排序。
- 实现新增、精确详情、草稿/驳回态编辑和软删除。
- 聚合宗族、支派、创建人、来源/附件/审核计数及基础 `allowedActions`。
- 校验分类、长度、状态、支派归属、宗族一致性、乐观锁版本和页面边界。
- 新增、编辑、删除写操作日志，但不记录完整敏感正文。
- 必要时通过新的前向 Flyway 补充与实际查询匹配的索引。

## 非目标

- 不实现正式数据 revision/review apply、提交审核或正式归档，由 #168 完成。
- 不实现来源绑定写入、完整隐私矩阵、文化专属权限种子或追踪中心运行时接入。
- 不实现迁徙事件、文化场所和最终前端页面。
- 不迁移或双写旧 `clan.hall_name/commandery/origin_place` 字段。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置契约与现有实现，建立分支、看板和 Draft PR | ✅ 已完成 | 约 12 分钟 | 分支、执行看板、Draft PR #181 和 Issue 回写现场已建立；临时 note 已清理 |
| 2 | 完成文化资料 DTO、领域校验、数据库分页查询与必要索引 | 🔄 进行中 | 暂无 | 正在读取 branch/source/review/operationlog 聚合接口并确定查询实现 |
| 3 | 实现 Application Service、Controller、详情聚合、基础 allowedActions 和安全日志 | ⏳ 待处理 | — |  |
| 4 | 补充 Repository、Service、Controller 与 OpenAPI 一致性测试 | ⏳ 待处理 | — |  |
| 5 | 执行 API、后端、PostgreSQL、迁移治理和五轴 Review，满足门禁后合入 main | ⏳ 待处理 | — |  |

## 影响模块

- 后端：`com.genealogy.culture`、`source` 只读聚合、`review` 只读计数、`operationlog`。
- API：实现既有 `docs/api/openapi.culture.json` 中 culture-item 契约；仅在发现契约缺口时做增量修正。
- 数据库：优先使用 #166 表和索引；若关键词或组合查询需要补强，仅新增更高版本索引迁移。
- 前端：暂不修改页面；若契约 schema 调整，按生成器同步类型。

## 验证方案

- Repository 组合筛选、数据库分页、排序白名单、总数和来源覆盖测试。
- Service 草稿/驳回态维护、正式/待审核拒绝、跨宗族支派拒绝、精确 ID 范围保护和版本冲突测试。
- 列表不返回完整正文、日志不包含正文、详情不返回存储路径等敏感内部字段。
- `mvn test`。
- API Contract / TypeScript 生成一致性检查。
- PostgreSQL/Flyway 启动和 Database Migration Governance（如新增迁移）。
- 最终 `main...branch` diff 与 Correctness、Readability、Architecture、Security、Performance 五轴 Review。

## 已知风险与缓解

- **权限边界**：#168 才新增文化专属权限。本 Issue 仅使用有效宗族成员、现有编辑角色与支派写范围形成基础保护，并在 PR 明确临时兼容边界。
- **隐私边界**：完整隐私与敏感级别矩阵在 #168。本 Issue 至少阻止非成员、跨宗族、跨支派和精确 ID 绕过，并对 `private/sealed` 最小披露。
- **查询性能**：禁止内存分页；使用 Specification/数据库子查询和批量计数，避免列表 N+1。
- **正文泄露**：列表 DTO 不包含 `content`，操作日志只记录标题、分类、状态和字段变更摘要。
- **正式数据红线**：`official/pending_review/archived` 不允许普通 PUT/DELETE 直接修改。

## 当前恢复检查点

- 当前 Issue：#167
- 当前分支：`agent/issue-167-culture-item-core`
- Draft PR：#181
- 最新 Commit：由本次看板更新提交确定
- 最后完成任务：完成 Issue 启动门禁和临时文件清理
- 当前进行中：DTO、领域校验、数据库查询和索引设计
- 当前任务累计耗时：暂无
- CI 状态：治理提交已触发，尚未作为业务验证依据
- 未解决 Review：无
- 已知阻塞：本地无 `gh`，通过 GitHub Connector 提交，CI 作为构建与数据库验证事实依据
- 下一步最小任务：读取来源绑定、附件、审核任务与用户聚合查询，定义 DTO 和批量计数接口
- 最后更新时间：2026-07-14 17:49:00，北京时间
