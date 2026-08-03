# 当前已实现模型测试数据工厂

本目录只面向 **当前 `main` 分支已经落地的数据库模型和业务代码**，不引用领域模型 V2 或其他尚未实现的 Issue。

## 目标

- 清理当前数据库中的业务数据，同时保留 Flyway 历史、系统角色、权限字典和现有登录账号；
- 重新生成可读、确定性的全场景测试数据；
- 生成可参数化扩展的压测数据；
- 对组织树、人物、关系、来源、审核、权限、文化和迁徙数据执行一致性校验。

## 文件

```text
00_reset_current_business_data.sql   清理当前业务数据
10_seed_current_scenarios.sql        预置全场景演示/E2E 数据
20_generate_current_performance.sql  生成参数化压测数据
30_verify_current_data.sql           数据完整性和规模校验
run-current-data-factory.sh          一键执行入口
```

## 支持的当前场景

场景数据基于当前表结构，覆盖：

- 多宗族隔离；
- 多层支派树、直属支派和支派负责人；
- 五代人物、同名不同人、未知父母、在世/已故、软删除和多隐私级别；
- 生物亲子、配偶/继配、入继、出嗣、承祧、兼祧、嗣子、无嗣状态；
- 宗族与支派字辈方案；
- 谱书、地方志、墓碑、访谈、照片等来源与附件元数据；
- 来源绑定人物、关系、支派、字辈和文化对象；
- 人物出生、死亡、婚配、迁居等时间线；
- 草稿、待审核、正式、驳回、归档等数据状态；
- 审核通过、待审核和驳回记录；
- 人物/关系导入成功、部分失败和错误行；
- 宗族级、支派级、只读和审核权限；
- 文化资料、迁徙事件、文化场所、敏感数据和首页精选；
- 操作日志和可追踪对象。

## 安全约束

清理脚本必须显式传入：

```text
confirm_reset=RESET_CURRENT_GENEALOGY_DATA
```

数据库名包含 `prod`、`prd` 或 `production` 时脚本会直接失败。清理脚本不会删除：

- `flyway_schema_history`；
- `app_role`；
- `app_permission`；
- `app_role_permission`；
- `app_user`。

其余当前 schema 下的普通表会统一 `TRUNCATE ... RESTART IDENTITY CASCADE`。因此该脚本只应在本地、开发、测试或性能环境使用。

## 一键初始化

在仓库根目录执行：

```bash
DATABASE_URL='postgresql://genealogy:genealogy@localhost:5432/genealogy' \
  bash database/test-data/current/run-current-data-factory.sh scenario
```

仅生成压测数据：

```bash
DATABASE_URL='postgresql://genealogy:genealogy@localhost:5432/genealogy' \
PERF_CLANS=10 \
PERSONS_PER_CLAN=10000 \
BRANCHES_PER_CLAN=50 \
CHILDREN_PER_PARENT=3 \
  bash database/test-data/current/run-current-data-factory.sh performance
```

清理后同时生成场景与压测数据：

```bash
DATABASE_URL='postgresql://genealogy:genealogy@localhost:5432/genealogy' \
PERF_CLANS=2 \
PERSONS_PER_CLAN=5000 \
  bash database/test-data/current/run-current-data-factory.sh all
```

## 推荐压测档位

| 档位 | 宗族数 | 每宗族人物 | 每宗族支派 | 预计人物总量 | 用途 |
|---|---:|---:|---:|---:|---|
| SMALL | 2 | 5,000 | 30 | 10,000 | 本地回归、接口基线 |
| MEDIUM | 10 | 10,000 | 50 | 100,000 | 常规并发和查询压测 |
| LARGE | 20 | 50,000 | 100 | 1,000,000 | 容量与图谱专项压测 |

压测脚本使用 PostgreSQL `generate_series` 和集合化写入，不执行逐人物 PL/pgSQL 循环。生成后会执行 `ANALYZE`，便于查询计划接近真实压测状态。

## 账号

场景脚本复用 Flyway 已预置的账号：

```text
demo_admin
demo_branch_admin
demo_editor
demo_reviewer
demo_viewer
```

脚本启动时会验证这些账号和所需角色存在；缺失时立即失败，不会生成半套数据。
