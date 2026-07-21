# Issue #592 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/592
- 分支：`agent/issue-592-generation-delete-click`
- 目标：修复建谱向导字辈方案“删除草稿”确认链路未触发 DELETE 请求。

## 任务

| 序号 | 任务 | 状态 |
|---:|---|---|
| 1 | 复核按钮、确认组件、服务调用链路 | 已完成 |
| 2 | 将共享删除确认改为受控随组件渲染 | 进行中 |
| 3 | 补充回归测试 | 待处理 |
| 4 | Frontend CI 与 API Contract | 待处理 |
| 5 | 复核并合入 main | 待处理 |

## 根因

共享 `DraftDeleteButton` 使用静态 `Modal.confirm()`，实际 DELETE 回调只存在于静态弹窗的 `onOk`。在建谱向导字辈方案表格中确认链路没有可靠挂载，导致点击后无法进入 `onDelete`。

## 修复边界

- 不修改删除 API 和后端规则。
- 不放宽非草稿对象删除资格。
- 不修改建谱向导总体布局。
- 继续保留二次确认、防重复提交、真实错误提示和删除后刷新。
