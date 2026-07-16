# Issue #444 执行看板

- Issue：[#444 展开全部筛选条件并统一工具栏对齐](https://github.com/gyguan/genealogy/issues/444)
- 分支：`agent/issue-444-expand-lineage-filters`
- PR：[#446](https://github.com/gyguan/genealogy/pull/446)
- 目标：移除“更多设置”，将全部筛选条件直接展开并统一对齐。
- 范围：`LineageTreeProductPage.tsx`、`lineage-workbench-issue376.css`。
- 非目标：不修改 Tree API、URL 状态、查询逻辑和数据模型。

## 任务

| 任务 | 状态 | 结果 |
|---|---|---|
| 建立 Issue、分支、看板和 Draft PR | ✅ | 完成 |
| 展开全部筛选条件并重构工具栏栅格 | ✅ | 人物/支派模式条件全部直接展示 |
| 清理旧工具栏覆盖样式 | ✅ | 删除旧 grid、Popover 和 more-settings 规则 |
| 执行 CI、检查差异并合入 | ✅ | Frontend CI run 29477242038 成功 |

## 验证结果

- Tree graph model：通过
- TypeScript typecheck：通过
- Production build：通过
- 临时自动修改 workflow：已从分支删除

## 最终结构

- 人物中心：图内定位、查看方向、关系范围、展开深度、更新图谱
- 支派全局：图内定位、关系范围、展开深度、包含下级支派、更新图谱
- 条件无修改时不显示状态；存在未应用修改时显示“条件待应用”

## 最终检查点

- 业务代码与样式已完成
- 最新前端业务变更已通过 CI
- 未解决 Review：无
- 已知阻塞：无
