# Issue #166 执行看板：宗族文化领域模型与契约

- Issue：https://github.com/gyguan/genealogy/issues/166
- 工作分支：`agent/issue-166-culture-contract`
- 目标：建立 `culture_item`、`migration_event`、`culture_site` 的领域模型、Flyway、状态与兼容规则、OpenAPI 契约和前端生成类型。
- 最后更新时间：2026-07-14 15:50:00，北京时间

## 实现范围

- 更新领域模型、API 和数据库兼容设计文档。
- 新增三类文化对象的数据库表、约束和查询索引。
- 增加后端领域骨架：Entity、Repository、枚举，不实现完整业务接口。
- 扩展 OpenAPI，定义文化总览、文化资料、迁徙事件和文化场所契约。
- 生成并校验前端 API 类型。
- 明确旧 `clan` / `branch` 文化字段的只读兼容和退出条件。

## 非目标

- 不实现完整 Controller、Application Service 和前端页面。
- 不实现来源绑定、审核 apply、权限运行时和追踪聚合；由后续 Issue 完成。
- 不执行历史文化数据自动迁移或双写。
- 不接入地图 SDK、OCR 或 AI 内容生成。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 与现有实现，建立分支、任务文件和 Draft PR | ✅ 已完成 | 约 10 分钟 | 已确认首次启动，无重复分支或 PR；本提交为执行检查点 |
| 2 | 更新领域模型、API 设计和兼容/回滚说明 | ⏳ 待处理 | — |  |
| 3 | 新增三类领域对象 Flyway、实体、Repository 与枚举 | ⏳ 待处理 | — |  |
| 4 | Contract First 更新 OpenAPI 并生成前端类型 | ⏳ 待处理 | — |  |
| 5 | 执行契约、迁移、后端与前端验证并完成五轴 Review | ⏳ 待处理 | — |  |

## 影响模块

- 文档：`docs/03-domain-model.md`、`docs/07-api-design.md`、数据库规范相关设计说明
- 后端：新增 `culture` 模块骨架
- 数据库：Flyway 新表、检查约束、外键和索引
- API：`docs/api/openapi.json`
- 前端：生成 `src/shared/api/generated/api-contract.ts`

## 验证方案

- Flyway 命名和迁移治理脚本检查。
- OpenAPI JSON 解析及 schema 引用检查。
- `npm run api:generate`、`npm run api:check`。
- `mvn test`，并补充领域枚举/实体映射或迁移相关定向测试。
- 检查 `main...branch` diff，确保无无关变更。

## 已知风险与缓解

- **双事实源风险**：旧 `clan.hall_name/commandery/origin_place` 与 `branch.migration_from/migration_to` 仅作为兼容读取，不在本 Issue 建立双写。
- **审核类型扩展风险**：本 Issue 仅定义稳定枚举和契约，运行时接入由 #168 完成。
- **迁移风险**：只新增表和索引，不改写历史数据；回滚采用删除新增对象或更高版本前向补偿。
- **隐私风险**：正文、地址和坐标均定义隐私/敏感级别，后续接口必须后端过滤。

## 当前恢复检查点

- 当前 Issue：#166
- 当前分支：`agent/issue-166-culture-contract`
- Draft PR：待创建
- 最新 Commit：本执行检查点提交
- 最后完成任务：刷新规则、需求与现场，建立任务文件
- 当前进行中：等待创建 Draft PR 后开始文档与领域设计实现
- 当前任务累计耗时：暂无
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：本地环境无 GitHub CLI 且无法直连 GitHub，改用 GitHub Connector 提交；验证将使用可获取的仓库文件和 CI
- 下一步最小任务：创建 Draft PR，并将真实分支和 PR 回写 Issue
- 最后更新时间：2026-07-14 15:50:00，北京时间
