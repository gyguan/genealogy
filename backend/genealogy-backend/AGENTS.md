# Backend AI Engineering Rules

适用于 `backend/genealogy-backend/` 及其子目录，继承仓库根 `AGENTS.md`。本文件只承载后端可执行的 P2 工程规则；复杂度阈值、拆分案例和解释见 `docs/ai/code-understanding-and-maintainability-standard.md`。

## 1. 技术基线

- Java 17
- Spring Boot 3.x
- PostgreSQL
- Spring Data JPA；现有模式不足时才评估 MyBatis / MyBatis Plus
- Flyway
- springdoc-openapi
- 模块化单体

新增依赖、替换持久化框架或调整模块边界前，必须说明必要性、影响和迁移路径。

## 2. 分层职责

### Controller

- 只负责协议适配、参数校验、鉴权入口和调用 Application Service。
- 不编排复杂业务流程，不直接访问 Repository。
- 不把 Entity 直接作为公共 API 契约。

### Application Service

- 负责编排用例、事务、权限事实装载和跨领域协作。
- 写操作的事务边界默认位于 Application 层。
- 不复制 Domain Policy 或 State Machine 已承载的规则。

### Domain Policy / State Machine

- 承载领域判断、不变量和状态迁移。
- 必须可脱离 Controller、Spring 上下文和 Repository 独立测试。
- Application 装载事实，Domain 作出决策。

### Repository / QueryRepository

- 只负责数据访问和面向领域的查询。
- 复杂查询、Projection、Read Model 和批次策略进入专用 QueryRepository。
- 列表、权限范围、主要过滤、分页和排序在数据库层完成。
- 不在服务层做无边界内存过滤或循环 Repository 查询。

### Assembler / Mapper

- Assembler 负责领域模型、中间模型与 API DTO 转换。
- Mapper 只做简单字段映射，不查询数据库、不执行业务决策、不修改状态。

## 3. API、DTO 与类型

1. API 变更先更新 `docs/api/openapi.json`。
2. Request、Response DTO 与 Entity 分离。
3. ID 名称必须表达业务语义，例如 `userId`、`membershipId`、`grantId`。
4. 错误码稳定、可定位，不向客户端返回堆栈和敏感内部信息。
5. 旧字段、旧枚举兼容必须明确窗口、迁移和移除条件。
6. 权限、隐私和审核状态由后端最终判断。
7. 参数较多、存在组合约束或跨调用链复用同一组事实时，使用类型化 Query、Command 或 Context。
8. 裸字符串只在 Controller/API 边界解析；进入 Application 和 Domain 后使用枚举或值对象。

## 4. 正式数据、审核与审计

- 人物、关系、来源绑定等关键正式数据不得绕过 Review 模块直接生效。
- 审核统一遵循 `revision → review_task → approve/reject → apply`。
- 提交人与审核人必须隔离。
- 导入数据先进入批次或草稿，失败行修正和重试不得绕过审核路径。
- 高风险操作记录操作人、对象、before/after、原因和北京时间。
- 审计 best-effort 语义不得掩盖审计持续失败，相关指标和健康状态必须可观测。

## 5. 权限与隐私

1. 先校验功能权限，再校验宗族、支派和对象级范围。
2. 支派子树范围使用统一查询或 Domain Policy，不在多个服务复制。
3. 列表总数、分页和筛选在权限过滤后计算。
4. 在世人员、联系方式、附件和来源材料默认最小披露。
5. 候选用户查询不得退化为全平台目录。
6. 停用、撤销、降权等操作必须保护最后管理员等安全不变量。
7. 权限判断优先使用纯 Policy，不通过捕获异常隐藏授权决策。
8. 请求内重复使用的身份、宗族、角色、权限和支派范围通过不可变 Context 显式传递或缓存。

## 6. 数据库与 Flyway

数据库变更以 `docs/database-development-standard.md` 为唯一权威规范，Repository 性能以 `docs/backend-repository-performance-governance.md` 为权威规范。

必须遵守：

- Schema 变更通过 Flyway 前向迁移交付。
- 不修改、删除或重命名已进入共享基线的唯一版本化迁移。
- 禁止使用 `flyway repair`、手工修改 `flyway_schema_history` 或关闭迁移掩盖问题。
- 迁移说明锁影响、历史数据、兼容、验证和回滚或补偿策略。
- 索引对应真实查询与排序。
- 高频查询具备分页、硬上限或批次限制，并以唯一字段结束稳定排序。
- 大 ID 集合使用模块既有分批策略，不引入无界 `IN` 参数。
- 高数据量或性能敏感变更提供 SQL、查询计划或等价证据。

## 7. 可理解性与模块导航

强制原则：

- 一个类只有一个主要变化原因。
- 命名直接表达业务职责，避免新增 `CommonService`、`DataManager`、`Helper`、`Utils` 和通用 `BaseService<T>`。
- 用例编排、领域决策、数据访问、状态迁移和 DTO 组装分离。
- 不通过多个私有方法共同修改隐式类字段；共享过程状态使用显式 Context 或 Accumulator。
- 关键不变量由测试、ArchUnit、查询契约或模块 README 固化。
- 超过经验文档建议阈值时，在 PR 中说明职责仍然单一的依据及风险控制。

复杂模块新增或发生结构变化时，更新模块 README。模块索引见 `src/main/java/com/genealogy/README.md`。

## 8. 测试要求

规则变化必须同步测试，优先覆盖：

- Domain 不变量和异常路径；
- 权限与跨范围拒绝；
- 审核、自审和正式数据生效；
- 历史数据兼容与迁移；
- PostgreSQL 特有 SQL、分页、排序、锁和并发；
- Controller 契约和稳定错误码；
- 关键用户链路的真实 E2E。

测试名称描述业务条件和期望结果。禁止删除断言、降低校验或跳过失败测试。

测试分层：

- Domain Policy / State Machine：纯单元测试；
- Application Service：事务编排、协作和错误分类；
- Repository：PostgreSQL 集成测试；
- Controller/API：契约、参数和错误码；
- 关键用户链路：真实 E2E。

## 9. 验证与完成检查

默认执行：

```bash
cd backend/genealogy-backend
mvn test
```

交付前根据变更范围执行 `mvn verify`、PostgreSQL Integration、安全、配置、迁移和 E2E 门禁。

完成前确认：

- 分层与模块边界未被破坏；
- API、权限、隐私、审核和错误码语义稳定；
- 查询具备范围、分页或硬上限、稳定排序与 N+1 控制；
- 数据库变化满足 Flyway 规范；
- 规则变化有对应测试；
- 复杂度偏离、未执行验证和已知风险已写入 PR。
