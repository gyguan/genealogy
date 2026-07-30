# Issue #1028 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1028
- PR：https://github.com/gyguan/genealogy/pull/1039
- 目标：将世系图谱、成员与权限、审核中心查询 Card 迁移到 #1026 的共享查询字段与动作契约。
- 分支：`agent/issue-1028-query-card-consistency`
- 实现范围：三个页面查询区、聚焦治理测试；不修改 API、权限、分页和业务查询语义。

## 任务

| 序号 | 任务 | 状态 |
|---|---|---|
| 1 | 读取 #1028、#1026 及三个页面现场 | ✅ |
| 2 | 世系图谱查询 Card 迁移 | ✅ |
| 3 | 成员与权限查询 Card 迁移 | ✅ |
| 4 | 审核中心查询 Card 迁移 | ✅ |
| 5 | 聚焦测试、TypeScript 与构建 | ✅ |
| 6 | PR 与 CI 收尾 | ✅ |

## 实现结果

- 世系人物中心和支派全局均使用共享 `StandardQueryPanel / Grid / Field / Actions`，查询动作移至 Card 底部，移除查询图标和专属 5/3 列规则。
- 成员查询字段使用标准查询 Field；成员状态进入更多筛选，保留 URL、查询、重置和 Enter 行为。
- 审核中心三个 Tab 使用共享四列查询栅格，日期范围占一个标准字段，动作区位置稳定。
- 新增 `Issue1028QueryCardMigration.test.mjs`，并同步更新既有世系布局治理测试。

## 验证结果

- `node --test src/styles/Issue1028QueryCardMigration.test.mjs`：✅
- `npm run test:tree`：✅
- `npm run test:members`：✅
- `npm run test:reviews`：✅
- `npm run typecheck`：✅
- `npm run build`：✅
- PR Bootstrap：✅，业务提交 `c010f0cd4bb66063f7e4871cc92ae396fc4824d6`

## 影响文件

- `frontend/genealogy-web/src/features/tree/LineageTreeTabbedPage.tsx`
- `frontend/genealogy-web/src/features/tree/lineage-tabbed-page.css`
- `frontend/genealogy-web/src/features/tree/LineageResultToolbarLayout.test.mjs`
- `frontend/genealogy-web/src/features/members/MemberPage.tsx`
- `frontend/genealogy-web/src/features/reviews/ReviewCenterPageContent.tsx`
- `frontend/genealogy-web/src/styles/Issue1028QueryCardMigration.test.mjs`
