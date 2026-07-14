# Issue #166 执行看板：宗族文化领域模型与契约

- Issue：https://github.com/gyguan/genealogy/issues/166
- Draft PR：https://github.com/gyguan/genealogy/pull/174
- 工作分支：`agent/issue-166-culture-contract`
- 目标：建立 `culture_item`、`migration_event`、`culture_site` 的领域模型、Flyway、状态与兼容规则、OpenAPI 契约和前端生成类型。
- 最后更新时间：2026-07-14 17:43:00，北京时间

## 实现范围

- 更新领域模型、API 和数据库兼容设计文档。
- 新增三类文化对象的数据库表、约束和查询索引。
- 增加后端领域骨架：Entity、Repository、枚举，不实现完整业务接口。
- 扩展 OpenAPI，定义文化总览、文化资料、迁徙事件和文化场所契约。
- 生成并校验前端 API operation 和 DTO 类型。
- 明确旧 `clan` / `branch` 文化字段的只读兼容和退出条件。

## 非目标

- 不实现完整 Controller、Application Service 和前端页面。
- 不实现来源绑定、审核 apply、权限运行时和追踪聚合；由后续 Issue 完成。
- 不执行历史文化数据自动迁移或双写。
- 不接入地图 SDK、OCR 或 AI 内容生成。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 与现有实现，建立分支、任务文件和 Draft PR | ✅ 已完成 | 约 10 分钟 | `cde315a`；Draft PR #174 与 Issue 回写已建立 |
| 2 | 更新领域模型、API 设计和兼容/回滚说明 | ✅ 已完成 | 约 12 分钟 | 新增正式基础设计并同步领域/API 文档 |
| 3 | 新增三类领域对象 Flyway、实体、Repository 与枚举 | ✅ 已完成 | 约 18 分钟 | 三表迁移、回滚脚本、实体、Repository、稳定枚举与契约测试已提交 |
| 4 | Contract First 更新 OpenAPI 并生成前端类型 | ✅ 已完成 | 约 18 分钟 | culture operations/DTO、追踪目标类型、生成器和契约检查已提交 |
| 5 | 执行契约、迁移、后端与前端验证并完成五轴 Review | 🔄 进行中 | 已累计约 14 分钟 | 迁移治理、交付治理和 Backend CI 已通过；正在读取 API/TypeScript 精确诊断 |

## 影响模块

- 文档：`docs/03-domain-model.md`、`docs/07-api-design.md`、`docs/17-culture-domain-foundation.md`
- 后端：新增 `com.genealogy.culture` 领域骨架
- 数据库：Flyway 新表、检查约束、外键、索引和人工回滚脚本
- API：`docs/api/openapi.culture.json`、tracking overlays、生成器和契约检查
- 前端：生成 `culture-api-contract.ts`、`culture-types.ts`，同步 `tracking-types.ts`

## 验证方案

- Flyway 命名和迁移治理脚本检查。
- PostgreSQL/Flyway 启动与 Hibernate schema validate。
- OpenAPI JSON 解析、本地 `$ref` 和文化契约语义检查。
- `npm run api:generate`、`npm run api:check`、`npm run typecheck`、`npm run build`。
- `mvn test`，包括文化枚举与实体默认值契约测试。
- 检查 `main...branch` diff，确保无无关修改，并完成五轴 Review。

## 已知风险与缓解

- **双事实源风险**：旧 `clan.hall_name/commandery/origin_place` 与 `branch.migration_from/migration_to` 仅作为兼容读取，不在本 Issue 建立双写。
- **审核类型扩展风险**：本 Issue 只定义稳定目标类型和契约；运行时接入由 #168、#170、#171 完成。
- **迁移风险**：只新增表和索引，不改写历史数据；无业务数据时可执行明确的人工回滚，有数据后使用更高版本前向补偿。
- **隐私风险**：正文、地址和坐标均定义隐私/敏感级别；后续接口必须由后端过滤。
- **验证环境限制**：提交通过 GitHub Connector 完成，构建和数据库验证以仓库 CI 为事实依据。

## 当前恢复检查点

- 当前 Issue：#166
- 当前分支：`agent/issue-166-culture-contract`
- Draft PR：#174
- 最新 Commit：由本次看板更新提交确定
- 最后完成任务：修复 Flyway 版本、恢复前端既有验证脚本并通过 Backend CI
- 当前进行中：通过临时失败产物读取 API 生成差异和 TypeScript 错误
- 当前任务累计耗时：已累计约 14 分钟
- CI 状态：Database Migration Governance、Issue Delivery Governance、Backend CI 已通过；API Contract 与 Auth E2E 的前端类型检查待修复
- 未解决 Review：无
- 已知阻塞：日志尾部被连接器截断，已临时启用失败诊断产物；定位后将清理工作流改动
- 下一步最小任务：下载 API Contract 失败诊断产物并按精确差异修复
- 最后更新时间：2026-07-14 17:43:00，北京时间
