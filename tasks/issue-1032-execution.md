# Issue #1032 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1032
- Draft PR：https://github.com/gyguan/genealogy/pull/1038
- 目标：建立 Spring Data JPA 与 MyBatis-Plus 双栈底座，迁移 Clan、Generation 简单仓储，并形成后续模块可复制的持久化样板。
- 工作分支：`agent/issue-1032-mybatis-plus-foundation`
- 开始时间：2026-07-30 17:13（北京时间）

## 实现范围

- 引入 Spring Boot 3 对应的 MyBatis-Plus、分页与 Mapper XML 基础设施。
- 保持 Flyway 和 JPA/Hibernate 校验继续工作，建立同一 DataSource/事务管理器下的双栈模式。
- 增加框架无关分页模型与 MyBatis-Plus 分页适配。
- 将 Clan、Generation 的 Entity、Repository 和应用服务迁移为 MyBatis-Plus/MyBatis 实现。
- 将 Source/Culture 使用的 Generation 兼容 Repository 切换到 MyBatis，避免继续注册已迁移实体的 JPA Repository。
- 为迁移后的 Repository 恢复 Spring Data 等价的读写事务语义：类级只读、写方法显式事务。
- 增加 Mapper 加载、Identity 主键回填、Nullable 更新、删除、唯一约束和跨框架事务回滚测试。
- 更新 README、AGENTS、Repository 查询规范和持久化迁移清单。

## 非目标

- 不迁移 Person Specification、Tree EntityManager、成员复杂分页、递归 CTE、悲观锁和审核并发链路。
- 不移除 `spring-boot-starter-data-jpa`、Hibernate 或 `spring.jpa.*`。
- 不修改数据库 Schema、Flyway 历史迁移、OpenAPI、权限模型和业务状态语义。
- 不允许 Controller、Domain 或 Application Service 直接依赖 `BaseMapper`、Wrapper 或 MyBatis-Plus Page。

## 流程与验证强度

- Issue 类型：后端持久化底座重构 + CRUD/分页迁移。
- 流程强度：标准流程；依赖变更和双栈事务属于高风险点，保留恢复检查点与 Draft PR。
- 契约强度：无公共 API 和 Schema 变化，按轻契约执行；重点验证现有接口行为不变。
- 自动验证：编译、单元/集成测试、Mapper/XML 加载、架构、覆盖率、SpotBugs、依赖漏洞和数据库治理。
- 环境验证：PostgreSQL 16、Flyway 空库与历史库、Security、Member Scope、Functional E2E。
- 拆分判断：Issue 已是五阶段迁移的第一个工作包；底座、Clan/Generation 样板和聚焦测试必须一起验收，不再拆分。

## 任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、评论、分支和 PR 现场 | ✅ 已完成 | 约 7 分钟 | 无已有分支、PR 或评论；从 `main` 启动 |
| 2 | 建立任务分支、执行看板、Draft PR 与 Issue 启动评论 | ✅ 已完成 | 约 4 分钟 | 分支与 PR #1038 已建立 |
| 3 | 建立 MyBatis-Plus 双栈配置和框架无关分页适配 | ✅ 已完成 | 约 12 分钟 | Boot 依赖统一、限定 Mapper 扫描、PostgreSQL 分页、PageQuery/PageResult |
| 4 | 迁移 Clan Entity、Mapper、Repository 与分页调用 | ✅ 已完成 | 约 12 分钟 | Identity、显式 null、CRUD、分页、兼容方法和 Repository 事务完成 |
| 5 | 迁移 Generation Scheme/Word 与兼容仓储 | ✅ 已完成 | 约 14 分钟 | Scheme/Word、Source/Culture 兼容入口、批次与 Repository 事务完成 |
| 6 | 增加聚焦测试并执行验证 | 🔄 进行中 | 约 15 分钟 | Backend CI/漏洞扫描已有成功结果；最终 Head 全量门禁运行中 |
| 7 | 更新迁移清单、规范、README、PR 看板并完成 Review | 🔄 进行中 | 约 10 分钟 | 文档与 PR 描述已更新，待最终 CI 和差异复核 |

## 测试复用与新增

