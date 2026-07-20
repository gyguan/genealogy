# Issue #564 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/564
- 首次 PR：https://github.com/gyguan/genealogy/pull/568
- 本次目标：补齐人物中心关系图真实数据与显式布局接入，确保父母、子女、配偶、兄弟姐妹按原型展示。
- 工作分支：`agent/issue-564-fix-person-centered-layout`
- Issue 类型：Tree 前后端查询与布局修复
- 流程强度：标准
- 契约强度：无 schema 变更；保持既有 Tree API DTO
- 验证强度：后端聚焦测试 + 前端 Tree 测试 + TypeScript + 生产构建 + diff 检查
- 影响模块：`backend/genealogy-backend/src/main/java/com/genealogy/tree`、`frontend/genealogy-web/src/features/tree`

## 复核结论

首次交付存在两个功能缺口：

1. 前端通过给 API 响应附加 `clientLayoutMode` 字段间接选择布局，没有按 Issue 要求由页面显式向 `LineageGraphCanvas` 传递布局模式。
2. 后端人物图 `direction=both` 只遍历祖先链和后代链，不会从中心人物的直接父母向下查询“父母的其他子女”，因此响应通常不包含兄弟姐妹，前端无法展示。

## 本次实现范围

1. 页面显式传递 `person-centered / branch-global` 布局模式。
2. Canvas 按显式模式调用人物中心布局或支派全局布局。
3. 移除人物图响应对象的隐藏客户端布局标记。
4. 后端 `family`、`both` 查询补齐兄弟姐妹节点和父子关系边。
5. 复用现有权限、隐私、状态过滤、节点/边去重与容量限制。
6. 增加后端兄弟姐妹查询测试和前端显式模式隔离测试。

## 任务看板

| 序号 | 任务 | 状态 | 结果或说明 |
|---|---|---|---|
| 1 | 重新读取 main、Issue 与前后端实现，确认真实根因 | ✅ 已完成 | 已确认兄弟姐妹数据缺失及隐式布局路由问题 |
| 2 | 恢复 Issue、创建修复分支和 Draft PR | 🔄 进行中 | 分支已创建；本检查点完成后创建 Draft PR |
| 3 | 后端补齐人物中心兄弟姐妹查询 | ⏳ 待处理 | 复用父母入边与父母出边批量查询 |
| 4 | 前端改为页面显式传递布局模式 | ⏳ 待处理 | Canvas 不再读取响应附加字段 |
| 5 | 补充测试并执行 CI、diff Review、合入 main | ⏳ 待处理 | — |

## 验证方案

```bash
cd backend/genealogy-backend
mvn -Dtest=TreeApplicationServiceTest test

cd frontend/genealogy-web
npm run test:tree
npm run typecheck
npm run build
npm run api:check
```

## 风险与补偿

- 多父母可能重复发现同一兄弟姐妹：复用 `TreeGraphAccumulator` 节点/边去重。
- 隐私或支派范围可能过滤部分亲属：继续以后端现有可见性投影为准，不在前端补全敏感数据。
- 不修改 OpenAPI schema、数据库、关系语义与支派全局布局。

## 恢复检查点

- 当前 Issue：#564（已重新打开）
- 当前分支：`agent/issue-564-fix-person-centered-layout`
- 当前 Draft PR：待创建
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，然后实现后端兄弟姐妹查询
- 最后更新时间：2026-07-20（北京时间）
