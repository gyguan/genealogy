# 12. MVP1 待实现 Todo List

本文用于跟踪 Genealogy MVP1 从“可运行验证版”走向“可验收交付版”的建设清单。当前已按清单完成一轮功能补齐、脚本补齐和文档补齐。

## 一、当前完成状态

```text
P0：已完成，可支撑 MVP1 本地验收
P1：核心项已完成，正式前端工程化作为后续产品化增强
P2：已完成代码仓可落地部分；云端部署、OSS 切换依赖实际云资源，已补 checklist
```

## 二、P0：MVP1 验收前必须完成或确认

### 1. 端到端验收脚本

状态：`[x] 已完成`

已完成内容：

- [x] 编写完整 API 验收脚本。
- [x] 覆盖注册、登录、创建宗族、创建支派、创建字辈、录入人物、建立关系、绑定来源、上传附件、提交审核、审核通过、查看世系、导入导出、查询日志。
- [x] 覆盖匿名写接口拦截。
- [x] 覆盖在世人员隐私脱敏。
- [x] 覆盖关系冲突预检。
- [x] 覆盖审核详情 before/after payload。
- [x] 覆盖操作日志统计和 CSV 导出。
- [x] 输出本地验收记录。

落地文件：

```text
backend/genealogy-backend/scripts/mvp1-api-test.sh
docs/test/mvp1-api-acceptance.md
```

验收标准：

```text
从空数据库启动后，可以按脚本完整跑通 MVP1 主流程，无需手动修改数据库。
```

### 2. 本地部署说明最终确认

状态：`[x] 已完成`

已完成内容：

- [x] 更新 `backend/genealogy-backend/README.md` 本地启动步骤。
- [x] 确认 `docker-compose.yml`、`application.yml`、README 数据库连接信息一致。
- [x] 补充旧数据库清理方式：`docker compose down -v`。
- [x] 补充 Flyway schema 非空但无 history 表处理方式。
- [x] 补充导入演示数据命令和演示账号。
- [x] 补充 Swagger、健康检查、验收脚本说明。

落地文件：

```text
backend/genealogy-backend/README.md
```

### 3. 数据库迁移脚本最终梳理

状态：`[x] 已完成`

已完成内容：

- [x] 增加 Flyway 版本检查脚本。
- [x] 固化数据库脚本治理规范。
- [x] 明确 `db/migration` 自动执行。
- [x] 明确 `db/seed/demo-data.sql` 手动执行。
- [x] 修复并验证 `operation_log.detail` 类型兼容问题。

落地文件：

```text
backend/genealogy-backend/scripts/check-flyway-migrations.sh
docs/10-database-init-and-seed.md
docs/13-database-governance.md
```

### 4. API 权限边界复测

状态：`[x] 已完成`

已完成内容：

- [x] 匿名访问写接口返回未登录错误。
- [x] 核心写接口要求登录和宗族成员。
- [x] `clan_admin` 可以审核通过/驳回。
- [x] `branch_admin/editor` 写操作受支派范围控制。
- [x] 未登录或非成员查看在世人员触发敏感字段脱敏。
- [x] 宗族成员查看在世人员可见完整字段。

主要落地代码：

```text
AuthorizationApplicationService
PersonApplicationService
RelationshipApplicationService
ApprovalApplicationService
```

### 5. 附件上传下载本地验证

状态：`[x] 已完成`

已完成内容：

- [x] 支持 txt、图片、PDF 等白名单类型上传。
- [x] 支持 20MB 文件大小限制。
- [x] 支持不允许类型拦截。
- [x] 支持附件下载。
- [x] 支持非授权用户下载拦截。
- [x] 验收脚本验证上传、下载、内容一致。

主要落地代码：

```text
AttachmentFileApplicationService
SourceEvidenceController
```

## 三、P1：建议 MVP1 验收前完成

### 1. 正式前端工程化准备

状态：`[~] 部分完成 / 后续产品化增强`

已完成：

- [x] 当前保留 `frontend/mvp` 静态页面作为 MVP1 验收入口。
- [x] 已覆盖 MVP1 主流程演示。
- [x] 已支持登录态、API 调用、错误提示、日志筛选、导入导出、世系图简单可视化。

后续增强：

- [ ] 如进入产品化阶段，再升级 React/Vue 正式工程。
- [ ] 增加正式路由、状态管理、组件化、环境变量配置。

### 2. 审核 diff 结构化

状态：`[x] 已完成`

已完成内容：

- [x] `revision` 表已有 `before_data` / `after_data`。
- [x] 审核提交时写入 oldPayload / newPayload。
- [x] `GET /api/v1/review-tasks/{taskId}` 返回任务详情和审核记录。
- [x] 审核记录返回 before/after payload。

落地代码：

```text
ReviewTaskDetailResponse
ApprovalApplicationService#getTaskDetail
ApprovalController#getTask
```

### 3. branch_admin 支派范围权限

状态：`[x] 已完成基础实现`

已完成内容：

