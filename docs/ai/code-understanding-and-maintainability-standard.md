# 代码可理解性与可维护性经验规范

本文总结人工开发、代码评审和 AI Coding Agent 在长期维护中的共同经验。目标不是机械追求小文件，而是让代码具备更强的**可定位、可推理、可修改、可验证和可追踪性**。

本文是经验解释文档；强制性后端规则以 `backend/genealogy-backend/AGENTS.md` 为准。

## 1. 核心原则

1. 一个类应只有一个主要变化原因。
2. 目录、包名、类名和方法名应直接表达业务职责。
3. 业务规则应显式建模，不依赖散落字符串、隐式调用顺序或共享可变字段。
4. 用例编排、领域决策、数据访问和 DTO 组装必须分离。
5. 复杂度不仅由代码行数决定，还包括依赖数量、状态数量、分支数量和影响范围。
6. 关键不变量必须由测试、架构门禁或查询契约固化，不能只存在于开发者记忆中。

## 2. 复杂度参考阈值

以下是 Review 和拆分信号，不是机械失败条件：

| 对象 | 建议范围 | 超出后的检查 |
|---|---:|---|
| Controller | 100～250 行 | 是否混入业务编排、事务或 Repository |
| Application Service | 150～400 行 | 是否应按 Command、Query 或业务场景拆分 |
| Domain Policy / State Machine | 50～250 行 | 是否包含多个独立规则集合 |
| Repository 实现 | 100～350 行 | 是否应按查询场景或读模型拆分 |
| 单个方法 | 10～50 行 | 是否可以提取有业务含义的步骤方法 |
| 方法参数 | 不超过 5 个 | 是否应引入 Query、Command 或 Context |
| 构造器依赖 | 不超过 6～8 个 | 是否承担了过多职责 |

出现以下任一情况时，应优先评估拆分：

- 单个类同时处理协议、权限、事务、查询、状态迁移和 DTO 组装；
- 单个方法包含多个独立失败语义或补偿策略；
- 多个私有方法共同修改一组类字段；
- 修改一个规则需要同时编辑多个不相邻代码块；
- 需要读取大半个模块才能理解一个业务入口；
- 测试只能通过完整 Spring 上下文验证一个简单业务判断。

允许保留较长文件的典型情况：

- 纯算法实现且输入、输出和状态边界明确；
- 显式映射表、协议定义或生成代码；
- 拆分会制造大量无语义的转发类。

偏离阈值时，应在 PR 中说明职责为什么仍然单一，以及如何通过测试和文档控制风险。

## 3. 命名与职责导航

优先使用能够直接表达职责的名称：

- `Controller`：API 协议边界；
- `ApplicationService`：用例编排和事务；
- `Policy`：纯业务决策；
- `StateMachine`：状态迁移；
- `QueryRepository`：复杂查询和读模型；
- `Assembler`：领域/中间模型到 API DTO 的转换；
- `Mapper`：简单字段映射；
- `Validator`：输入、配置或环境校验；
- `Metrics`：指标记录；
- `Properties`：配置绑定。

避免缺少业务语义的名称，例如 `CommonService`、`DataManager`、`Helper`、`Utils`、`GenericProcessor` 和过度通用的 `BaseService<T>`。

## 4. Query、Command 与 Context

当方法参数超过 5 个、参数具有组合约束，或调用链需要反复转发同一组事实时，应使用类型化对象：

- Query：只读意图，例如 `PersonLineageQuery`、`PersonDuplicateQuery`；
- Command：状态变更意图，例如 `CreatePersonCommand`、`MemberGrantCommand`；
- Context：一次请求或一次算法执行共享的只读事实，例如 `ActorContext`；
- Accumulator：显式承载算法过程状态，例如 `TreeGraphAccumulator`。

Query/Command 应在构造或边界层完成合法值、默认值和组合约束校验。不得在深层服务中反复解释裸字符串和散参数。

## 5. 显式业务流程

Application Service 的入口方法应呈现业务步骤，而不是实现细节。推荐结构：

```text
解析输入 → 装载事实 → 领域决策 → 执行持久化 → 提交后动作 → 组装结果
```

事务属于 Application 层；纯业务不变量属于 Domain Policy/State Machine；查询和锁语义属于 Repository；DTO 转换属于 Assembler/Mapper。

避免多个方法通过类字段隐式共享执行状态。需要共享状态时，应使用显式 Context 或 Accumulator，并从入口创建、沿调用链传递、最终转换为结果。

