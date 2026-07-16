# Issue #444 执行看板

- Issue：[#444 展开全部筛选条件并统一工具栏对齐](https://github.com/gyguan/genealogy/issues/444)
- 分支：`agent/issue-444-expand-lineage-filters`
- PR：[#446](https://github.com/gyguan/genealogy/pull/446)
- 目标：移除“更多设置”，将全部筛选条件直接展开并统一对齐。
- 范围：`LineageTreeProductPage.tsx`、`lineage-workbench-issue376.css`。
- 非目标：不修改 Tree API、URL 状态、查询逻辑和数据模型。

## 完成结果

- 人物中心：图内定位、查看方向、关系范围、展开深度、更新图谱
- 支派全局：图内定位、关系范围、展开深度、包含下级支派、更新图谱
- 所有控件采用统一栅格、统一高度与底部基线
- 无修改时不显示状态；存在未应用修改时显示“条件待应用”
- 已移除“更多设置”与旧覆盖样式

## 验证结果

- Tree graph model：通过
- TypeScript typecheck：通过
- Production build：通过
- Frontend CI：run 29477242038 成功
- 临时自动修改 workflow：已从分支删除

## 最终检查点

- 未解决 Review：无
- 已知阻塞：无
- 状态：待合入 main
