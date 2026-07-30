# Issue #1032 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1032
- 目标：建立 Spring Data JPA 与 MyBatis-Plus 双栈底座，迁移 Clan、Generation 简单仓储，并形成后续模块可复制的持久化样板。
- 工作分支：`agent/issue-1032-mybatis-plus-foundation`
- 开始时间：2026-07-30 17:13（北京时间）

## 实现范围

- 引入 Spring Boot 3 对应的 MyBatis-Plus、分页与 Mapper XML 基础设施。
- 保持 Flyway 和 JPA/Hibernate 校验继续工作，建立同一 DataSource/事务管理器下的双栈模式。
- 增加框架无关分页模型与 MyBatis-Plus 分页适配。
- 将 Clan、Generation 的 Entity、Repository 和应用服务迁移为 MyBatis-Plus/MyBatis 实现。
- 增加 Mapper 加载、Identity 主键回填、Nullable 更新、删除和事务回滚的聚焦测试。
- 更新后端 README、数据库/Flyway 和 Repository 查询规范，记录迁移清单与样板。

## 非目标

- 不迁移 Person Specification、Tree EntityManager、成员复杂分页、递归 CTE、悲观锁和审核并发链路。
- 不移除 `spring-boot-starter-data-jpa`、Hibernate 或 `spring.jpa.*`。
- 不修改数据库 Schema、Flyway 历史迁移、OpenAPI、权限模型和业务状态语义。
- 不允许 Controller、Domain 或 Application Service 直接依赖 `BaseMapper`、Wrapper 或 MyBatis-Plus Page。

## 流程与验证强度

- Issue 类型：后端持久化底座重构 + CRUD/分页迁移。
- 流程强度：标准流程；依赖变更和双栈事务属于高风险点，保留恢复检查点与 Draft PR。
- 契约强度：无公共 API 和 Schema 变化，按轻契约执行；重点验证现有接口行为不变。
- 自动验证：编译、受影响模块单元测试、Mapper/XML 加载和静态规则。
- 手工/环境验证：PostgreSQL 16 Testcontainers、Flyway 启动、事务回滚和受影响 E2E；未实际执行时不得标记通过。
- 拆分判断：Issue 已是五阶段迁移的第一个工作包；虽然验收项较多，但底座、Clan/Generation 样板和聚焦测试必须一起验收，不再拆分新的 Issue。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、评论、分支和 PR 现场 | ✅ 已完成 | 约 7 分钟 | 无已有分支、PR 或评论；确认从最新 `main` 启动 |
| 2 | 建立任务分支、执行看板、Draft PR 与 Issue 启动评论 | 🔄 进行中 | 已累计约 2 分钟 | 已创建分支和本看板，待创建 Draft PR |
| 3 | 建立 MyBatis-Plus 双栈配置和框架无关分页适配 | ⏳ 待处理 | — |  |
| 4 | 迁移 Clan Entity、Mapper、Repository 与分页调用 | ⏳ 待处理 | — |  |
| 5 | 迁移 Generation Scheme/Word Entity、Mapper、Repository 与批量写入 | ⏳ 待处理 | — |  |
| 6 | 增加聚焦测试并执行可用验证 | ⏳ 待处理 | — |  |
| 7 | 更新迁移清单、规范、README、PR 看板并完成 Review | ⏳ 待处理 | — |  |

## 测试复用

- 优先复用仓库现有 PostgreSQL 16 Testcontainers、`@SpringBootTest`、Flyway 初始化和业务 Service 测试模式。
- Clan/Generation 的既有 DTO、Mapper 和 API 测试继续复用，不复制公共 fixture。
- 新增 Mapper 测试只覆盖 MyBatis-Plus 特有边界：Identity 回填、显式 Nullable 更新、批量插入、删除和同事务回滚。

## 影响模块

- `backend/genealogy-backend/pom.xml`
- `com.genealogy.config` / `com.genealogy.common.persistence`
- `com.genealogy.clan`
- `com.genealogy.generation`
- `src/main/resources/application.yml` 与 Mapper XML
- 后端聚焦测试和持久化相关文档

## 验证方案

1. 静态检查已迁移模块不再引用 `JpaRepository`、JPA Entity 注解和 Spring Data Page。
2. Maven 编译和受影响模块测试。
3. PostgreSQL 16 + Flyway 启动、Mapper XML 加载和 Identity 主键回填。
4. Clan 新增/查询/修改/删除/分页以及 Generation 新增/列表/替换明细/删除行为回归。
5. 同一事务内 Clan 创建与管理员成员写入失败时整体回滚。
6. Diff 范围、依赖树、敏感信息和无关文件检查。

## 已知风险与回滚

- 双栈自动配置可能产生 Mapper 扫描、事务管理器或 MyBatis/JPA Bean 冲突；通过限定 Mapper 包和复用唯一 DataSource/事务管理器控制。
- MyBatis-Plus 默认更新策略可能忽略 null；Repository 必须提供显式 Nullable 更新路径，禁止依赖默认 `updateById` 清空字段。
- Generation `saveAll` 改为逐条或批量 Mapper 写入时必须保持调用顺序和事务原子性。
- 回滚方式：本 Issue 不改 Schema，可整体回滚 PR；JPA Starter 与原有配置在本阶段继续保留。
- 当前执行环境无法直接 clone GitHub；代码通过已连接 GitHub API 提交，构建与 PostgreSQL 验证以 PR CI/可用执行结果为准。

## 恢复检查点

- 当前阶段：启动门禁和执行看板已建立，准备创建 Draft PR。
- 最后完成任务：规则、Issue 和现有现场确认。
- 当前进行中任务：创建 Draft PR 与 Issue 启动评论。
- 最新 Commit：本文件的检查点提交。
- CI 状态：尚未触发。
- 已知阻塞：无业务阻塞；本地容器无法联网 clone。
- 下一步最小任务：创建 Draft PR，并将真实 PR 链接回写 Issue。
- 最后更新时间：2026-07-30 17:22（北京时间）
