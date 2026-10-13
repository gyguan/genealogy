# 数据库开发与 Flyway 规范

Genealogy 使用 PostgreSQL 16 + Flyway。自 2026-10 数据库基线收口后，数据库按**全新初始化**治理，不再支持从此前历史 Flyway 链自动升级。

适用范围：

- `backend/genealogy-backend/src/main/resources/db/migration/`
- `database/archive/legacy-flyway/`
- `backend/genealogy-backend/src/main/resources/db/seed/`
- Repository / MyBatis XML 中的 SQL
- 表、字段、索引、约束、视图、函数和基础参考数据变更

本规范继承根 `AGENTS.md` 与后端 `AGENTS.md`。

---

## 1. 当前基线

正式运行目录只有：

```text
db/migration/
├── V1__create_current_schema.sql
└── V2__seed_system_authorization.sql
```

职责：

- **V1**：当前最终表结构、序列、主外键、检查约束、索引；
- **V2**：内置角色、权限点、角色权限关系；
- 不包含演示账号、演示族谱、测试数据、性能数据；
- 不包含旧模型兼容表或历史迁移辅助表。

历史迁移已转存到：

```text
database/archive/legacy-flyway/
```

该目录只用于审计和基线重现，**永远不参与应用启动**。

旧数据库如需使用新版本，先按运维要求备份，再重新创建数据库。禁止通过 `flyway repair`、手工篡改 `flyway_schema_history` 或重新挂载 legacy archive 来伪造兼容升级。

---

## 2. 基线不可变

基线合入 main 后：

1. 禁止修改、删除、重命名 V1/V2；
2. 禁止修改、删除、重命名 `database/archive/legacy-flyway` 中的历史文件；
3. Schema 或参考数据变化必须新增更高版本迁移；
4. 禁止通过关闭 Flyway 校验、修改 history 表或 `repair` 掩盖冲突。

本次基线重置是一次性治理动作，不形成未来修改历史迁移的先例。

---

## 3. 新迁移命名

新增版本化迁移统一使用北京时间时间戳：

```text
VyyyyMMddHHmmss__action_object_detail.sql
VyyyyMMddHHmmss_NN__action_object_detail.sql
```

示例：

```text
V20261013103000__add_person_search_index.sql
V20261013104500__create_export_task.sql
V20261013104500_01__backfill_export_task_status.sql
```

要求：

- 描述使用小写 `snake_case`；
- 以明确动作开头：`create/add/alter/rename/backfill/migrate/normalize/fix/rebuild/drop/refresh`；
- 同一秒序号为 01–99；
- 合入前版本必须高于 main 当前最大版本；
- 一个迁移解决一个清晰关注点。

可重复迁移仅在确实可幂等重建的视图、函数或参考数据上使用：

```text
R__create_or_replace_xxx.sql
```

活动目录不再使用历史 `beforeEachMigrate` 回调。

---

## 4. 数据与 Seed 分层

### Flyway V2

只放应用正常启动所需的**稳定系统参考数据**，当前为 RBAC：

- `app_role`
- `app_permission`
- `app_role_permission`

不得放：

- 默认密码；
- Demo 用户；
- 登录 Session；
- 演示宗族/人物/关系；
- 性能压测数据；
- 临时修复数据。

### 显式 Seed

测试、演示和性能数据放在：

```text
backend/genealogy-backend/src/main/resources/db/seed/
```

它们不是 Flyway migration，只能由测试、专项脚本或人工明确执行。

---

## 5. Schema 设计

- PostgreSQL 对象统一小写 `snake_case`；
- 主键统一 `id`，Java 与 PostgreSQL ID 类型一致；
- 外键使用 `<object>_id`；
- 创建/更新时间使用 `created_at` / `updated_at`；
- 布尔字段使用 `is_/has_/can_`；
- 状态字段必须有稳定值域，优先 CHECK 或应用枚举；
- 日期用 `date`，时间点优先 `timestamptz`；
- 精确数值使用 `numeric`；
- JSONB 只承载真正动态结构，需要检索/关联/约束的字段必须独立建列。

约束、索引名称推荐：

```text
pk_<table>
uk_<table>__<columns>
fk_<table>__<ref_table>
ck_<table>__<rule>
idx_<table>__<columns_or_purpose>
```

---

## 6. DDL 与数据变更

新增字段、约束和索引必须考虑：

- 查询与写入成本；
- 锁与全表扫描；
- 数据量增长；
- 失败后的前向补偿；
- JPA/MyBatis 映射同步；
- API/业务状态语义。

有既有数据的环境从**当前新基线之后**开始继续遵循扩展 → 回填 → 约束 → 收口的前向迁移原则。

`UPDATE` / `DELETE` 必须有明确条件；大批量修改必须评估批次、事务、WAL 和锁。

---

## 7. 索引与查询

新增索引必须能对应真实查询入口，并说明：

- WHERE 条件；
- ORDER BY；
- 字段顺序和选择性；
- 是否覆盖稳定排序；
- 写入成本。

高频、大集合查询必须有分页/硬上限/批次策略，并以唯一字段结束稳定排序。禁止无条件全表读取、内存分页、N+1 和无界递归。

---

## 8. 验证

数据库相关 PR 最少验证：

1. `bash backend/genealogy-backend/scripts/check-flyway-migrations.sh`；
2. `.github/scripts/validate-flyway-migrations.py` 治理检查；
3. PostgreSQL 16 空库执行全部活动 migrations；
4. Spring Boot 使用空库成功启动；
5. 实体 / Mapper 映射和关键 Repository 测试；
6. 基线相关变更还必须运行 `database/bootstrap/generate-baseline.sh`，并确认生成 V1/V2 与仓库版本一致。

CI：

- `.github/workflows/database-migration-governance.yml`
- `.github/workflows/fresh-database-baseline.yml`

只验证 SQL 语法不能视为完成。

---

## 9. 回滚与恢复

从新基线之后的迁移默认采用**前向补偿**。高风险变更在 PR 中说明：

- 影响范围；
- 备份要求；
- 锁影响；
- 恢复点；
- 前向补偿方案。

应用不会自动 drop/recreate 生产数据库。旧 Flyway 历史与旧数据兼容不属于当前基线支持范围。

---

## 10. PR 检查清单

- [ ] V1/V2 未被修改；
- [ ] legacy archive 未被修改；
- [ ] 新迁移命名和版本唯一；
- [ ] Schema 与 Java/MyBatis 映射一致；
- [ ] 系统参考数据与 Demo/Test 数据分离；
- [ ] 约束、索引和查询边界合理；
- [ ] 空库 Flyway + Spring Boot 启动通过；
- [ ] 相关自动化测试通过；
- [ ] 风险与补偿方案已记录。
