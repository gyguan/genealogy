# Issue #1029 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1029
- 前置依赖：共享查询 Card 契约 #1026 与首批页面迁移 #1027 已进入当前基线。
- 目标：将文化资料、文化场所、迁徙脉络与导入中心查询区迁移到统一查询 Card 视觉契约。
- 实现范围：四类查询区的共享 Panel / Grid / Field / AdvancedFilters / Actions 接入，以及聚焦治理测试。
- 非目标：查询 API、URL、分页、排序、权限、导入审核和文化资料治理语义。
- Issue 类型：多页面前端视觉治理。
- 流程强度：标准；契约强度：不涉及后端 API；验证强度：治理测试 + TypeScript + 生产构建 + API 契约检查。
- 拆分结论：不再拆分；变更复用同一共享组件，未命中数据库、公共 API、权限或跨模块状态机拆分信号。
- 耗时口径：仅记录本次活跃实现与验证时间，外部等待不计入。
- 复用资产：`StandardQueryPanel`、`StandardQueryGrid`、`StandardQueryField`、`StandardAdvancedFilters`、`StandardQueryActions` 与既有视觉契约治理测试。

## 任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | 结果 |
|---|---|---|---|---|
| 1 | 刷新规则、恢复 Issue 系列与页面现场 | ✅ 已完成 | 约 8 分钟 | 确认共享契约和待迁移的文化、导入查询区 |
| 2 | 迁移三类文化查询 Card | ✅ 已完成 | 约 12 分钟 | 基础与展开字段统一使用 4→2→1 Grid，展开条件保持挂载 |
| 3 | 迁移导入中心查询 Card | ✅ 已完成 | 约 8 分钟 | 移除页面自建 Row/Col 和查询图标，动作主次交由共享组件 |
| 4 | 补充治理测试并完成验证 | ✅ 已完成 | 约 7 分钟 | 治理测试、TypeScript、生产构建与 API 契约检查均通过 |

## 兼容、风险与回滚

- 未修改 OpenAPI、请求参数、URL 状态或权限判断，兼容性影响仅限查询 Card DOM 与视觉布局。
- `StandardAdvancedFilters` 使用 `hidden` 保持 Form 字段挂载，展开/收起不会清空已生效条件。
- 回滚可恢复本 Issue Commit；不涉及数据库迁移、数据补偿或后端发布顺序。

## 验证结果

- TypeScript：✅ `npm run typecheck`
- 查询视觉治理：✅ 7 项通过
- 生产构建：✅ 通过（仅既有大 Chunk 提示）
- API 契约：✅ 通过
- Diff 范围：✅ 仅文化/导入查询区、聚焦治理测试和执行看板

## 恢复检查点

- 当前 Issue：#1029
- 当前分支：`work`
- Draft PR：待创建
- 最后完成任务：文化与导入查询 Card 迁移、治理测试补充
- 当前进行中任务：提交与 PR 元数据收尾
- 当前任务累计耗时：约 7 分钟
- 最新 Commit：待提交
- CI 状态：本地 TypeScript 已通过，远程 CI 待 PR
- 未解决 Review：无
- 已知阻塞：无法通过当前环境访问 GitHub Issue API，依据当前仓库中的 #1026 拆分记录恢复范围
- 下一步最小任务：提交变更并创建 PR 元数据
- 最后更新时间：2026-07-30 17:50（北京时间）
