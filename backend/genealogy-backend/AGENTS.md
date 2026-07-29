# Backend AI Engineering Rules

本文件适用于 `backend/genealogy-backend/` 及其子目录，继承仓库根 `AGENTS.md`。

根文件中的 P0、P1 优先级高于本文件；本文件只细化后端 P2 工程规则。发生冲突时，以根规则、Issue 验收标准和已批准 Spec 为准。

---

## 1. 技术基线

- Java 17
- Spring Boot 3.x
- PostgreSQL
- Spring Data JPA；仅在现有模式不足时引入 MyBatis / MyBatis Plus
- Flyway
- springdoc-openapi
- 模块化单体

新增依赖、替换持久化框架或调整模块边界前，必须先说明必要性和影响。

---

## 2. 分层职责

### Controller

- 只负责协议适配、参数校验、鉴权入口和调用应用服务。
- 不编排复杂业务流程，不直接操作 Repository。
- 不把实体对象直接作为公共 API 契约。

### Application Service

- 负责编排用例、事务、权限范围和跨领域协作。
- 明确事务边界；写操作默认在应用服务层开启事务。
- 不复制 Domain Service 已承载的业务规则。

### Domain Service / Policy / State Machine

- 承载关系校验、支派范围、审核约束、授权不变量和状态迁移等领域规则。
- 规则必须可测试，不依赖 Controller 上下文、Spring Bean 或 Repository。
- Application 层负责装载事实，Domain 层负责根据事实作出决策。

### Repository / QueryRepository

- 只负责数据访问和面向领域的查询接口。
- 普通 Repository 保持清晰 CRUD 职责；复杂查询、Projection 和批次策略进入专用 QueryRepository。
- 查询语义应清晰，避免在服务层拼装大规模内存过滤。
- 列表查询必须在数据库层完成分页、权限范围和主要过滤。

### Assembler / Mapper

- Assembler 负责领域模型、中间模型和 API DTO 的转换。
- Mapper 只负责简单字段映射，不查询数据库、不执行业务决策、不修改状态。

---

## 3. API 与 DTO

1. API 变更先更新 `docs/api/openapi.json`。
2. 请求、响应 DTO 与实体分离。
3. 明确区分业务对象 ID，例如 `userId`、`membershipId`、`grantId`。
4. 错误码应稳定、可定位，不把堆栈或敏感内部信息返回客户端。
5. 兼容旧字段或旧枚举时，必须明确兼容窗口、迁移和废弃策略。
6. 权限、隐私和审核状态由后端最终判断，不信任前端传入的可操作状态。
7. 方法参数超过 5 个、存在组合约束或需要跨调用链转发同一组事实时，应使用类型化 Query、Command 或 Context。
8. 裸字符串只允许在 Controller/API 适配边界解析，进入应用和领域层后使用枚举或值对象。

---

## 4. 正式数据与审核

- 人物、关系、来源绑定等关键正式数据不得绕过 Review 模块直接生效。
- 审核流程统一遵循 `revision → review_task → approve/reject → apply`。
- 提交人与审核人必须隔离。
- 高风险操作应记录操作人、对象、before/after、原因和北京时间。
- 导入数据先进入批次或草稿；失败行修正和重试不得绕过审核生效路径。

---

## 5. 权限与隐私

1. 先校验功能权限，再校验宗族、支派、对象级数据范围。
2. 支派子树范围应使用统一查询或领域策略，不在多个服务复制判断。
3. 列表总数、分页和筛选必须在权限过滤之后计算。
4. 在世人员、联系方式、附件和来源材料默认最小披露。
5. 候选用户查询不得退化为全平台用户目录。
6. 停用、撤销、降权等操作必须保护最后管理员等安全不变量。
7. 权限判断优先实现为纯 Policy；不得通过捕获 Repository 或 Application 异常来隐藏授权决策。
8. 请求内重复使用的用户、宗族、角色、权限和支派范围应通过不可变 Context 显式传递或缓存。

---

## 6. 数据库与 Flyway

数据库变更必须遵循 `docs/database-development-standard.md`。

- Schema 变更必须通过 Flyway 交付，不手工依赖环境状态。
- 新增版本化迁移统一使用 `VyyyyMMddHHmmss[_NN]__action_object_detail.sql`，时间使用北京时间。
- 新版本必须大于 `main` 当前最大版本，并且在整个迁移目录中唯一。
- 迁移描述使用小写 `snake_case`，以 `create/add/alter/rename/backfill/migrate/normalize/fix/rebuild/drop` 等明确动作开头。
- 不修改、删除或重命名已经存在于基线分支或可能在共享环境执行过的唯一版本化迁移；使用更高版本的前向补偿迁移。
- 仅在独立数据库治理 Issue 中，允许将基线里已经重复、导致 Flyway 无法解析的同版本脚本收敛为一个规范基线文件；每移除一个重复文件，必须新增一个版本高于基线最大值、保留原 SQL 职责的前向迁移，并通过数据库迁移治理工作流。普通业务 PR 不得使用该例外。
- 禁止使用 `flyway repair`、手工修改 `flyway_schema_history` 或关闭迁移来掩盖版本冲突。
- 迁移脚本必须说明锁影响、历史数据、兼容策略、验证方式和回滚或补偿方案。
- 索引应对应实际查询条件和排序，不为“可能有用”盲目添加。
- 涉及高数据量查询时，应提供 SQL 或 `EXPLAIN ANALYZE` 证据。
- 避免无条件全表读取、内存分页、N+1 和无边界递归 CTE。
- 高频查询必须具有分页、硬上限或明确批次限制，并以唯一字段结束稳定排序。
- 大 ID 集合遵循模块既有统一分批策略，不得引入无界 `IN` 参数集合。

