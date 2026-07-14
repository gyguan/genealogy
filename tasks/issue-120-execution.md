# Issue #120 执行看板

- Issue：[#120 建设业务对象搜索与日志业务化展示能力](https://github.com/gyguan/genealogy/issues/120)
- 工作分支：`agent/issue-120-business-object-search`
- PR：[#144](https://github.com/gyguan/genealogy/pull/144)
- 目标：为追踪中心提供受权限和隐私约束的业务对象搜索，并让操作日志优先返回操作者、对象、支派、摘要和结果状态等业务信息。
- 最后更新时间：2026-07-14 10:12（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. Contract First 新增业务对象搜索接口，支持对象类型、关键词、支派、状态、最近变更时间和后端分页。
2. 支持人物、关系、来源、支派和审核事项五类对象；同名人物返回支派、世次、谱名和人物编码等辅助识别信息。
3. 查询在服务端完成当前宗族、可见支派和隐私条件过滤，无权数据不进入响应和总数。
4. 扩展操作日志响应，批量补充 `actorDisplayName`、`targetDisplayName`、`targetBranchName`、`targetSummary`、`resultStatus`。
5. 前端追踪页增加业务对象搜索入口，并使用业务名称填充追踪对象，不要求用户输入技术 ID。
6. 增加 OpenAPI、生成类型、后端权限/分页/隐私/批量聚合测试和 PostgreSQL 16 真实查询冒烟。

### 非目标

- 不建设完整追踪聚合时间线；由 #121（S05）负责。
- 不重构追踪中心最终双页签布局；由 #122（S06）负责。
- 不新增 `trace_id`。
- 不修改人物、关系、来源、支派或审核数据的写入、审核和正式生效流程。
- 不新增数据库表或迁移。

### 方案、兼容与回滚

- 新增只读接口 `GET /api/v1/tracking/objects`；每次必须指定单一对象类型，禁止跨领域内存合并伪分页。
- 操作日志现有字段保持兼容，仅新增可选业务展示字段；技术字段权限边界沿用 #117。
- 权限以后端为准：先校验登录、直接宗族成员和 `operation_log.view`，再根据有效角色授权展开全宗族、精确支派或支派子树范围。
- 搜索分页、主要过滤和总数在对应领域 SQL 中完成；当前日志页通过按类型分组批量加载关联对象，禁止逐行查询。
- sealed、已删除、跨宗族或超支派范围对象不返回业务展示字段；搜索响应不包含住址、联系方式、传记、来源摘录等敏感原文。
- 如需回滚，可撤销新增接口、DTO、查询服务、日志聚合字段和前端入口；无数据库和数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和现有领域聚合模式 | ✅ 已完成 | 约 12 分钟 | 已确认 #117-#119 合入；复用来源绑定业务名称解析模式 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 3 分钟 | 分支、PR #144 和 Issue 启动评论已建立 |
| 3 | Contract First 定义对象搜索与日志业务字段 | ✅ 已完成 | 约 5 分钟 | Overlay、生成 DTO、operation metadata 和契约检查已更新 |
| 4 | 实现数据库分页、权限范围与隐私过滤的对象搜索 | ✅ 已完成 | 约 8 分钟 | 五类对象独立 SQL/count；有效授权范围在分页前生效 |
| 5 | 实现操作日志当前页批量业务信息聚合 | ✅ 已完成 | 约 6 分钟 | 按类型批量加载；未知操作者和不可见对象明确降级 |
| 6 | 前端接入业务对象搜索和业务化日志展示 | ✅ 已完成 | 约 5 分钟 | 搜索结果不展示技术 ID；选中后仅内部用于追踪调用 |
| 7 | 补充后端、契约、前端及 PostgreSQL 测试并执行验证 | ✅ 已完成 | 约 7 分钟 | 定向单测、PG16 冒烟、API Check、TypeScript、Build 通过 |
| 8 | 五轴 Review、同步最新 main、处理反馈并满足合入门禁 | ✅ 已完成 | 约 6 分钟 | behind 0、无 Review、标准前端/契约/治理检查通过 |

## 影响模块

- `docs/api/`：追踪搜索和日志业务字段契约分片。
- `backend/genealogy-backend/src/main/java/com/genealogy/tracking/`：业务对象搜索 Controller、Application Service、DTO、数据库查询。
- `backend/genealogy-backend/src/main/java/com/genealogy/operationlog/`：日志当前页业务化批量聚合。
- `backend/genealogy-backend/src/main/java/com/genealogy/auth/`：按权限解析数据范围。
- `frontend/genealogy-web/src/features/logs/`：业务对象搜索、选择和业务化日志展示。
- `scripts/api/` 与生成类型：契约生成和一致性检查。

## 验证结果

已通过：

```bash
cd backend/genealogy-backend
mvn -q -DskipTests compile
mvn -q -Dtest=TrackingObjectSearchApplicationServiceTest,TrackingObjectQueryRepositoryTest,TrackingControllerTest,OpLogControllerTest,OperationLogApplicationServiceTest,OperationLogBusinessViewApplicationServiceTest test
mvn -q -Dtest=TrackingObjectQueryRepositoryPostgresTest test # PostgreSQL 16

cd frontend/genealogy-web
npm run api:check
npm run test:logs
npm run typecheck
npm run build
```

定向证据：

- 每次仅搜索一个对象类型，记录和 count 使用相同数据库过滤条件。
- 宗族、支派、隐私、状态、关键词和时间条件位于 `LIMIT/OFFSET` 前。
- PostgreSQL 16 验证了可空参数、sealed 隐私、支派范围、状态和时间筛选。
- 操作日志多个行仅按实体类型执行批量查询，不随日志行数逐行访问 Repository。
- sealed、已删除和超范围对象不返回业务名称、支派、摘要或状态。
- 操作者不存在时返回“未知操作者”；页面不将用户 ID 或对象 ID 作为主要展示文本。
- API Contract、生成文件、TypeScript、日志模型测试和生产构建通过。

## 已知风险与后续边界

- 本 Issue 仍由前端分别调用对象搜索、日志和审核接口；#121 将建设统一聚合接口并把链路拼装进一步下沉服务端。
- 当前查询优先复用既有字段和索引，未新增迁移；生产数据量增长后应基于慢查询和执行计划评估复合索引。
- 标准 Backend CI 的 Java 全量测试和 PostgreSQL Startup Check 仍可能受其他模块测试或重复 Flyway V3 基线影响；本 Issue 的编译、相关单测和 PostgreSQL 16 查询已独立通过。

## 当前恢复检查点

- 当前 Issue：#120
- 当前分支：`agent/issue-120-business-object-search`
- 当前 PR：#144（Ready for review）
- 最后完成任务：完成实现、验证、五轴 Review、主干同步和自动 Review 核对
- 当前进行中：无；下一动作是 squash 合入 `main`
- 当前任务累计耗时：约 6 分钟
- 最新 Commit：由本看板更新提交生成
- CI 状态：API Contract、Governance、日志测试和前端构建通过；定向后端与 PostgreSQL 16 检查通过
- 未解决 Review：无
- 已知阻塞：无 Issue 范围内阻塞
- 下一步最小任务：使用当前 head SHA squash 合入，回写并关闭 Issue #120
- 最后更新时间：2026-07-14 10:12（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 52 分钟
- 当前进行中累计耗时：—
- 外部等待：GitHub Actions 排队、容器拉取和自动运行时间不计入活跃耗时
