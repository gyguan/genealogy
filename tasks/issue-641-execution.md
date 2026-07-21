# Issue #641 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/641
- 分支：`agent/issue-641-prompt-copy-cleanup`
- 目标：清理页面中重复说明、重复结果数量和重复空态提示。

## 任务

| 序号 | 任务 | 状态 |
|---:|---|---|
| 1 | 盘点 P0 可清理提示并确认保留边界 | 已完成 |
| 2 | 清理首页、人物、来源和文化页面重复文案 | 已完成 |
| 3 | 清理导入、工作台、审核和成员权限重复文案 | 已完成 |
| 4 | 增加提示文案语义回归测试 | 已完成 |
| 5 | Frontend CI、专项 E2E 及合入验证 | 已完成 |

## 验证

- Frontend CI #1162：通过。
- API Contract #1494：通过。
- Import Page Gate #18：通过，包含 Chromium E2E。
- Tracking Page Gate #18：通过，包含 Chromium E2E。
- Culture Page Gate #135：通过，包含 Chromium E2E。
- 提示文案语义回归、TypeScript 和生产构建：通过。

## 保留边界

- 保留权限不足、访问范围和脱敏提示。
- 保留未保存离开、删除、归档、停用等危险操作确认。
- 保留审核后生效、审核期间原数据继续有效等规则说明。
- 保留首次加载失败、刷新失败但继续展示旧数据等状态提示。
- 保留批量操作仅作用于当前页或当前选择范围的说明。
