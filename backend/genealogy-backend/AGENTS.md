# Backend AI Engineering Rules

适用于 `backend/genealogy-backend/` 及其子目录，继承根 `AGENTS.md`。本文件只承载后端可执行规则；复杂度阈值、拆分案例和解释见 `docs/experience/backend-code-maintainability.md`。

## 1. 技术与分层

技术基线：Java 17、Spring Boot 3、PostgreSQL、Spring Data JPA + MyBatis-Plus/MyBatis 分阶段迁移、Flyway、OpenAPI、模块化单体。

标准调用链：

```text
Controller → Application Service → Domain Policy / State Machine
           → Repository / QueryRepository → Assembler / DTO
```

- Controller 只做协议适配、参数校验和应用服务调用，不直接访问 Repository。
- Application Service 负责用例编排、事务、权限范围和跨模块协作。
- Domain Policy / State Machine 承载业务判断和状态迁移，应能脱离 Spring 与数据库测试。
- 普通 Repository 负责清晰 CRUD；复杂查询、Projection 和批次策略进入 QueryRepository。
- Assembler 负责模型转换；Mapper 不查询数据库、不执行业务决策。
- MyBatis `BaseMapper`、Wrapper、`Page/IPage` 只能存在于持久化适配层，不得进入 Controller、Application 或 Domain。
- 双栈期间 MyBatis Mapper 必须位于模块 `repository.mybatis` 包并显式使用 `@Mapper`；JPA 与 MyBatis 共用 Spring 管理的 DataSource 和事务边界。
- 持久化迁移规则与当前清单见 `docs/backend/persistence-framework-migration.md`。

## 2. API、类型与正式数据

- API 变更先更新 `docs/api/openapi.json`。
- DTO 与实体分离，错误码稳定，不返回内部堆栈或敏感信息。
- 参数超过 5 个或存在组合约束时使用 Query、Command 或 Context。
- 裸字符串在 Controller 边界解析，应用和领域层使用枚举或值对象。
- 正式数据统一遵循 `revision → review_task → approve/reject → apply`。
- 提交人与审核人隔离；高风险操作记录操作人、对象、原因和变更摘要。

## 3. 权限与隐私

- 先校验功能权限，再校验宗族、支派和对象范围。
- 支派子树范围通过统一查询或 Policy 实现，不在多个服务复制。
- 分页总数和筛选结果在权限过滤后计算。
- 在世人员、联系方式、来源材料和附件默认最小披露。
- 停用、撤销和降权操作保护最后管理员等安全不变量。
- 请求内重复使用的身份、角色、权限和范围通过不可变 Context 显式传递。

## 4. 数据库、查询与性能

权威规范：

- 数据库与 Flyway：`docs/backend/database-and-flyway.md`
- 环境配置：`docs/backend/environment-configuration.md`
- 持久化框架迁移：`docs/backend/persistence-framework-migration.md`
- Repository 查询性能：`docs/backend/repository-query-performance.md`
- 日志、审计与可观测性：`docs/backend/observability-and-audit.md`

强制要求：

- Schema 变更通过 Flyway 前向迁移，不修改已执行迁移。
- 禁止 `flyway repair`、手工改 history 表或关闭迁移掩盖冲突。
- 高频查询必须有分页、硬上限或批次限制，并以唯一字段结束稳定排序。
- 避免无条件全表读取、内存分页、N+1、循环 Repository 调用和无界递归。
- 大 ID 集合遵循统一分批策略。
- 高数据量查询提供 SQL、执行计划或相应集成测试证据。
- MyBatis-Plus 默认更新策略不得被当成清空 nullable 字段的保证；需要清空字段时使用明确 XML SQL 或受测试保护的专用更新方法。
- 双栈迁移不得改变软删除、审核生效、悲观锁、批次原子性和操作日志语义。

## 5. 测试与可理解性

测试分层：

- Domain Policy / State Machine：纯单元测试；
- Application Service：事务、协作和错误分类；
- Repository：PostgreSQL 集成测试；
- Controller/API：契约、参数和稳定错误码；
- 关键用户链路：真实 E2E。

持久化迁移还必须验证 Mapper/XML 加载、Identity 回填、显式 null 更新、稳定分页、删除语义以及 JPA/MyBatis 跨框架事务整体回滚。

测试名称应描述业务条件和期望结果。不得删除断言或跳过失败测试。

复杂 Tree、Import、Review、Member、Source 等模块维护局部 README，记录入口、调用链、不变量、权限、事务、查询边界和必跑测试。

## 6. 验证

```bash
cd backend/genealogy-backend
mvn test
mvn verify
```

聚焦验证可以先执行，但交付时必须说明实际执行范围、未执行项及已知基线问题。

## 7. 完成检查

- 分层和模块边界未被破坏；
- API、错误码和兼容策略明确；
- 权限、隐私、审核和审计语义完整；
- 数据库迁移和查询边界符合专项规范；
- 必要测试和文档已同步；
- 相关验证结果已写入 PR。
