# Issue #1027 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1027
- 前置依赖：#1026 已通过 PR #1030 合入 `main`，Merge Commit `d876a61a70224cc9937e8279ba9e67f1eef059c2`。
- 目标：将人物档案、来源资料库、修谱任务管理三个高偏差页面迁移到统一查询 Card 视觉契约。
- 非目标：结果区、表格列、详情流程、API、URL、分页、排序和权限语义。
- Issue 类型：多页面查询 Card 接入
- 流程强度：标准
- 验证强度：三页聚焦测试 + DOM/CSS Governance + TypeScript / 构建 + 现有视觉门禁
- 耗时口径：只记录活跃执行耗时；CI / Review 等待不计入活跃耗时。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | 结果 |
|---|---|---|---|---|
| 1 | 恢复规则、Issue 与三页实现现场 | ✅ 已完成 | 约 8 分钟 | 已确认三页真实路由组件和既有测试 |
| 2 | 迁移人物档案查询 Card | ✅ 已完成 | 约 12 分钟 | Input/Select 使用统一 Field；高级条件移除 Collapse 灰框；增加隐藏条件数量 |
| 3 | 迁移来源资料库查询 Card | ✅ 已完成 | 约 14 分钟 | 基础与展开统一四列；移除 Collapse Header；接入共享动作区 |
| 4 | 迁移修谱任务查询 Card | ✅ 已完成 | 约 11 分钟 | 展开字段全部单列宽；创建时间不跨列；标题与动作统一 |
| 5 | 治理测试、Review、CI 与合入收尾 | 🔄 进行中 | 已累计约 8 分钟 | Frontend CI、Security、Visual 已通过；真实 E2E 旧标题断言已修复，最终矩阵重跑中 |

## 实现结果

- 三页全部使用 `StandardQueryPanel / StandardQueryGrid / StandardQueryField / StandardAdvancedFilters / StandardQueryActions`。
- 查询 Card 标题统一为“查询条件”。
- 三页更多筛选均显示生效条件数量，重置 / 查询的主次、图标、宽度和 Loading 联动由共享组件决定。
- 人物档案不再使用高级筛选 Collapse，姓名 / 关键词与 Select 共享统一控件尺寸。
- 来源资料库基础与展开字段使用同一四列列线。
- 修谱任务创建时间与其他字段同宽，不再存在 `xl=4 / xl=8` 查询字段。
- `StandardAdvancedFilters` 补充原生 HTML 属性支持，用于可访问 `id / aria-controls` 关联。
- 未修改查询 API、URL、分页、排序、权限和数据范围。

## 验证结果

- DOM/CSS Governance：✅
- 人物档案聚焦测试：✅
- 修谱任务聚焦测试：✅
- TypeScript：✅
- 生产构建：✅
- Security Penetration：✅
- Visual Release Gate：✅
- Functional E2E：旧标题断言已更新，最终 Head 重跑中
- Multi-Browser：最终 Head 重跑中
- Review Thread：0

## 恢复检查点

- 分支：`agent/issue-1027-query-card-person-source-workbench`
- PR：#1031（Ready）
- 当前阶段：最终门禁与合入收尾
- 当前业务 Head：`6c46ac057848a9a0e4495142670602b8e5ec5c59`
- 下一步：确认最终工作流全绿，更新 PR 结论并 Squash 合入
- 最后更新时间：2026-07-30 16:48（北京时间）
