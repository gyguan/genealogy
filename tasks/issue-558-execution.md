# Issue #558 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/558
- 目标：修正查询结果中“中心人物”和“图内定位”组件未对齐的问题。
- 工作分支：`agent/issue-558-align-lineage-toolbar`
- Issue 类型：样式 / 单页面前端小改
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：TypeScript + 前端构建 + diff 检查
- 拆分结论：未命中拆分信号；仅调整结果区工具栏结构与样式。
- 影响模块：`frontend/genealogy-web/src/features/tree`。

## 实现范围

1. 人物中心 TAB 中两个组件共用一致的字段容器。
2. 标签、Select 顶部、控件高度和宽度完全对齐。
3. 中心人物说明移到工具栏下方，不再使用单个 Form.Item 的 `extra`。
4. 支派全局保持图内定位右对齐。
5. 移动端保持单列布局。

## 非目标

- 不修改查询和图谱请求逻辑。
- 不修改 API、后端、数据库或 Tree 核心模型。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 建立 Issue、分支与执行现场 | ✅ 已完成 | 约 5 分钟 | Issue #558 与当前检查点 |
| 2 | 调整结果区工具栏结构与样式 | ⏳ 待处理 | — | 下一步最小任务 |
| 3 | 执行验证、检查 diff 并完成收尾 | ⏳ 待处理 | — | TypeScript + build |

## 验证方案

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
```

另行检查：

- 人物中心两个 Select 同行同宽同高；
- 标签和控件基线一致；
- 支派全局布局无回退；
- 移动端单列展示；
- diff 无无关修改。

## 恢复检查点

- 当前 Issue：#558
- 当前分支：`agent/issue-558-align-lineage-toolbar`
- 当前 Draft PR：待创建
- 最后完成任务：建立执行现场
- 当前进行中任务：无
- CI 状态：未开始
- 未解决 Review：无
- 下一步最小任务：创建 Draft PR 后调整工具栏字段容器
- 最后更新时间：2026-07-20 15:54（北京时间）