## 6. 领域规则与状态机

以下逻辑优先实现为不依赖 Spring 和 Repository 的纯规则：

- 权限与数据范围决策；
- 状态迁移；
- 关系分类；
- 重复风险评分；
- 查询限额与截断规则；
- 导入行错误分类；
- 审核结果判定。

Application 层负责加载事实和事务，Domain 层只接收事实并返回决策。不得把领域不变量隐藏在 Repository 调用顺序或异常捕获中。

## 7. Repository 可理解性

Repository 方法和查询应显式体现：

- 宗族、支派或对象范围；
- 是否排除软删除；
- 是否分页或有硬上限；
- 稳定唯一排序键；
- 返回完整 Entity 还是字段级 Projection/Read Model；
- 大集合是否遵循统一分批策略。

禁止无界 `findAll()`、内存分页、循环 Repository 查询和典型 N+1。能够在数据库完成的过滤、排序和截断不得放到无界内存中执行。

详细规则同时遵循 `docs/backend-repository-performance-governance.md` 和 `docs/database-development-standard.md`。

## 8. 关键不变量显式化

复杂模块应在模块 README、`AGENTS.md`、代码注释或测试名称中记录不能被破坏的规则。

示例：

### Tree

- 查询只读，不修改正式数据；
- 大 ID 集合按统一批次处理；
- 结果必须具有确定性唯一排序；
- 权限、隐私和状态过滤发生在输出前；
- 深度、节点和边截断的 `hasMore`/Warning 语义稳定。

### Member

- 不能撤销最后一个宗族管理员；
- 支派管理员不能越过授权范围；
- Application 加载事实，Domain Policy 作出授权决策。

### Import

- 行级业务错误记录后继续；
- 基础设施或事务提交失败整批回滚；
- 父任务必须在子批次事务开始前可见；
- 导入数据不得绕过审核直接进入正式库。

## 9. 测试作为规则索引

测试名称应描述业务条件和期望结果，例如：

```text
shouldRejectGrantWhenTargetIsOutsideActorBranchScope
shouldKeepProcessingWhenOneImportRowFailsValidation
shouldRollbackBatchWhenRepositoryCommitFails
shouldReturnTruncationWarningWhenNodeLimitIsReached
```

禁止使用缺少语义的 `testCreate`、`testError`、`testStatus`。

测试层次建议：

- Domain Policy / State Machine：纯单元测试，覆盖正常路径、边界和拒绝路径；
- Application Service：验证事务编排、协作和错误分类；
- Repository：PostgreSQL 集成测试，验证 SQL、分页、排序、锁和批次语义；
- Controller/API：契约、参数和稳定错误码；
- 关键用户链路：真实 E2E。

## 10. 模块导航文档

复杂模块应提供简短 README，至少包含：

1. 模块职责和非目标；
2. 主要入口和调用链；
3. 关键 Query/Command/Context；
4. 权限、事务和状态机所在位置；
5. 关键不变量；
6. Repository 和数据范围；
7. 必跑测试与常见风险。

文档应帮助开发者和 Agent 在读取少量文件后建立完整模型，不复制会快速失效的实现细节。

## 11. Issue 与 PR 输入质量

Issue 应尽量提供：背景、目标、非目标、影响模块、核心不变量、API 兼容要求、数据库变更、验收标准和必跑测试。

PR 应说明：修改内容、设计决策、兼容性、风险、数据迁移、验证结果和未解决事项。

当 Issue 缺少核心不变量或兼容边界时，应先补充定义再实施，避免只能依赖全仓搜索猜测需求。

## 12. Review 检查清单

- 类是否只有一个主要变化原因；
- 类名和方法名能否直接解释职责；
- 多参数入口是否应改为 Query/Command；
- 共享状态是否通过 Context/Accumulator 显式传递；
- 领域规则是否可脱离 Spring 和 Repository 测试；
- 事务、权限、状态和 DTO 组装是否位于正确层级；
- Repository 是否有范围、分页/硬上限、批次和唯一排序；
- 关键不变量是否有测试或门禁；
- 是否新增了通用 Helper、BaseService 或反射式隐式行为；
- 是否更新模块导航和 PR 验证说明。

最终目标不是让所有文件都变短，而是让一次修改只需要读取有限、明确的上下文，并能通过自动化证据确认没有破坏跨模块规则。