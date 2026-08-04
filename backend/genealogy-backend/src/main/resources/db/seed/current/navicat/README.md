# Navicat 兼容执行脚本

本目录提供纯 PostgreSQL SQL 版本，不包含 `\set`、`\if`、`\echo` 或 `psql -v` 变量，可在 Navicat 的 PostgreSQL 连接中直接执行。

## 执行方式

1. 确认应用已经启动过一次，全部 Flyway 迁移已经完成。
2. 在 Navicat 中打开对应 PostgreSQL 数据库连接。
3. 使用“新建查询”打开完整 SQL 文件，执行整个文件；不要只执行随机选中的片段。
4. 按以下顺序执行：

```text
00_reset_business_data.sql
10_seed_current_scenarios.sql
30_verify_seed_data.sql
```

需要压测数据时，再执行：

```text
20_generate_performance_data.sql
30_verify_seed_data.sql
```

## 清理脚本确认

`00_reset_business_data.sql` 默认配置为：

```sql
values ('local', 'CHANGE_ME');
```

确认目标数据库是可清理的本地、开发、测试、CI 或性能环境后，将其修改为：

```sql
values ('local', 'RESET_CURRENT_GENEALOGY_DATA');
```

允许的环境值为：`local`、`dev`、`development`、`test`、`ci`、`perf`、`performance`。确认值未修改时脚本会主动报错并拒绝清理。

## 压测参数

`20_generate_performance_data.sql` 顶部包含 `NAVICAT PARAMETERS` 参数区。默认生成：

- 1,000 人；
- 50 个支派；
- 每人 2 条事件；
- 20 个来源；
- 50 条文化资料；
- 20 条迁徙；
- 100 个审核任务；
- 1,000 条操作日志。

修改参数时仍会执行原有边界校验。相同 `dataset_code` 已存在时，生成器会拒绝重复创建；可先执行清理脚本，或修改数据集编码。

## 事务与错误处理

脚本都包含显式事务。任何 SQL 出错时该事务不会正常提交。Navicat 显示错误后应先确认没有提交部分数据；如果当前会话仍处于失败事务状态，先执行：

```sql
rollback;
```

再修正问题并重新执行完整脚本。
