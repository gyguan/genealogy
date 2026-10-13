# 当前模型数据库清理与测试数据工厂

本目录只针对 `main` 分支**当前已经实现的数据库模型**，不依赖领域模型 V2 的后续 Issue。
脚本覆盖现有的宗族、支派、人物、关系、字辈、来源、时间线、审核、导入、RBAC、文化资料、迁徙、文化场所和操作日志。

这些脚本是开发、测试和性能环境的工具，**不会作为 Flyway migration 自动执行**。本地无 Profile / `local` 启动时，应用会在数据库尚无任何宗族数据时自动执行当前场景 Seed；已有宗族数据、CI、测试和生产环境都会跳过。

## 本地自动初始化

应用默认配置：

```yaml
genealogy:
  seed:
    auto-enabled: ${GENEALOGY_SEED_AUTO_ENABLED:true}
```

满足以下条件时，后端启动完成后会自动初始化测试数据：

- 没有显式 Active Profile，或唯一 Active Profile 为 `local`；
- 当前不是 CI 环境；
- `GENEALOGY_SEED_AUTO_ENABLED` 未关闭；
- `clan` 表中还没有任何宗族数据。

只要数据库已经存在任意宗族，自动初始化就会跳过，**不会清理或覆盖现有业务数据**。生产 `prod/production` 配置强制关闭自动 Seed。

如需在本地临时关闭：

```powershell
$env:GENEALOGY_SEED_AUTO_ENABLED="false"
```

手工“清理后重建”仍使用下面的一键 SQL / PowerShell 入口。

## 本地一键初始化

### SQL / psql

在仓库根目录直接执行：

```powershell
$env:PGPASSWORD="123456"; psql -h localhost -p 5432 -U genealogy -d genealogy -v environment=local -v confirm_reset=RESET_CURRENT_GENEALOGY_DATA -f .\backend\genealogy-backend\src\main\resources\db\seed\current\init-local-test-data.sql
```

这份入口 SQL 会依次调用：

```text
00_reset_business_data.sql
        ↓
10_seed_current_scenarios.sql
        ↓
30_verify_seed_data.sql
```

### PowerShell

Windows / PowerShell 也可以执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\genealogy-backend\src\main\resources\db\seed\current\init-local-test-data.ps1 -ConfirmReset
```

脚本默认连接：`localhost:5432/genealogy`，数据库用户 `genealogy`，密码 `123456`，依次执行“安全清理 → 全场景 Seed → 完整性校验”。手工清理必须显式确认：PowerShell 传 `-ConfirmReset`，SQL/psql 传 `environment` 和 `confirm_reset`。

初始化后的 5 个演示账号统一使用测试密码 `Genealogy@123`：

| 账号 | 角色 | 主要用途 |
|---|---|---|
| `demo_admin` | 宗族管理员 | 全宗族配置、成员授权、完整业务浏览 |
| `demo_branch_admin` | 支派管理员 | 支派子树权限与隔离验证 |
| `demo_editor` | 修谱编辑 | 人物、关系、来源编辑与提交审核 |
| `demo_reviewer` | 审核员 | 待审、通过、驳回场景 |
| `demo_viewer` | 查看者 | 只读和隐私边界验证 |

场景数据包括 **2 个隔离宗族、20 个虚构人物**，并覆盖支派树、字辈、关系、来源、人物事件、审核、导入、RBAC、文化资料、迁徙、文化场所和操作日志。性能数据不在一键初始化中生成，需要时再显式执行 `20_generate_performance_data.sql`。

## 文件

| 文件 | 用途 |
|---|---|
| `00_reset_business_data.sql` | 安全清理当前全部宗族业务数据，保留 Flyway 历史、系统角色、权限字典和账号 |
| `10_seed_current_scenarios.sql` | 生成确定性的全场景演示与验收数据 |
| `20_generate_performance_data.sql` | 按参数批量生成压测宗族、人物、图关系、事件、来源、审核、文化和日志 |
| `30_verify_seed_data.sql` | 校验跨宗族、树环、关系分类、审核自审、权限范围和场景覆盖 |

## 1. 安全清理

脚本要求非生产环境标识和显式确认口令，任一条件不满足都会在清理前失败。环境参数没有默认值，必须显式传入；省略时按未知环境拒绝执行。

```bash
psql "$DATABASE_URL" \
  -v environment=local \
  -v confirm_reset=RESET_CURRENT_GENEALOGY_DATA \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/00_reset_business_data.sql
