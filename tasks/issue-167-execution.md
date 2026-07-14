# Issue #167 执行看板：文化资料分页搜索、维护与详情聚合

- Issue：https://github.com/gyguan/genealogy/issues/167
- 工作分支：`agent/issue-167-culture-item-core`
- Draft PR：https://github.com/gyguan/genealogy/pull/181
- 目标：实现 `culture_item` 的后端分页搜索、草稿维护、详情聚合、基础范围保护和状态约束，形成独立可测试的文化资料核心能力。
- 最后更新时间：2026-07-14 19:08:00，北京时间

## 实现范围

- 实现文化资料 Controller、Application Service、Domain Service、Repository 查询、DTO 和 Mapper。
- 实现数据库分页搜索，支持关键词、分类、支派、状态、隐私、来源覆盖、首页精选和排序。
- 实现新增、精确详情、草稿/驳回态编辑和软删除。
- 聚合宗族、支派、创建人、来源/附件/审核计数及基础 `allowedActions`。
- 校验分类、长度、状态、支派归属、宗族一致性、乐观锁版本和页面边界。
- 新增、编辑、删除写操作日志，但不记录完整敏感正文。
- 通过前向 Flyway 补充与实际查询匹配的文化资料搜索索引。

## 非目标

- 不实现正式数据 revision/review apply、提交审核或正式归档，由 #168 完成。
- 不实现来源绑定写入、完整隐私矩阵、文化专属权限种子或追踪中心运行时接入。
- 不实现迁徙事件、文化场所和最终前端页面。
- 不迁移或双写旧 `clan.hall_name/commandery/origin_place` 字段。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置契约与现有实现，建立分支、看板和 Draft PR | ✅ 已完成 | 约 12 分钟 | 分支、执行看板、Draft PR #181 和 Issue 回写现场已建立 |
| 2 | 完成文化资料 DTO、领域校验、数据库分页查询与必要索引 | ✅ 已完成 | 约 35 分钟 | DTO、Domain Service、Specification、分页/排序/来源覆盖查询和索引迁移已实现 |
| 3 | 实现 Application Service、Controller、详情聚合、基础 allowedActions 和安全日志 | ✅ 已完成 | 约 35 分钟 | CRUD、范围保护、批量聚合、基础权限动作和脱敏日志已实现 |
| 4 | 补充 Repository、Service、Controller 与 OpenAPI 一致性测试 | ✅ 已完成 | 约 25 分钟 | Domain、Service、PostgreSQL 集成和 runtime contract 测试已提交 |
| 5 | 执行 API、后端、PostgreSQL、迁移治理和五轴 Review，满足门禁后合入 main | 🔄 进行中 | 已累计约 8 分钟 | 最新 head 所有 CI 通过、无未解决 Review；分支落后 main 4 个非文化提交，待 GitHub 合并检查 |

## 影响模块

- 后端：`com.genealogy.culture`、`source` 只读聚合、`review` 只读计数、`operationlog`。
- API：实现既有 culture-item 契约，并通过 `openapi.culture.zz-runtime.json` 补齐运行时响应约束。
- 数据库：新增 `V20260714210100__add_culture_item_search_indexes.sql`。
- 前端：不修改页面；仅同步生成的 culture DTO 类型。

## 验证结果

- Database Migration Governance：✅ 通过。
- API Contract：✅ 通过。
- Frontend CI / TypeScript / Build：✅ 通过。
- Backend CI：✅ 通过。
- PostgreSQL/Flyway 启动与 Repository 集成测试：✅ 通过。
- PR #181 Review：✅ 无未解决线程。

## Issue 验收核对

- [x] 分页、筛选、排序和总数由数据库层完成并有 PostgreSQL 集成测试。
- [x] 草稿和驳回态可直接维护；`official/pending_review/archived` 不能直接覆盖或删除。
- [x] 跨宗族支派请求和超出支派写范围的请求被拒绝。
- [x] 精确 ID 查询执行宗族成员、支派范围、隐私和软删除保护。
- [x] 列表 DTO 不包含完整正文；详情不返回存储路径、checksum 等内部字段。
- [x] 列表通过批量查询聚合来源、附件和审核计数，避免逐行 N+1。
- [x] pageSize 上限、关键词长度和排序白名单有效。
- [x] OpenAPI、生成 DTO、Controller 和实现一致，后端测试通过。

## 已知风险与边界

- **权限兼容**：#168 才引入文化专属权限。本 Issue 暂用宗族成员校验及现有 source 读写权限/支派范围做基础保护。
- **隐私边界**：完整隐私和敏感级别策略由 #168 完成；当前至少禁止非成员、跨宗族、跨支派和 `private/sealed` 精确查询绕过。
- **正式数据红线**：`official/pending_review/archived` 不允许普通 PUT/DELETE 直接修改。
- **日志最小化**：只记录标题、分类、状态、支派及摘要长度等安全快照，不写完整正文。
- **分支同步**：当前分支落后 `main` 4 个导入/前端清理提交；与文化业务文件无直接重叠，仅 `scripts/api/check-api-contract.sh` 需要 GitHub 合并检查。

## 五轴 Review

- Correctness：✅ CRUD、分页、范围、状态、版本和聚合行为有测试覆盖。
- Readability：✅ Controller、Application、Domain、Mapper、Repository 和 DTO 职责分离。
- Architecture：✅ 正式审核和完整权限保持在 #168，没有在本 Issue 绕过 revision/review。
- Security：✅ 精确 ID、支派范围、隐私和日志最小披露有基础保护。
- Performance：✅ 数据库分页、组合索引、批量聚合，无内存截取和明显 N+1。

## 当前恢复检查点

- 当前 Issue：#167
- 当前分支：`agent/issue-167-culture-item-core`
- Draft PR：#181
- 最新 Commit：由本次看板更新提交确定
- 最后完成任务：实现、测试和完整 CI 验证
- 当前进行中：转 Ready，检查与最新 `main` 的可合并性并合入
- 当前任务累计耗时：已累计约 8 分钟
- CI 状态：Database、API、Frontend、Backend 全部通过
- 未解决 Review：无
- 已知阻塞：分支落后 `main` 4 个非文化提交，等待 GitHub mergeability 计算
- 下一步最小任务：更新 PR 描述、标记 Ready，并根据 GitHub 合并结果处理潜在冲突
- 最后更新时间：2026-07-14 19:08:00，北京时间