迁移文件由 `.github/scripts/validate-flyway-migrations.py` 和 `Database Migration Governance` 工作流执行自动检查。

Repository 性能同时遵循 `docs/backend-repository-performance-governance.md`。

---

## 7. 测试要求

规则变化必须同步测试，优先覆盖：

- 领域不变量和异常路径；
- 权限与跨范围拒绝；
- 审核、自审和正式数据生效；
- 历史数据兼容与迁移；
- PostgreSQL 特有 SQL、分页和并发行为；
- Controller 契约与错误码。

测试名称必须描述业务条件和期望结果，例如 `shouldRejectGrantWhenTargetIsOutsideActorBranchScope`，避免 `testCreate`、`testError` 等无语义名称。

测试分层：

- Domain Policy / State Machine：纯单元测试；
- Application Service：事务编排、协作和错误分类；
- Repository：PostgreSQL 集成测试，验证 SQL、分页、排序、锁和批次语义；
- Controller/API：契约、参数和稳定错误码；
- 关键用户链路：真实 E2E。

禁止用删除断言、降低校验或跳过失败测试的方式让构建通过。

---

## 8. 代码可理解性与复杂度控制

详细经验见 `docs/ai/code-understanding-and-maintainability-standard.md`。

### 8.1 核心原则

- 一个类应只有一个主要变化原因。
- 类名、方法名和包名必须直接表达业务职责；避免 `CommonService`、`DataManager`、`Helper`、`Utils` 和过度通用的 `BaseService<T>`。
- 用例编排、领域决策、数据访问、状态迁移和 DTO 组装不得混在同一职责中。
- 关键不变量必须通过测试、ArchUnit、查询契约或模块文档固化，不能只依赖隐式调用顺序。
- 避免多个私有方法通过类字段共享可变状态；需要共享时使用显式 Context 或 Accumulator。

### 8.2 复杂度参考阈值

以下是 Review 和拆分信号，不是机械失败条件：

| 对象 | 建议范围 | 超出后的检查 |
|---|---:|---|
| Controller | 100～250 行 | 是否混入业务编排、事务或 Repository |
| Application Service | 150～400 行 | 是否应按 Command、Query 或业务场景拆分 |
| Domain Policy / State Machine | 50～250 行 | 是否包含多个独立规则集合 |
| Repository 实现 | 100～350 行 | 是否应按查询场景或读模型拆分 |
| 单个方法 | 10～50 行 | 是否可以提取有业务意义的步骤方法 |
| 方法参数 | 不超过 5 个 | 是否应引入 Query、Command 或 Context |
| 构造器依赖 | 不超过 6～8 个 | 是否承担了过多职责 |

偏离阈值时，PR 必须说明职责为何仍然单一，以及测试、门禁或文档如何控制风险。

### 8.3 拆分信号

出现以下情况应优先评估拆分：

- 同一类同时处理协议、权限、事务、查询、状态迁移和 DTO 组装；
- 单个方法存在多个独立失败语义或补偿策略；
- 修改一个规则需要编辑多个不相邻代码块；
- 需要读取大半个模块才能理解一个业务入口；
- 简单业务规则只能通过完整 Spring 上下文测试；
- 构造器依赖持续增长，或出现多个通用 Helper 协同完成一个用例。

纯算法、显式映射表和生成代码可以合理偏离文件行数阈值，但输入、输出、状态边界和不变量必须清晰。

### 8.4 模块导航

Tree、Import、Review、Member、Source 等复杂模块新增或发生结构性变化时，应维护简短模块 README，至少说明：

1. 模块职责和非目标；
2. 主要入口和调用链；
3. 关键 Query、Command、Context；
4. 权限、事务和状态机所在位置；
5. 关键不变量；
6. Repository 和数据范围；
7. 必跑测试与常见风险。

文档只记录稳定结构和不变量，不复制会快速失效的逐行实现。

---

## 9. 验证命令

默认：

```bash
cd backend/genealogy-backend
mvn test
```

可以先运行聚焦测试，但交付时必须说明：

- 实际执行的测试；
- 未执行全量测试的原因；
- 与本次改动无关的历史基线失败；
- 本次变更的独立验证证据。

---

## 10. 后端完成检查

后端任务标记完成前确认：

- 分层职责没有被破坏；
- 类和方法职责可从命名与调用关系直接识别；
- 超过复杂度参考阈值的代码已拆分，或在 PR 中说明合理性和补偿措施；
- 多参数和共享事实已通过 Query、Command、Context 或 Accumulator 显式建模；
- OpenAPI、DTO 和实现一致；
- 权限与数据范围在后端闭环；
- 事务覆盖完整业务不变量；
- 数据库迁移和兼容策略明确；
- 查询无明显分页、N+1、无界集合或全表风险；
- 关键不变量具有测试、架构门禁或查询契约；
- 复杂模块导航文档与结构性变更保持一致；
- 测试和验证结果已写入 PR。