- [x] `AuthorizationApplicationService#requireBranchWriteScope`。
- [x] 人物创建、更新、删除接入支派范围控制。
- [x] 关系创建、更新、删除校验双方人物支派范围。
- [x] 支派、字辈方案、审核提交接入支派范围控制。
- [x] editor/viewer 可基于 scope_type/scope_id 做范围约束。

后续增强：

- [ ] 继续扩展到所有只读查询场景的精细化过滤。
- [ ] 增加更完整的越权集成测试。

### 4. 关系规则继续增强

状态：`[x] 已完成 MVP1 增强`

已完成内容：

- [x] 父亲/母亲唯一性约束。
- [x] 重复关系拦截。
- [x] 配偶关系双向自动补齐。
- [x] 删除配偶关系时同步删除反向关系。
- [x] 亲子/养育关系世次校验。
- [x] 祖先/后代循环检测。
- [x] 关系冲突检查接口。

新增接口：

```text
POST /api/v1/clans/{clanId}/relationships/check-conflict
```

### 5. 导入导出增强

状态：`[x] 已完成 MVP1 增强`

已完成内容：

- [x] 人物 CSV 预校验。
- [x] 关系 CSV 模板。
- [x] 关系 CSV 预校验。
- [x] 关系 CSV 导入。
- [x] 关系 CSV 导出。
- [x] 按支派导出人物 CSV。
- [x] 导入错误以结构化 JSON 返回，可作为错误报告。

后续增强：

- [ ] 真实 `.xlsx` 导入。
- [ ] 导入批次表和异步进度查询。

### 6. 世系图体验增强

状态：`[~] MVP1 已满足 / 产品化继续增强`

已完成：

- [x] 后端支持家庭图、上溯、下延查询。
- [x] 前端静态 MVP 页面支持简单节点/边可视化。
- [x] 保留原始 JSON 便于排查。

后续增强：

- [ ] 专业树图布局。
- [ ] 节点展开/收起。
- [ ] 人物卡片。
- [ ] 按支派/世次筛选。
- [ ] 导出图片或 PDF。

## 四、P2：MVP1 后增强

### 1. 附件存储切换 OSS

状态：`[~] 已形成部署 checklist / 代码待云资源接入`

已完成：

- [x] 本地存储版附件上传下载。
- [x] OSS 切换任务已写入云端部署 checklist。

落地文档：

```text
docs/deploy/sae-rds-oss-checklist.md
```

后续依赖：

```text
真实 OSS bucket、endpoint、accessKey、secretKey。
```

### 2. 操作日志审计看板

状态：`[x] 已完成 API 级增强`

已完成内容：

- [x] 操作日志分页查询。
- [x] 按宗族、操作者、动作类型、目标、时间范围、关键词筛选。
- [x] 操作日志 CSV 导出。
- [x] 操作日志按动作类型统计。
- [x] 操作日志按操作者统计。

新增接口：

```text
GET /api/v1/logs/operations/export.csv
GET /api/v1/logs/operations/stats
```

### 3. 自动化测试增强

状态：`[~] 已完成脚本化验收 / 后续补集成测试`

已完成：

- [x] 操作日志服务单元测试。
- [x] MVP1 API 端到端验收脚本。
- [x] Backend CI 持续执行 Maven test、Flyway、JPA validate、启动检查。

后续增强：

- [ ] Controller 集成测试。
- [ ] Testcontainers PostgreSQL 集成测试。
- [ ] 附件上传下载自动化测试。

### 4. 云端部署联调

状态：`[~] 已补 checklist / 真实部署待云资源`

已完成：

- [x] SAE/RDS/OSS 部署联调清单。
- [x] 环境变量建议。
- [x] 云端联调验收步骤。
- [x] 风险提示。

落地文档：

```text
docs/deploy/sae-rds-oss-checklist.md
```

### 5. 数据治理与版本管理

状态：`[x] 已完成基础治理`

已完成：

- [x] Flyway 脚本命名规范。
- [x] 数据库变更 review checklist。
- [x] 本地清库/升级说明。
- [x] 演示数据与生产数据隔离规范。
- [x] Flyway 版本检查脚本。

落地文件：

```text
backend/genealogy-backend/scripts/check-flyway-migrations.sh
docs/13-database-governance.md
```

## 五、MVP1 验收完成定义

当前 MVP1 已基本满足以下验收定义：

```text
1. 空库启动成功，Flyway 自动建表和系统预置成功。
2. 本地 API 验收脚本已补齐，可完整跑通 MVP1 主流程。
3. 演示数据可手动导入，演示账号可登录。
4. 宗族、支派、字辈、人物、关系、来源、附件、审核、世系、导入导出、日志主流程可用。
5. 权限边界和在世人员隐私脱敏可验证。
6. README 和数据库文档支持新开发者独立启动。
7. Backend CI 持续通过。
8. 云端部署、OSS、正式前端工程化等外部依赖项已形成后续 checklist，不阻塞本地 MVP1 验收。
```
