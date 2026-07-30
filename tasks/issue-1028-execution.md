# Issue #1028 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1028
- 目标：将世系图谱、成员与权限、审核中心查询 Card 迁移到 #1026 的共享查询字段与动作契约。
- 分支：`agent/issue-1028-query-card-consistency`
- 实现范围：三个页面查询区、聚焦治理测试；不修改 API、权限、分页和业务查询语义。

## 任务

| 序号 | 任务 | 状态 |
|---|---|---|
| 1 | 读取 #1028、#1026 及三个页面现场 | ✅ |
| 2 | 世系图谱查询 Card 迁移 | 🔄 |
| 3 | 成员与权限查询 Card 迁移 | 🔄 |
| 4 | 审核中心查询 Card 迁移 | 🔄 |
| 5 | 聚焦测试、TypeScript 与构建 | 🔄 |
| 6 | PR 与 CI 收尾 | 🔄 |

## 验证目标

- `node --test src/styles/Issue1028QueryCardMigration.test.mjs`
- `npm run test:tree`
- `npm run test:members`
- `npm run test:reviews`
- `npm run typecheck`
- `npm run build`
