# 持久化框架分阶段迁移

## 目标与阶段

后端正在从 Spring Data JPA 分阶段迁移到 MyBatis-Plus/MyBatis。迁移期间保留 PostgreSQL 与 Flyway，不改变公共 API、数据库 Schema、权限和领域状态语义。

当前阶段（Issue #1036）：

- Spring Data JPA 与 MyBatis-Plus 双栈继续共存；
- Clan、Generation、Person、Member、Review、Source、Branch、Relationship 与 Tree 目标仓储已迁移；
- Branch 递归查询继续使用 PostgreSQL `WITH RECURSIVE`，并增加循环脏数据保护；
- Tree Person/Relationship 直接映射最小不可变 Snapshot，不再使用 EntityManager/JPQL 或 Tree JPA Entity；
- #1037 负责 Import/Export、剩余仓储和最终 JPA/Hibernate 移除。

## 固定边界

标准调用关系保持不变：

```text
Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → MyBatis Mapper / JPA Repository
  → PostgreSQL
```

强制要求：

1. Controller、Application、Domain 不直接依赖 `BaseMapper`、Wrapper、MyBatis-Plus `Page` 或 `IPage`。
2. MyBatis Mapper 放在模块的 `repository.mybatis` 包并显式标记 `@Mapper`。
3. Repository 对外暴露业务可理解、框架无关的方法；复杂查询进入独立 QueryRepository/QueryMapper。
4. MyBatis-Plus 只扫描显式 `@Mapper`，避免双栈期间误扫描 Spring Data Repository。
5. 双栈复用 Spring Boot 管理的同一 DataSource 和事务管理器；跨框架写入必须有 PostgreSQL 回滚测试。
6. 关系写入必须通过 Repository 持久化边界执行 `RelationshipWritePolicy`，不得重新依赖生命周期监听器。

## Schema 与 Flyway

- Flyway 始终是唯一 Schema 变更入口。
- 不启用 MyBatis-Plus 自动建表或改表能力。
- 双栈阶段保留 `spring.jpa.hibernate.ddl-auto=validate`，用于仍由 JPA 管理的对象。
- 已迁移对象由 Mapper XML 加载、PostgreSQL Integration 和真实 CRUD 行为验证。
- #1036 没有新增或修改 Flyway 迁移，可通过代码回滚恢复原实现。

## 实体和字段映射

- 表使用 `@TableName`，PostgreSQL `bigserial` 主键使用 `@TableId(type = IdType.AUTO)`。
- 默认启用 `map-underscore-to-camel-case`，特殊字段才增加显式 `@TableField`。
- Boolean、Enum、JSON/JSONB、数组和自定义值对象必须通过专项集成测试验证。
- PostgreSQL 原生 `uuid` 统一通过 `PostgreSqlUuidTypeHandler` 绑定和读取。
- 时间和操作人字段仍由既有应用服务显式设置，不引入隐藏业务语义的全局自动填充。

## Nullable 更新

MyBatis-Plus 默认字段策略可能跳过 `null`。迁移后的 Repository 必须区分未修改、显式清空为 `null` 和更新为空字符串。

Clan、Generation、Person、Member、Review、Source、Branch 与 Relationship 的可空快照字段使用明确 XML 更新 SQL。Review JSONB 显式使用 PostgreSQL 类型转换；Member 外键、Source 描述、Branch 父节点和 Relationship 描述均可通过显式更新清空。应用层不得假设 `updateById` 能清空字段。

## 删除语义

- 不启用全局 `@TableLogic`。
- 原来物理删除的简单主数据继续物理删除。
- Person、Relationship、Source Attachment 等原有逻辑删除对象继续由明确 `deleted_at` 条件控制。
- 不允许因为框架切换改变审核、草稿删除、审计和恢复规则。

## 分页、排序与递归

- Repository 边界保持框架无关分页类型或既有 Spring `Pageable` 兼容接口。
- 动态检索的数据查询与 count 查询共享筛选条件；权限范围在 SQL 中先过滤再统计。
- Branch 子树继续使用 PostgreSQL `WITH RECURSIVE`，以访问路径数组阻断循环；clan 条件同时约束锚点和递归项。
- Branch 多根输入和 Tree ID 输入统一执行空集合保护、去重和 500 条分批。
- Tree 人物排序为 `generation_no, person_code, id`；关系按端点组合后以 `id` 收口。
- Tree 分批结果先全局去重、排序，再切片，保持 `maxNodes + 1`、`maxEdges + 1` 截断与 Warning 语义。
- 集合内关系采用 from/to 双批次组合，避免 501 等边界遗漏跨批次关系。

## 批量写入

- 有明确小规模边界的 Repository Adapter 可逐条写入并复用外层事务，以保证 Identity 回填和整体回滚。
- Person 既有快照批量更新使用固定 500 条分片。
- Tree 只读，不新增正式数据修改能力。
- 大规模 Import/Export 不得复用逐条 Adapter；由 #1037 使用专用 MyBatis Batch、固定批次和明确事务边界。
- 禁止在无界循环中调用 Mapper。

## 当前迁移清单

| 模块 | 状态 | 持久化实现 | 说明 |
|---|---|---|---|
| Clan | 已迁移 | BaseMapper + XML 全字段更新 + Repository Adapter | Identity、显式 null、稳定分页 |
| Generation Scheme / Word | 已迁移 | BaseMapper + XML + Repository Adapter | 顺序、唯一约束和事务原子性 |
| Person 写模型 / 检索 / Dashboard | 已迁移 | BaseMapper + QueryMapper/XML + 强类型 Record | 软删除、批量更新、count 与导出口径一致 |
| Member / Role / Grant | 已迁移 | BaseMapper + QueryMapper/XML + Repository Adapter | 权限先过滤后 count，成员锁兼容 |
| Review / Revision / Quality | 已迁移 | BaseMapper + JSONB 更新 + QueryMapper/XML | UUID、`FOR UPDATE`、竞争决策与回滚 |
| Source / Binding / Attachment | 已迁移 | BaseMapper + QueryMapper/XML + Repository Adapter | 检索、证据聚合、附件和 Nullable 兼容 |
| Branch | 已迁移 | BaseMapper + Repository Adapter + 递归 Mapper XML | clan 隔离、多根去重、500 分批和循环保护 |
| Relationship | 已迁移 | BaseMapper + Repository Adapter + `RelationshipWritePolicy` | 所有写入口统一规范化/校验，移除 JPA Listener |
| Tree Person / Relationship | 已迁移 | 专用 QueryMapper/XML + 不可变 Snapshot | 最小字段、500 分批、跨批次边、全局稳定排序 |
| Import / Export 与其他模块 | 待迁移 | Spring Data JPA / 混合实现 | 由 #1037 迁移并最终移除 JPA/Hibernate |

## 必跑验证

```bash
cd backend/genealogy-backend
mvn test
mvn verify
```

数据库和关键链路还必须通过：

- PostgreSQL 16 + Flyway 启动及 Mapper/XML 全量加载；
- Identity、Nullable、JSONB、UUID、软删除和事务回滚；
- Member 权限范围和行锁；Review 并发决策；Source 证据聚合；
- Branch 递归、自身祖先、跨 clan、多根、空集合、大集合与循环脏数据；
- Relationship 类型/分类不匹配、方向查询和统一写策略；
- Tree 499/500/501 分批、跨批次边、稳定排序、去重和截断契约；
- Backend CI、Security、Member Scope、PostgreSQL Integration 与真实 E2E。