```

允许的环境值：

```text
local, dev, development, test, ci, perf, performance
```

清理策略：

- 从当前数据库元数据动态发现 `clan`、所有包含 `clan_id` 的业务表及其外键子表；
- 统一 `TRUNCATE ... RESTART IDENTITY CASCADE`，失败时事务整体回滚；
- 不删除 `flyway_schema_history`；
- 保留 `app_role`、`app_permission`、角色权限字典和 `app_user`；
- 删除确定性演示账号的旧会话、密码重置令牌，并清空瞬时登录限流计数；安全审计事件继续保留。

## 2. 生成当前模型全场景数据

```bash
psql "$DATABASE_URL" \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/10_seed_current_scenarios.sql
```

脚本创建两个完全隔离的宗族：

- `SCENARIO-ZHANG-HUAIYANG`：主验收宗族；
- `SCENARIO-LI-LONGXI`：跨宗族访问与隔离测试宗族。

主要覆盖：

- 三层支派树、兄弟支派、停用支派和始迁祖；
- 在世/已故、公开/宗族/支派/私密人物、未知日期、同名不同人；
- `parent_child`、`spouse` 及当前全部宗法关系类型；
- 宗族字辈和支派续派；
- 谱书、地方志、口述、墓碑、隐私档案、附件和来源绑定；
- 人物出生、迁徙、死亡、继嗣、兼祧和教育时间线；
- 审核通过、待审核、驳回及稳定 `trace_id`；
- 同步成功导入、异步部分失败、错误行和人工介入；
- 宗族、支派子树两种当前可授予 RBAC 范围、负责人覆盖关系及跨宗族拒绝条件；
- 文化资料、迁徙事件和文化场所的状态、隐私与敏感等级；
- 普通日志、高风险拒绝日志和审计追踪字段。

演示账号见本页“本地一键初始化”，5 个账号统一密码为 `Genealogy@123`。

## 3. 校验数据

```bash
psql "$DATABASE_URL" \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/30_verify_seed_data.sql
```

校验失败时 `psql` 返回非零退出码，适合接入 CI。校验项包括：

- 支派树无环且全部节点可从根到达；
- 父子支派、人物支派、关系端点不存在跨宗族引用；
- 除 `no_descendant` 状态关系外无人物自关联；
- 关系类型与 `relation_category` 符合当前强约束；
- 当前支持的九类关系都有验收样例，关系标签已规范化，婚配关系具有反向边；
- 来源、绑定、人物事件与宗族一致；
- 审核人不等于提交人，任务、修订与目标对象状态保持一致；
- RBAC `clan/branch_subtree` 范围符合当前角色授予策略，支派负责人授权覆盖目标支派；
- 同名不同人、在世私密人物、部分导入失败、高风险拒绝等边界数据存在；
- 已安装文化模块时，校验文化资料、迁徙和文化场所场景。

## 4. 生成压测数据

压测生成器完全使用 PostgreSQL 集合化写入和 `generate_series`，避免百万级逐行 PL/pgSQL 循环。相同参数会形成相同拓扑分布。

### SMALL：本地回归

```bash
psql "$DATABASE_URL" \
  -v dataset_code=SMALL \
  -v person_count=10000 \
  -v branch_count=100 \
  -v children_per_parent=3 \
  -v events_per_person=2 \
  -v source_count=100 \
  -v culture_item_count=500 \
  -v migration_event_count=100 \
  -v review_count=1000 \
  -v operation_log_count=10000 \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/20_generate_performance_data.sql
