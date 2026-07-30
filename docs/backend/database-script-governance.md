# 13. 数据库脚本治理规范

本文用于规范 Genealogy 项目 Flyway 数据库脚本的持续演进，避免重复版本、环境数据污染和生产误操作。

## 一、目录约定

```text
backend/genealogy-backend/src/main/resources/db/migration  自动执行迁移脚本
backend/genealogy-backend/src/main/resources/db/seed       手动演示/测试数据脚本
```

## 二、Flyway 命名规范

```text
V{version}__{description}.sql
```

示例：

```text
V15__fix_operation_log_detail_type.sql
V100__align_auth_member_and_seed_system_data.sql
```

要求：

- [ ] 版本号必须唯一。
- [ ] 文件名必须使用双下划线 `__`。
- [ ] 迁移脚本一旦合入并被环境执行，不允许修改历史文件。
- [ ] 后续变更必须新增版本脚本。
- [ ] 数据修复脚本必须具备幂等或可重复升级安全性。

## 三、提交前检查

提交数据库脚本前执行：

```bash
cd backend/genealogy-backend
./scripts/check-flyway-migrations.sh
```

检查内容：

```text
Flyway 文件命名是否合法
是否存在重复版本号
版本清单是否可读
```

## 四、数据分类

### 1. 可自动执行的数据

适合放入 `db/migration`：

```text
系统角色
系统权限
角色权限绑定
必要的字典数据
必要的结构修复数据
索引和约束
```

### 2. 不应自动执行的数据

适合放入 `db/seed`：

```text
演示账号
演示宗族
演示人物
演示关系
演示来源
压力测试数据
```

## 五、本地环境清理

本地验证环境可清库重建：

```bash
cd backend/genealogy-backend
docker compose down -v
docker compose up -d
mvn spring-boot:run
```

适用场景：

```text
Flyway 报 schema 非空但没有 history 表
历史本地库与当前脚本不一致
想从空库重新验证 MVP1
```

## 六、生产环境禁忌

- [ ] 不要直接清空生产 schema。
- [ ] 不要在生产执行 `db/seed/demo-data.sql`。
- [ ] 不要修改已经执行过的 Flyway 历史脚本。
- [ ] 不要跳过 Flyway 直接手动改表。
- [ ] 不要在生产开启不受控的 `baselineOnMigrate`。

## 七、数据库变更 Review Checklist

每次数据库变更至少确认：

```text
1. 是否新增了唯一 Flyway 版本号。
2. 是否和 JPA Entity 字段一致。
3. 是否需要默认值。
4. 是否需要索引。
5. 是否需要外键。
6. 是否影响已有数据。
7. 是否需要幂等处理。
8. 是否能从空库完整迁移。
9. 是否能从旧版本平滑升级。
10. 是否需要更新文档和验收脚本。
```

## 八、备份与恢复建议

生产执行迁移前：

```text
1. 备份数据库。
2. 记录当前应用版本和数据库版本。
3. 在预发环境先执行迁移。
4. 验证健康检查和关键 API。
5. 再执行生产迁移。
```

恢复策略：

```text
优先使用数据库备份恢复。
Flyway Community 不提供自动 down migration，必要时编写人工回滚脚本。
```
