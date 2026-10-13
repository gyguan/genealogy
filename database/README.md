# Database

Genealogy 数据库已收敛为 PostgreSQL 16 + Flyway 的全新初始化基线。

## 目录

```text
backend/genealogy-backend/src/main/resources/db/
├── migration/                 # 应用启动时唯一执行的 Flyway 目录
│   ├── V1__create_current_schema.sql
│   └── V2__seed_system_authorization.sql
└── seed/                      # 显式测试/演示/性能数据，不由 Flyway 自动执行

database/
├── bootstrap/                 # 基线重现与校验工具
└── archive/
    ├── legacy-flyway/         # 2026-10 基线收口前的历史迁移，只读归档
    ├── legacy-rollback/       # 与旧迁移链配套的回滚脚本，只读归档
    └── schema-draft-before-baseline.sql
```

## 当前原则

1. 新环境只从 `db/migration` 初始化。
2. V1 维护当前最终 Schema；V2 只维护系统 RBAC 参考数据。
3. V1/V2 合入 main 后不可修改，后续变化新增时间戳版本迁移。
4. archive 不在应用 classpath 中，不得用于正常启动或旧库升级。
5. 旧数据库历史兼容不属于当前基线支持范围；需要切换时由运维备份后重建。
6. Demo、测试、压测数据与正式初始化分离。
7. 应用不会自动执行 `flyway clean`、`repair` 或 drop database。

详细规范：`docs/backend/database-and-flyway.md`。

基线重现与验证：`database/bootstrap/README.md`。