```

### MEDIUM：常规压测

```bash
psql "$DATABASE_URL" \
  -v dataset_code=MEDIUM \
  -v person_count=100000 \
  -v branch_count=1000 \
  -v children_per_parent=3 \
  -v events_per_person=2 \
  -v source_count=2000 \
  -v culture_item_count=10000 \
  -v migration_event_count=2000 \
  -v review_count=10000 \
  -v operation_log_count=200000 \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/20_generate_performance_data.sql
```

### LARGE：容量专项

```bash
psql "$DATABASE_URL" \
  -v dataset_code=LARGE \
  -v person_count=1000000 \
  -v branch_count=10000 \
  -v children_per_parent=3 \
  -v events_per_person=3 \
  -v source_count=20000 \
  -v culture_item_count=100000 \
  -v migration_event_count=20000 \
  -v review_count=100000 \
  -v operation_log_count=2000000 \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/20_generate_performance_data.sql
```

`LARGE` 不应进入普通 PR CI，应在独立 PostgreSQL 性能环境执行。脚本完成后会执行核心表 `ANALYZE`。

## 推荐完整流程

```bash
# 1. 应用启动或 Flyway migrate，确保数据库结构为当前 main
# 2. 安全清理
psql "$DATABASE_URL" -v environment=test -v confirm_reset=RESET_CURRENT_GENEALOGY_DATA \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/00_reset_business_data.sql

# 3. 全场景数据
psql "$DATABASE_URL" \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/10_seed_current_scenarios.sql

# 4. 数据完整性门禁
psql "$DATABASE_URL" \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/30_verify_seed_data.sql

# 5. 可选：额外生成压测宗族，再次校验
psql "$DATABASE_URL" -v dataset_code=SMALL \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/20_generate_performance_data.sql
psql "$DATABASE_URL" \
  -f backend/genealogy-backend/src/main/resources/db/seed/current/30_verify_seed_data.sql
```

## CI 验证

`.github/workflows/current-seed-data-ci.yml` 在 PostgreSQL 16 上执行：

```text
全量 Flyway → 安全清理 → 场景预置 → 完整性校验
           → 1000 人压测数据 → 再次完整性校验
```

当前领域对齐基线使用 `1,000` 人、`50` 个支派、`2,000` 条人物事件、`100` 个审核任务和 `1,000` 条操作日志，要求场景数据与压测数据两次执行 `30_verify_seed_data.sql` 均通过。

## 注意事项

- 不要在生产数据库执行清理或压测脚本；
- 不要把本目录文件移动到 `db/migration`；
- 场景数据不包含真实个人信息、真实联系方式或真实谱书内容；
- 如新增包含 `clan_id` 的业务表，清理脚本会自动纳入；如新增不含 `clan_id` 但通过外键依赖业务表的明细表，也会递归纳入；
- 如新增新的关系类型、审核状态或文化领域值，应同步扩展场景和校验脚本。

## 领域一致性保证

当前脚本除数据库约束外，还显式校验应用层语义：支派路径采用 `父路径/子ID`、层级与父子关系一致；人物生卒时间合法；父子关系符合应用层先后顺序，压测人物树严格相差一代，其他谱系关系符合应用层代次顺序；导入任务具有逐行状态、异步载荷、分片与文件指纹；审核质量检查、文化审核载荷和修谱工作台动作均有确定性场景。`30_verify_seed_data.sql` 会在任一条件不满足时失败。

## Navicat 执行

Navicat 等普通 SQL 客户端不能识别 `\set`、`\if`、`\echo` 等 `psql` 元命令。请使用 [`navicat/`](navicat/) 目录下的纯 PostgreSQL SQL 版本，并按照其中的 README 配置确认值和参数后执行。
