# Issue #1033 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1033
- Draft PR：https://github.com/gyguan/genealogy/pull/1044
- 目标：将 Person 写模型、动态检索与 Dashboard 读模型从 Spring Data JPA 迁移到 MyBatis-Plus/MyBatis，保持 API、权限、隐私、审核和统计口径不变。
- 工作分支：`agent/issue-1033-person-mybatis`
- 开始时间：2026-07-30 19:08（北京时间）

## 范围

- Person Entity、Repository、Application Service 持久化调用。
- 专用 Person QueryMapper/XML 动态查询、分页、稳定排序与导出。
- Dashboard 强类型聚合和最近更新人物查询。
- PostgreSQL Identity、Nullable 更新、软删除、事务回滚、筛选与统计测试。
- 迁移清单、README 与性能规范更新。

## 非目标

- Tree 图谱专用 Person Snapshot 查询继续保留现有 QueryRepository 实现。
- 不修改数据库 Schema、OpenAPI、领域模型、权限、隐私级别或审核流程。
- 不移除全局 JPA Starter。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对 Issue、依赖、分支和现有 PR | ✅ 已完成 | #1032 已合并；无既有 #1033 分支或 PR |
| 2 | 建立分支、执行看板与 Draft PR | ✅ 已完成 | 分支与 PR #1044 已建立 |
| 3 | 迁移 Person 写模型与 Repository Adapter | ✅ 已完成 | Identity、全字段 Nullable 更新、显式软删除、批量更新和审核行锁已切换到 MyBatis |
| 4 | 迁移动态查询、分页、排序与导出 | ✅ 已完成 | 专用 QueryMapper/XML；数据与 count 共用筛选片段；排序白名单并以 id 收口 |
| 5 | 迁移 Dashboard 强类型聚合 | ✅ 已完成 | Object[] 已替换为强类型 Summary/Bucket/DailyCount/Recent read model |
| 6 | 增加 PostgreSQL 集成测试并修复 CI | 🔄 进行中 | 473 个单元测试已通过；已修复 Locale 编译和 Repository→Application 架构依赖，正在复验最终 Head |
| 7 | 更新规范、完成 Review 与收口 | ⏳ 待处理 | 待最终 CI 后同步迁移清单、README 和 PR 验收结果 |

## 已处理问题

1. 导入行重试的大小写归一化漏引入 `Locale`，导致编译失败；已补齐。
2. Repository 初版接收 Application 层 `PersonDuplicateQuery`，触发 ArchUnit 分层门禁；已改为基础参数和持久化 Criteria。
3. Tree 图谱仍需要 JPA constructor projection；新增 Tree 专用只读映射，Person 主写模型不再是 JPA Entity。
4. 审核提交的悲观锁改为明确 PostgreSQL `SELECT ... FOR UPDATE`，保持既有事务串行语义。

## 风险控制

- 全字段更新使用明确 XML SQL，避免默认策略跳过 `null`。
- 动态 SQL 的数据查询与 count 查询共享同一筛选片段。
- 排序仅接受后端枚举，所有排序以 `id` 作为唯一稳定键收口。
- 权限校验和隐私脱敏继续在既有 Application Service 边界执行。
- Tree Snapshot 不并入 Person 写 Mapper，避免扩大图谱查询风险。
- 临时补丁和辅助工作流已自清理，不进入最终 PR 文件范围。

## 恢复检查点

- 当前阶段：正式实现和架构分层修复完成，最终 Head 全量 CI 复验中。
- 最新实现 Head：`71282391b2187d7a2fd3b00efa757d0f7555f375`；本看板提交将触发可信 CI。
- 已知阻塞：无业务阻塞；本地环境不能解析 GitHub 域名，构建与 PostgreSQL 验证以 PR CI 为准。
- 下一步最小任务：读取 Backend CI、PostgreSQL Integration、Security、Member Scope、Functional E2E 结果并修复剩余问题。
