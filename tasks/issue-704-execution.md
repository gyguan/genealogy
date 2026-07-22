# Issue #704 执行记录

- 修复建谱向导宗族草稿删除 400 错误无明确提示的问题。
- 通用 `DraftDeleteButton` 使用组件级 message holder，并在失败后关闭确认气泡。
- 宗族步骤增加持续可见的删除失败 Alert，优先展示后端 `message`。
- 删除失败不刷新列表、不清空当前宗族上下文。
- 增加静态回归测试和 Chromium E2E，覆盖 `CLAN_HAS_BRANCHES`。
- 验证范围：draft delete tests、TypeScript、生产构建、向导 Chromium E2E、Frontend CI。
