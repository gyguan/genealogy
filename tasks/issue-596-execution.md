# Issue #596 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/596
- 分支：`agent/issue-596-person-draft-delete`
- PR：https://github.com/gyguan/genealogy/pull/599
- 目标：在建谱向导人物列表为草稿人物补充删除入口。

## 任务

| 序号 | 任务 | 状态 |
|---:|---|---|
| 1 | 复核人物列表、状态和删除 API | 已完成 |
| 2 | 人物服务增加删除调用 | 已完成 |
| 3 | 人物列表增加删除入口和刷新逻辑 | 已完成 |
| 4 | 测试、TypeScript、构建和 API 契约 | 已完成 |
| 5 | 复核并合入 main | 进行中 |

## 验证

- `test:draft-delete`：通过，包含人物入口、DELETE 路径和删除后刷新断言。
- Frontend CI #1082：通过。
- API Contract #1471：通过。
- Tree 文件未修改。

## 边界

- 仅草稿人物可直接删除。
- 不修改后端接口、删除权限或状态规则。
- 不增加批量删除，不修改世系图谱。
