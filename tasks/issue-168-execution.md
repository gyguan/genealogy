# Issue #168 执行看板：文化资料来源、审核、权限隐私与追踪

- Issue：https://github.com/gyguan/genealogy/issues/168
- 工作分支：`agent/issue-168-culture-governance`
- Draft PR：待创建
- 目标：让 `culture_item` 接入来源证据、revision/review apply、文化专属权限与范围、隐私最小披露和统一追踪，形成可信正式数据闭环。
- 最后更新时间：2026-07-14 19:16，北京时间

## 实现范围

- 来源绑定支持 `culture_item`，校验来源、目标同宗族且在调用人可见范围内。
- 实现文化资料提交审核、通过、驳回、revision apply、正式归档和精选变更审核。
- 新增文化资料权限，映射内置角色及 `clan / branch_subtree` 数据范围。
- 后端联合成员、角色、范围、隐私、敏感级别和状态计算 `allowedActions`。
- 对 `private / sealed` 实施正文、摘录、附件元数据和对象存在性的最小披露。
- 追踪中心搜索和 trace 聚合支持 `culture_item`，聚合 revision、review task、source binding 和 operation log，并设置有界上限。
- 新增、编辑、提交、审核、绑定、归档和精选操作记录安全日志，不写完整敏感正文。

## 非目标

- 不实现最终文化资料库页面，由 #169 完成。
- 不接入迁徙事件和文化场所。
- 不实现双人复核或对象级临时 ACL。
- 不修改已执行的历史 Flyway；数据库调整只通过更高版本前向迁移交付。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现与现有通用治理框架 | ✅ 已完成 | 约 8 分钟 | 已读取根/后端规则、Issue 治理、#168 和 #167 合入基线；确认无现有分支或 PR |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | 🔄 进行中 | 已累计约 2 分钟 | 分支与执行看板已建立，正在创建 Draft PR |
| 3 | 补齐文化来源、审核、权限与追踪 OpenAPI/领域契约 | ⏳ 待处理 | — |  |
| 4 | 实现文化 revision/review apply、归档和来源绑定范围校验 | ⏳ 待处理 | — |  |
| 5 | 实现文化权限种子、隐私矩阵、allowedActions 和追踪聚合 | ⏳ 待处理 | — |  |
| 6 | 补充单元、权限矩阵、PostgreSQL 与契约测试 | ⏳ 待处理 | — |  |
| 7 | 执行完整验证、五轴 Review、合入 main 并关闭 Issue | ⏳ 待处理 | — |  |

## 影响模块

- 后端：`culture`、`source`、`review`、`auth/permission`、`operationlog`、`tracking`。
- API：文化提交审核/归档、来源绑定校验、追踪对象搜索/trace、`allowedActions` 与隐私响应。
- 数据库：文化权限种子、角色权限映射和必要查询索引；只新增高版本 Flyway。
- 前端：仅同步生成类型和 tracking 目标类型，不实现页面。

## Contract First 方案

1. 复用通用 `revision → review_task → approve/reject → apply`，不建立文化专属审核表。
2. `culture_item` 正式字段、删除、归档和精选变更均通过 revision payload 描述并由 apply service 落库。
3. 来源绑定继续使用通用 `source_binding`，在目标解析器中增加 `culture_item` 的宗族、支派、隐私和存在性校验。
4. 权限使用文化专属 permission code，并复用 RBAC 的 `clan / branch_subtree` 范围。
5. tracking 通过目标适配器聚合通用 revision、review、source binding 和 operation log，单类事件及总时间线均设上限并返回截断信息。

## 验证方案

- 自审拒绝、驳回原因必填、通过后 apply、正式内容普通 PUT 拒绝。
- `clan / branch_subtree` 权限矩阵及兄弟支派越权拒绝。
- `public / clan_only / branch_only / relatives_only / private / sealed` 可见性与最小披露测试。
- 跨宗族来源绑定、不可见来源/目标绑定拒绝。
- 归档与首页精选必须经审核，apply 后状态和日志正确。
- tracking 搜索、统一 trace、事件聚合和截断测试。
- PostgreSQL/Flyway 启动、`mvn test`、API Contract、TypeScript/Frontend Build、迁移治理。

## 已知风险与回滚

- **通用框架兼容**：扩展 target type 时不得改变人物、关系、来源和支派现有行为；采用目标适配器和增量分支判断。
- **隐私泄露**：不存在与无权访问统一返回 not found 语义；`sealed` 不返回标题、正文、摘录、附件名称和计数细节。
- **审核 apply 原子性**：审核状态和文化对象生效必须在同一事务边界，失败不允许部分生效。
- **数据库变更**：权限种子和索引使用幂等插入/新版本迁移；回滚采用更高版本前向补偿，不修改历史迁移。
- **追踪性能**：所有聚合查询必须限定 target、clan、时间线数量和单类事件数量，禁止无界全表扫描。

## 当前恢复检查点

- 当前 Issue：#168
- 当前分支：`agent/issue-168-culture-governance`
- Draft PR：待创建
- 最新基线：`0aeaa01a8d6feabbb521e7687de203782a7027c9`
- 最后完成任务：刷新规则、需求和前置实现，建立分支与任务文件
- 当前进行中：创建 Draft PR 并回写 Issue
- 当前任务累计耗时：已累计约 2 分钟
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，回写真实 PR 编号，然后读取通用 review/source/tracking 实现
- 最后更新时间：2026-07-14 19:16，北京时间