- 复用仓库现有 PostgreSQL 16 Testcontainers、`@SpringBootTest`、Flyway 初始化和 Spring 事务模式。
- Clan/Generation 既有 DTO、Assembler、API 和业务测试继续复用，不复制公共 fixture。
- 新增 `PageResultTest`，验证一页起始、参数边界、不可变记录和强类型映射。
- 新增 `MybatisPlusDualStackPostgreSqlIT`，验证：
  - PostgreSQL Identity 主键回填；
  - XML 全字段更新能够显式写入 null；
  - Clan 稳定分页和物理删除；
  - Generation 有界集合顺序、唯一约束和整体回滚；
  - JPA AppUser 与 MyBatis Clan 写入在同一 Spring 事务中整体回滚。

## 影响模块

- `backend/genealogy-backend/pom.xml`
- `com.genealogy.config` / `com.genealogy.common.persistence`
- `com.genealogy.clan`
- `com.genealogy.generation`
- `src/main/resources/application.yml` 与 Mapper XML
- 后端聚焦测试和持久化相关文档

## 已处理问题

1. MyBatis-Plus Starter 传递的 Spring Boot 版本高于项目 3.3.5 基线，导致 Maven Upper Bound 门禁失败。
   - 处理：排除 Starter 的 Boot JDBC/Autoconfigure 传递依赖，由项目 Boot BOM 统一管理。
2. 迁移后原业务仍调用 JPA `findAllById`。
   - 处理：在 Repository Adapter 中提供框架无关兼容实现。
3. Source/Culture 仍通过 `GenerationWordRepository`、`GenerationSchemeRepository` 注册 JPA Repository。
   - 处理：兼容仓储改为委托 canonical MyBatis Repository，空库启动不再要求迁移实体是 JPA managed type。
4. Repository Adapter 最初只依赖上层事务，弱于 Spring Data Repository 方法本身的事务保证。
   - 处理：Clan、Generation canonical Repository 增加类级 `readOnly` 和写方法显式 `@Transactional`，直接调用、测试夹具和跨模块调用保持原子性。

## 验证方案与当前证据

1. 已迁移模块生产代码不再引用 `JpaRepository`、JPA Entity 注解和 Spring Data Page。
2. Backend CI 已在实现 Head 上通过编译、测试、覆盖率、架构和静态分析；最终事务收口 Head 正在复验。
3. Critical Dependency Vulnerability Scan 已通过。
4. Database Migration Governance 已通过，且本 PR 没有 Schema/Flyway 文件变更。
5. Backend Configuration Governance 已确认生产 Secret 拒绝和构建成功；首次空库启动暴露 Generation 兼容 JPA Repository，已修复并复验中。
6. Security、Member Branch Scope、Functional E2E 在最终 Head 运行中。
7. 完成后复核 PR 文件范围、依赖树、敏感信息、未解决 Review Thread 和合并状态。

## 已知风险与回滚

- 双栈自动配置可能产生 Mapper 扫描、事务管理器或 MyBatis/JPA Bean 冲突；通过限定显式 `@Mapper` 和空库启动验证控制。
- MyBatis-Plus 默认更新策略可能忽略 null；Repository 使用显式 XML 全字段更新，禁止依赖默认 `updateById` 清空字段。
- Generation `saveAll` 按调用顺序逐条写入，仅适用于业务有界集合；大规模 Import 必须使用后续专用 Batch 方案。
- 回滚方式：本 Issue 不改 Schema，可整体回滚 PR；JPA Starter 与原有配置在本阶段继续保留。
- 当前执行环境无法直接 clone GitHub；代码通过已连接 GitHub API 提交，构建与 PostgreSQL 验证以 PR CI 结果为准。

## 恢复检查点

- 当前阶段：实现和文档完成，最终 Head 全量 CI 验证中。
- 最后完成任务：Clan、Generation Repository 写入事务语义与本看板收口。
- 当前进行中任务：最终 Backend Configuration、Backend CI、Security、Member Scope 和 Functional E2E 验证。
- 最新代码 Commit：`5dfaef5d36eeb5d2a3096f7f63fba647287f6131`；本看板提交为最终 Head。
- 已确认成功：Backend CI、Critical Dependency Vulnerability Scan、Database Migration Governance（前一有效 Head）。
- 已知阻塞：无业务阻塞。
- 下一步最小任务：读取最终 Head 的全部工作流结论；若成功，完成 Review、标记 PR Ready 并更新 Issue 评论。
- 最后更新时间：2026-07-30 17:56（北京时间）
