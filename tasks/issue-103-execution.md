# Issue #103 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/103
- 目标：实现人物关系 CSV/XLSX 导入，复用通用导入批次、失败行、审核和审计能力。
- 工作分支：`agent/issue-103-relationship-import`
- Draft PR：#114
- 当前阶段：PLAN / Contract First
- 最后更新时间：2026-07-13 19:00（北京时间）

## 范围

- 新增人物关系 CSV/XLSX 标准模板和严格表头校验。
- 通过人物业务标识唯一匹配关系双方，不暴露内部人物 ID。
- 支持父子、母子、配偶关系。
- 校验人物存在、同宗族、不可自关联、类型合法、重复关系和循环风险。
- 复用 `import_job`、`import_job_row`、失败行修正、统一审核和操作日志。
- 审核通过后统一正式生效；驳回后保留草稿并允许重新提交。
- 启用导入中心“人物关系导入”入口。

## 非目标

- 跨宗族关系。
- 自动创建或推断缺失人物。
- 部分审核通过。
- 多级审核。
- 新建独立批次、错误行或审核模型。

## 任务看板

| 状态 | 原子任务 | 验收条件 |
|---|---|---|
| ✅ | 1. 确认现有关系领域模型、业务标识和审核生效路径 | 已确认 `relationship` 独立模型、`personCode` 匹配、现有重复/循环规则及 `import_job` 审核分派改造点 |
| 🔄 | 2. Contract First 定义模板、预览、批次创建、失败行修正接口 | OpenAPI 明确 CSV/XLSX、关系字段、值域和错误响应 |
| ⏳ | 3. 实现关系模板、解析、严格表头和行校验 | CSV/XLSX 模板一致；非法结构整文件拒绝；非法行进入通用失败行 |
| ⏳ | 4. 实现关系草稿、失败行修正和重试 | 双方无法唯一匹配、重复、自关联等可修正；成功行形成关系草稿 |
| ⏳ | 5. 接入统一审核和正式生效 | 提交审核、自审禁止、通过统一生成正式关系、驳回可重提 |
| ⏳ | 6. 启用前端关系导入 Workspace 与类型修正表单 | 可下载模板、上传预览、创建批次、修正失败行并查看任务 |
| ⏳ | 7. 补充测试与定向验证 | 模板、校验、权限、重试、审核生效、契约和前端构建通过 |
| ⏳ | 8. 五轴 Review 与 PR 收口 | Correctness/Readability/Architecture/Security/Performance 无阻断问题 |

## 已确认的设计决策

- 模板使用业务编码：`关系主体编码、关系对象编码、关系类型、说明`。
- `父子/母子`：主体是父亲/母亲，对象是子女；`配偶` 为对称关系。
- 关系类型严格接受 `父子、母子、配偶`，映射到现有 `parent_child/spouse` 与关系标签。
- 人物按 `clanId + personCode + deletedAt is null` 唯一匹配；0 条或多条均作为可修正失败行。
- 复用 `RelationshipApplicationService` 的权限、同宗族、自关联、重复、代次和祖先循环校验。
- `import_job_row` 增加通用 `draft_target_type/draft_target_id`，历史人物行由迁移回填；`draft_person_id` 在兼容窗口保留。
- `ImportJobReviewApplicationService` 和 `RevisionApplyService` 按 `importType` 分派人物或关系草稿。
- 配偶关系审核通过/驳回时同步处理自动生成的反向关系。

## 影响模块

- `imports`：类型注册、模板、解析、批次、失败行和审核处理器。
- `relationship`：复用关系合法性校验、草稿创建和正式状态。
- `person`：增加宗族内按人物编码查询，不修改人物正式数据。
- `review`：复用现有导入批次审核，按导入类型分派生效逻辑。
- `frontend/imports`：新增关系导入 Workspace 和关系行修正 Renderer。
- `docs/api`：Contract First 更新。
- `db/migration`：新增通用草稿目标字段迁移，保留历史字段兼容。

## 验证方案

- 后端编译与关系导入聚焦测试。
- CSV/XLSX 模板与严格表头测试。
- 人物唯一匹配、同宗族、自关联、重复和循环校验测试。
- 失败行修正成功/失败和幂等测试。
- 批次提交、禁止自审、审核通过/驳回测试。
- PostgreSQL 迁移和历史人物导入行回填验证。
- `npm run api:check`、导入模块 TypeScript 定向检查和生产构建。

## 已知风险

- `draft_target_type/draft_target_id` 是公共导入行模型变更，需同时兼容历史 `draft_person_id`。
- 配偶自动反向关系只有主关系 ID 进入导入行，审核处理器必须按双向键同步状态。
- 人物编码目前缺少直接唯一查询方法，应用层必须明确处理多匹配而不能任取一条。
- 默认全仓 CI 存在历史基线问题，需提供本次聚焦测试与 PostgreSQL 迁移独立证据。

## 恢复检查点

- 最后完成任务：确认关系模型、人物编码、关系合法性校验和导入审核生效改造点。
- 当前进行中任务：Contract First 定义关系模板、预览、批次创建和失败行修正接口。
- 最新 Commit：领域分析检查点提交。
- CI 状态：定向结构发现成功；业务验证尚未启动。
- 未解决 Review：无。
- 已知阻塞：无。
- 下一步最小任务：更新 OpenAPI 导入分片，定义关系预览和重试 DTO。
