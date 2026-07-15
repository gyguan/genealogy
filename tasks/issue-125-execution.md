# Issue #125 执行看板

- Issue：[#125 建设高风险操作审计视图与异常追踪能力](https://github.com/gyguan/genealogy/issues/125)
- 工作分支：`agent/issue-125-risk-audit`（已删除）
- 交付 PR：[#220](https://github.com/gyguan/genealogy/pull/220)（已合入）
- `main` 合入 Commit：`c4d8c173e215e66f9ed5509bc39cd555bd488acd`
- 目标：基于后端真实审计数据建设高风险事件模型、分页筛选、统计与追踪跳转，并补齐批量导出、权限变更和敏感访问的可验证日志。
- 最后更新时间：2026-07-15 11:01（北京时间）

## DEFINE：范围与边界

### 实施范围

1. 在操作日志中保存明确的风险等级、风险事件类型、处置状态和支派快照，不通过摘要关键词推断风险。
2. 首期覆盖权限/管理员变更、敏感来源或附件访问、批量导出、正式对象删除或高影响变更、审核异常、越权拒绝等稳定事件类型。
3. 提供按风险等级、事件类型、操作者、支派、时间范围的后端分页查询和真实统计。
4. 每条风险事件返回对象追踪或原始日志详情的稳定跳转信息。
5. 后端使用独立 `operation_risk.view` 权限，技术字段继续由 `operation_log.export` 控制；无权用户不能获取风险数量。
6. 前端风险审计视图具备 URL 筛选恢复、加载、空态、错误和无权限状态。

### 非目标

- 不建设通用 SIEM、实时流式告警、自动封禁或自动撤权。
- 不通过日志摘要/详情关键词完成风险分类。
- 不回填无法可靠判定的历史风险事件；普通附件访问和其他普通日志保持原样。

### 数据库影响与回滚

- `operation_log` 新增可空的 `risk_level`、`risk_event_type`、`disposition_status`、`branch_id` 字段、值域约束及与实际筛选匹配的部分索引。
- Flyway：`V20260715235959_01__add_operation_risk_audit_fields.sql`；因开发期间主干新增 `V20260715235959`，使用同时间戳序号 `_01` 保证严格递增且不改写主干迁移。
- 新日志由显式风险上下文或稳定 `actionType` 分类；历史数据仅按确定动作码或附件真实敏感级别回填。
- 支派查询优先使用快照字段；快照缺失时基于人物、关系、审核任务、成员授权、来源绑定等结构化对象回退匹配，不解析文本。
- 回滚采用前向补偿：先停止写入和读取新字段，再删除索引、约束和字段；原始操作日志与业务结果不回滚。

## PLAN：原子任务

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和现有追踪/审计架构 | ✅ 已完成 | 约 4 分钟 | 已确认首次启动，无重复分支、PR 或看板 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 2 分钟 | 分支、PR #220、Issue 启动评论和恢复检查点已建立 |
| 3 | Contract First 定义风险审计查询、统计与事件 DTO | ✅ 已完成 | 未单独精确固化 | 新增独立风险 OpenAPI overlay、DTO 和分域生成文件；API Contract 通过 |
| 4 | 增加风险字段迁移、风险模型和数据库分页查询 | ✅ 已完成 | 未单独精确固化 | 字段、约束、索引、权限、分页、统计、支派范围和结构化回退已完成 |
| 5 | 对关键业务动作补齐显式风险审计记录 | ✅ 已完成 | 未单独精确固化 | 导出显式记录；权限变更按稳定动作码分类；敏感附件访问按真实敏感级别显式记录 |
| 6 | 接入风险审计前端视图、URL 筛选恢复和详情跳转 | ✅ 已完成 | 未单独精确固化 | 新增风险页签、统计卡片、筛选、分页、日志详情和对象追踪入口 |
| 7 | 补充后端、契约、前端模型与权限回归测试 | ✅ 已完成 | 未单独精确固化 | 覆盖无权统计泄露、字段最小化、支派拒绝、分类、敏感访问和 URL 恢复 |
| 8 | 完成验证、五轴 Review 并达到 `main` 合入门禁 | ✅ 已完成 | 未单独精确固化 | 干净 PR diff、分支 CI 与最新主干合并态六项门禁均已核对，无阻塞性 Review |
| 9 | Squash Merge、Issue 关闭与交付现场收尾 | ✅ 已完成 | 未单独精确固化 | PR #220 合入 `main`，Issue #125 自动关闭，工作分支已删除 |

> 除启动阶段已及时固化的耗时外，后续任务未形成可审计的逐项计时记录，不事后补造。

## 影响模块

- 后端：`operationlog`、`auth`、来源附件、成员权限相关操作日志、`tracking`。
- 数据库：`operation_log` 风险字段、部分索引、风险查看权限和确定性历史回填。
- API：风险事件分页、统计及追踪跳转字段契约。
- 前端：追踪中心“风险审计”页签、生成类型、筛选状态和详情交互。

## 验证结果

### 最终干净 PR Head

- ✅ PR Files changed 仅包含 Issue #125 的 30 个文件。
- ✅ Backend CI #2459。
- ✅ Frontend CI #344。
- ✅ API Contract #1146，生成文件无漂移。
- ✅ Database Migration Governance #475。

### 最新主干合并态

为验证与合入前 `main` `646f398ba8476f59ebafc7c9e2c1e7593b2d1c6c` 的兼容性，使用合并态提交 `59bb94e2fdf13346e4d45e232623020e89206d19` 完成验证：

- ✅ Backend CI #2443。
- ✅ Frontend CI #340。
- ✅ API Contract #1133。
- ✅ Database Migration Governance #471。
- ✅ Culture Library UI CI #79。
- ✅ Culture Governance CI #120：全量后端回归、PostgreSQL 文化集成测试、PostgreSQL 启动与全量 Flyway 验证通过。

验证后分支恢复到干净 head，避免主干其他 Issue 文件进入 PR diff；最终 Squash Merge 仅合入 Issue #125 的 30 个文件。

### 聚焦验证

- ✅ `OperationRiskPolicyTest`：稳定动作分类、权限变更、显式敏感访问、非法值拒绝。
- ✅ `OperationRiskAuditApplicationServiceTest`：支派越权在查询前拒绝、枚举校验、分页和技术字段最小化。
- ✅ `OpLogControllerTest`：独立风险权限、鉴权先于 count、跨宗族拒绝和导出权限。
- ✅ `OperationLogExportApplicationServiceTest`：批量导出产生显式高风险事件且不复制敏感关键词。
- ✅ `SourceAttachmentApplicationServiceTest`：敏感附件访问产生风险日志，普通附件访问仅保留普通审计。
- ✅ `trackingCenterModel.test.mjs`：风险筛选、页码和选中日志 URL 往返恢复。
- ⚠️ `OperationRiskAuditPostgresIntegrationTest` 已提交并在标准 CI 完成编译，但现有工作流未单独执行该条件测试；不虚构该测试用例已运行通过。合并态 CI 已证明本迁移可在 PostgreSQL 完成全量 Flyway 和应用启动。

## 五轴 Review

- **Correctness**：风险分类只读取显式上下文、稳定动作码和结构化业务字段；普通附件访问不误报。
- **Readability**：风险上下文、分类策略、查询服务、业务展示服务和 UI 面板职责分离。
- **Architecture**：复用 `operation_log` 事实源和追踪中心，不引入平行审计库；统计在数据库完成。
- **Security**：风险查看独立鉴权且先于列表/count；支派范围在数据库分页前限制；技术字段由导出权限控制。
- **Performance**：风险查询使用部分索引；支派快照优先，结构化子查询仅作为历史/缺失快照回退；页面最大 100 条。

## 已知风险与后续

- PostgreSQL 风险查询条件测试尚未由现有工作流实际执行；可在具备 PostgreSQL 16 且设置 `RUN_POSTGRES_INTEGRATION_TESTS=true` 的环境补跑。
- 历史来源绑定跨多个支派时不强行回填单一 `branch_id`，查询通过结构化绑定关系判定可见范围。
- 首期处置状态为审计事实字段和筛选维度，不包含自动封禁、自动撤权或通用告警编排。

## 最终交付状态

- 完成状态：PR #220 已 Squash Merge 至 `main`。
- `main` 合入 Commit：`c4d8c173e215e66f9ed5509bc39cd555bd488acd`。
- Issue 状态：#125 已自动关闭，状态原因为 `completed`。
- PR 状态：`merged=true`，最终变更文件数 30。
- Review 状态：五轴 Review 已提交，无阻塞性评审意见和未解决线程。
- 分支状态：`agent/issue-125-risk-audit` 已删除。
- 已知阻塞：无。
- 后续事项：仅保留上述 PostgreSQL 条件测试补跑建议，不影响本次交付完成判定。
- 完成时间：2026-07-15 11:01（北京时间）。

## 耗时汇总

- 已固化启动阶段活跃耗时：约 6 分钟
- 后续任务活跃耗时：未逐项精确固化，不事后补造
- 外部等待：CI 排队、运行及自动 Review 等待，未计入活跃耗时
