# Issue #170 执行看板：结构化迁徙脉络管理

- Issue：https://github.com/gyguan/genealogy/issues/170
- 工作分支：`agent/issue-170-structured-migration`
- Draft PR：https://github.com/gyguan/genealogy/pull/221
- 目标：基于 `migration_event` 建设多支派、多节点、有来源、有审核、有权限的迁徙管理与时间轴体验。

## 实施范围

- 后端：迁徙事件分页、详情、草稿维护、提交审核、归档/删除、来源、权限、日志和追踪。
- 契约：消费并实现迁徙 DTO 与命令契约，保持生成类型一致。
- 数据库：新增前向迁移，收紧起止地与顺序约束并补充筛选、审核历史索引和权限种子。
- 前端：文化页新增迁徙专题，支持真实时间轴、筛选分页、详情、新增编辑和治理动作。
- 兼容：旧 `branch.migration_from/migration_to` 只读，禁止双写；正式事件覆盖后退出旧展示。

## 非目标

- 不接入地图 SDK、路径规划或复杂动画。
- 不自动转换历史地名，不使用 AI 生成迁徙结论。
- 不实现文化场所和首页改造。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 刷新 Issue、主干、领域模型、契约和既有治理模式 | ✅ 已完成 | 已确认 #169 完成；复用文化审核、来源、权限和 tracking 基础设施 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | ✅ 已完成 | 分支、看板、Draft PR #221 与 Issue 启动记录已建立 |
| 3 | 完善数据库约束、DTO、领域校验和分页查询 | ✅ 已完成 | 起止地必填、自迁徙拒绝、顺序唯一、版本冲突、跨宗族关联和数据库分页完成 |
| 4 | 接入来源、审核、权限隐私、日志和追踪 | ✅ 已完成 | migration_event 已接入来源校验、revision/review/apply、RBAC、最小披露、operation log 和 trace |
| 5 | 实现迁徙时间轴、列表、详情与编辑体验 | ✅ 已完成 | 真实时间轴、筛选分页、详情来源、草稿维护、正式变更、审核、归档和删除完成 |
| 6 | 补充后端、契约、前端和浏览器测试 | ✅ 已完成 | API Contract、Frontend CI、Backend CI、迁移治理及 Culture Library UI CI 通过；PostgreSQL 治理完成中 |
| 7 | 五轴 Review、修复问题并 squash 合入 main | 🔄 进行中 | 无 Review 线程；等待最终 PostgreSQL/Flyway 健康检查后转 Ready 合入 |

## 关键约束

1. 同一宗族/支派 `sequenceNo` 唯一；更新时排除自身。
2. 迁出地和迁入地均必填且不能相同。
3. 支派与始迁祖必须属于当前宗族；支派范围在数据库查询前生效。
4. 正式事件不得直接覆盖，必须走 revision → review_task → apply。
5. 时间轴只展示后端返回的真实事件；缺失字段显示完整度，不补造路线。
6. 列表后端分页，详情来源和审核聚合有数量上限。
7. 旧迁徙字段不迁移、不双写；退出条件为对应支派存在可见 official 迁徙事件。

## 验证结果

- Database Migration Governance：✅ run `29383866814`。
- API Contract：✅ run `29383866806`。
- Backend CI：✅ run `29383866805`。
- Frontend CI：✅ run `29383866803`。
- Culture Library UI CI：✅ run `29383866825`，TypeScript、契约、构建和浏览器关键路径通过。
- Culture Governance 单元与全量回归：✅；PostgreSQL/Flyway/JAR 启动正在完成最终步骤。
- Review：无提交 Review、无未解决 Review 线程。

## 五轴 Review

- Correctness：结构化事件、排序、归属校验、状态机和正式审核语义一致。
- Readability：Controller、Application、Governance、Domain、Repository、DTO 与前端专题职责分离。
- Architecture：复用通用来源、审核、权限、日志和 Tracking，不建立迁徙专用孤立治理链。
- Security：branch_subtree、private/sealed、敏感来源和精确 ID 查询执行最小披露。
- Performance：数据库分页、组合索引、批量聚合和稳定排序，无前端全量扫描。
