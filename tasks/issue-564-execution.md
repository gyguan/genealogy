# Issue #564 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/564
- 目标：为“人物中心”TAB实现独立中心关系图布局，支派全局保持现有分层布局。
- 工作分支：`agent/issue-564-person-centered-layout`
- Issue 类型：Tree 前端布局模型调整
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：Tree 聚焦测试 + TypeScript + 生产构建 + diff 检查
- 影响模块：`frontend/genealogy-web/src/features/tree`

## 实现范围

1. 中心人物固定居中。
2. 父母位于上方，子女位于下方。
3. 配偶位于中心人物左右近邻。
4. 兄弟姐妹通过共同父母推导，与中心人物同层并位于配偶外侧。
5. 更远祖先、后代及其他节点保留在外层，避免查询数据丢失。
6. 支派全局继续使用现有 `buildLineageLayout`。
7. 增加模型测试覆盖核心相对位置与模式隔离。

## 任务看板

| 序号 | 任务 | 状态 | 结果或说明 |
|---|---|---|---|
| 1 | 建立 Issue、分支和执行现场 | ✅ 已完成 | Issue #564、当前分支与本检查点 |
| 2 | 实现人物中心关系分组和专用布局 | ⏳ 待处理 | 下一步最小任务 |
| 3 | 接入 Canvas 与页面模式 | ⏳ 待处理 | — |
| 4 | 补充测试、运行 CI、复核 diff 并合入 | ⏳ 待处理 | — |

## 验证方案

```bash
cd frontend/genealogy-web
npm run test:tree
npm run typecheck
npm run build
```

## 恢复检查点

- 当前 Issue：#564
- 当前分支：`agent/issue-564-person-centered-layout`
- 当前 Draft PR：待创建
- CI 状态：未开始
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，读取完整布局模型后实现中心关系图
- 最后更新时间：2026-07-20 16:25（北京时间）
