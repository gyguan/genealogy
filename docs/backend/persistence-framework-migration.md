# 持久化框架分阶段迁移

## 目标与阶段

后端正在从 Spring Data JPA 分阶段迁移到 MyBatis-Plus/MyBatis。迁移期间保留 PostgreSQL 与 Flyway，不改变公共 API、数据库 Schema、权限和领域状态语义。

当前阶段（Issue #1033）：

- Spring Data JPA 与 MyBatis-Plus 双栈共存；
- Clan、Generation Scheme、Generation Word、Person 写模型与业务查询已迁移为 MyBatis-Plus/MyBatis 实现；
- Tree 专用 Person Snapshot 暂时使用独立只读 JPA 映射，其他未迁移模块继续使用原有 JPA Repository；
- 后续 Member/Review/Source、Branch/Relationship/Tree、Import/Export 依次迁移；
- 最终阶段才删除 JPA/Hibernate 依赖和配置。

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
5. 两套框架复用 Spring Boot 管理的同一 DataSource 和事务管理器；跨框架写入必须有 PostgreSQL 回滚测试。

## Schema 与 Flyway

- Flyway 始终是唯一 Schema 变更入口。
- 不启用 MyBatis-Plus 自动建表或改表能力。
- 双栈阶段保留 `spring.jpa.hibernate.ddl-auto=validate`，用于仍由 JPA 管理的实体。
- 已迁移对象的表字段映射由 Mapper XML 加载测试、PostgreSQL Integration 和真实 CRUD 行为验证。
- 本阶段没有新增或修改 Flyway 迁移，整体 PR 可以通过代码回滚恢复原实现。

## 实体和字段映射

- 表使用 `@TableName`，PostgreSQL `bigserial` 主键使用 `@TableId(type = IdType.AUTO)`。
- 默认启用 `map-underscore-to-camel-case`，只有特殊字段才增加显式 `@TableField`。
- Boolean、Enum、JSON/JSONB、数组和自定义值对象必须通过专项集成测试验证；复杂类型需要统一 TypeHandler，禁止模块私自转换。
- 时间和操作人字段仍由既有应用服务显式设置；本阶段不引入隐藏业务语义的全局自动填充。

## Nullable 更新

MyBatis-Plus 默认字段策略可能跳过 `null`。迁移后的 Repository 必须区分：

- 未修改字段；
- 显式清空为 `null`；
- 更新为空字符串。

Clan、Generation 和 Person 使用 XML `updateAllById` 执行完整快照替换，允许显式写入 `null`。Person 批量状态更新通过固定 500 条分片的 PostgreSQL `UPDATE ... FROM (VALUES ...)` 完成，并复用外层事务。应用层不得假设 `updateById` 能清空字段。

## 删除语义

- 本阶段不启用全局 `@TableLogic`。
- 原来物理删除的简单主数据继续物理删除。
- Person 继续通过 `deleted_at` 与 `updated_at` 显式执行软删除，并由所有列表、检索、重复检测和 Dashboard SQL 排除已删除记录。
- 不允许因为框架切换改变审核、草稿删除、审计和恢复规则。

## 分页与排序

Repository 边界使用：

- `PageQuery`：一页起始的页码与正整数页大小；
- `PageResult<T>`：只包含不可变记录集合和总数。

MyBatis-Plus `Page` 仅存在于 Repository 内部。Person 动态检索的数据查询与 count 查询共享同一筛选片段，导出复用相同筛选条件；排序只接受后端白名单，并以 `id` 作为唯一稳定键收口。

## 批量写入

- Clan/Generation 的当前集合规模有明确业务边界，`saveAll` 按调用顺序逐条写入并复用外层 Spring 事务，以保证 Identity 回填和整体回滚。
- Person 新增逐条执行以获取 Identity；既有 Person 快照批量更新按 500 条分片，单个业务事务整体提交或回滚。
- 大规模导入后续仍应使用专用 MyBatis Batch、固定批次和明确提交边界。
- 禁止在无界循环中调用 Mapper。

## 当前迁移清单

| 模块 | 状态 | 持久化实现 | 说明 |
|---|---|---|---|
| Clan | 已迁移 | MyBatis-Plus BaseMapper + XML 全字段更新 + Repository Adapter | 支持 Identity、显式 null、稳定分页 |
| Generation Scheme | 已迁移 | MyBatis-Plus BaseMapper + XML 全字段更新 + Repository Adapter | 保持审核快照兼容 |
| Generation Word | 已迁移 | MyBatis-Plus BaseMapper + XML 全字段更新 + Repository Adapter | 保持顺序、唯一约束和事务原子性 |
| Person 写模型 | 已迁移 | MyBatis-Plus BaseMapper + XML 全字段/批量更新 + Repository Adapter | Identity、显式 null、软删除与事务语义保持不变 |
| Person 检索与 Dashboard | 已迁移 | 专用 QueryMapper/XML + 强类型 Record | count/列表/导出共享筛选；Dashboard 聚合不再返回 `Object[]` |
| Tree Person Snapshot | 过渡保留 | 独立 `@Immutable` 只读 JPA Entity + QueryRepository | 待 #1036 迁移，不再依赖 Person 写模型实体 |
| 其他模块 | 待迁移 | Spring Data JPA | 按 #1034、#1036、#1037 继续迁移 |

## 必跑验证

```bash
cd backend/genealogy-backend
mvn test
mvn verify
```

数据库相关变更还必须通过：

- PostgreSQL 16 + Flyway 启动；
- Mapper/XML 全量加载；
- Identity 主键回填；
- 显式 Nullable 更新；
- 软删除、重复检测、分页总数与稳定排序；
- Person Dashboard 强类型统计口径；
- MyBatis 与 JPA 跨框架事务整体回滚；
- 受影响安全、权限和真实 E2E 门禁。
