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

### Domain Service

- 承载关系校验、支派范围、审核约束、授权不变量等领域规则。
- 规则必须可测试，不依赖 Controller 上下文。

### Repository

- 只负责数据访问和面向领域的查询接口。
- 查询语义应清晰，避免在服务层拼装大规模内存过滤。
- 列表查询必须在数据库层完成分页、权限范围和主要过滤。

---

## 3. API 与 DTO

1. API 变更先更新 `docs/api/openapi.json`。
2. 请求、响应 DTO 与实体分离。
3. 明确区分业务对象 ID，例如 `userId`、`membershipId`、`grantId`。
4. 错误码应稳定、可定位，不把堆栈或敏感内部信息返回客户端。
5. 兼容旧字段或旧枚举时，必须明确兼容窗口、迁移和废弃策略。
6. 权限、隐私和审核状态由后端最终判断，不信任前端传入的可操作状态。

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

---

## 6. 数据库与 Flyway

数据库变更必须遵循 `docs/database-development-standard.md`。

- Schema 变更必须通过 Flyway 交付，不手工依赖环境状态。
- 新增版本化迁移统一使用 `VyyyyMMddHHmmss[_NN]__action_object_detail.sql`，时间使用北京时间。
- 新版本必须大于 `main` 当前最大版本，并且在整个迁移目录中唯一。
- 迁移描述使用小写 `snake_case`，以 `create/add/alter/rename/backfill/migrate/normalize/fix/rebuild/drop` 等明确动作开头。
- 不修改、删除或重命名已经存在于基线分支或可能在共享环境执行过的版本化迁移；使用更高版本的前向补偿迁移。
- 迁移脚本必须说明锁影响、历史数据、兼容策略、验证方式和回滚或补偿方案。
- 索引应对应实际查询条件和排序，不为“可能有用”盲目添加。
- 涉及高数据量查询时，应提供 SQL 或 `EXPLAIN ANALYZE` 证据。
- 避免无条件全表读取、内存分页、N+1 和无边界递归 CTE。
- 当前历史重复 `V3` 属于独立治理问题，禁止在普通业务 PR 中随意改名或使用 `flyway repair` 掩盖。

迁移文件由 `.github/scripts/validate-flyway-migrations.py` 和 `Database Migration Governance` 工作流执行自动检查。

---

## 7. 测试要求

规则变化必须同步测试，优先覆盖：

- 领域不变量和异常路径；
- 权限与跨范围拒绝；
- 审核、自审和正式数据生效；
- 历史数据兼容与迁移；
- PostgreSQL 特有 SQL、分页和并发行为；
- Controller 契约与错误码。

禁止用删除断言、降低校验或跳过失败测试的方式让构建通过。

---

## 8. 验证命令

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

## 9. 后端完成检查

后端任务标记完成前确认：

- 分层职责没有被破坏；
- OpenAPI、DTO 和实现一致；
- 权限与数据范围在后端闭环；
- 事务覆盖完整业务不变量；
- 数据库迁移和兼容策略明确；
- 查询无明显分页、N+1 或全表风险；
- 测试和验证结果已写入 PR。