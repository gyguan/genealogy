# Issue #606 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/606
- 分支：`agent/issue-606-person-draft-delete-fix`
- 目标：修复建谱向导草稿人物删除未直接生效。

## 任务

| 序号 | 任务 | 状态 |
|---:|---|---|
| 1 | 定位前端与后端删除链路 | 已完成 |
| 2 | 草稿人物分流到直接删除服务 | 已完成 |
| 3 | 保留非草稿人物删除审核流程 | 已完成 |
| 4 | 增加后端回归测试并执行 CI | 已完成 |
| 5 | 复核并合入 main | 已完成 |

## 根因

`PersonController` 调用 `PersonRevisionApplicationService.delete()`；该方法原先对所有状态都创建删除 Revision，导致草稿人物只进入待审核状态而没有被软删除。

## 验证

- Backend CI #2687：通过。
- Java 17 编译、完整单元测试和打包：通过。
- 草稿人物直接删除测试：通过。
- 正式人物删除审核回归测试：通过。

## 边界

- 不修改前端接口和 API 契约。
- 不级联删除人物关系。
- 不修改世系图谱。
