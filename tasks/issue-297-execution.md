# Issue #297 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/297
- 目标：将文化场所新增和编辑迁移为可恢复的独立编辑页面，并使用人物业务搜索选择器替代关联人物技术 ID 输入和展示。
- 工作分支：`agent/issue-297-site-editor`
- Draft PR：#335
- 所属总控：#291
- 当前基线：`main` 已包含 #296 / PR #330 的共享编辑页、URL 状态和人物选择能力。

## 本次范围

- 复用 #296 的共享编辑页壳、编辑 URL 状态和人物业务选择器；
- 增加文化场所创建/编辑 URL 状态和刷新恢复；
- 将关联人物改为按姓名检索的业务选择器；
- 删除文化场所详情中 `人物 #<id>` 的技术 ID 回退展示；
- 保持坐标边界、附件、查询、审核和权限语义。

## 非目标

- 不修改数据库、OpenAPI、后端接口和审核生效规则；
- 不整改文化场所列表、详情 Drawer 和治理弹窗的整体页面规范；
- 不新增地图 SDK、地图选点或 GIS；
- 不复制第二套编辑页共享组件。

## 交付分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及，复用 `/persons/search` 和现有文化场所 API
- 验证强度：聚焦代码复核 + TypeScript + 前端构建 + Culture API Check；浏览器 E2E 作为专项项
- 拆分信号：未新增数据库/API/后端切片；#296 已先行合入，共享资产直接复用

## 执行看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 和现有文化场所实现 | ✅ 已完成 | 约 8 分钟 | 确认主干使用 780 px Modal 和关联人物 ID |
| 2 | 建立分支、任务看板和 Draft PR | ✅ 已完成 | 约 3 分钟 | PR #335；#296 合入后已重放到最新 main |
| 3 | 实现文化场所独立编辑页和保存闭环 | ✅ 已完成 | 约 10 分钟 | 五组表单；草稿/正式变更；错误保留 |
| 4 | 接入人物业务选择器并移除技术 ID 展示 | ✅ 已完成 | 约 4 分钟 | 复用 #296 共享组件；详情无 ID 回退 |
| 5 | 切换文化场所运行时入口并保持附件/查询能力 | ✅ 已完成 | 约 8 分钟 | 新维护 Tab 启用；附件、追踪和查询保留 |
| 6 | 补充聚焦测试和最简验证 | 🔄 进行中 | 已累计约 5 分钟 | E2E 已补充；等待 rebased Head 自动门禁 |
| 7 | 更新看板、快速 Review、合入并回写 Issue | ⏳ 待处理 | — | CI 与 Review 完成后执行 |

## 复用资产

- `CultureEditorShell.tsx`：独立编辑页和离开保护；
- `cultureEditorState.ts`：直接 URL、刷新和关闭恢复；
- `CulturePersonSelect.tsx` / `culturePersonService.ts`：权限投影下的人物业务搜索；
- `cultureOptions.ts`、`cultureLibraryService.ts`：治理字典和支派选项。

## 影响模块

- `frontend/genealogy-web/src/features/culture/CultureSiteEditorPage.tsx`
- `frontend/genealogy-web/src/features/culture/CultureSiteMaintenanceTab.tsx`
- `frontend/genealogy-web/src/features/culture/CultureProductPage.tsx`
- `frontend/genealogy-web/e2e/culture-sites.spec.ts`
- 不涉及后端、数据库与 OpenAPI 生成文件。

## 验证方案

- 自动/最简：前端 TypeScript、构建、Culture API Check；
- 聚焦：文化场所编辑 URL、人物选择、坐标边界和保存回跳；
- 手工专项：新建、草稿编辑、正式变更、人物搜索、未保存离开、刷新恢复、附件回归。

## 已知风险

- 关联人物不可见时只显示“关联人物姓名不可见”，不得恢复或猜测技术 ID；
- 坐标字段保持原有十进制数值语义，纬度限制 `-90～90`、经度限制 `-180～180`；
- 当前聊天环境无法直接运行浏览器和 npm 依赖，自动验证以 GitHub Actions 为证据；
- 完整 Culture E2E 仍由 #305 最终准出收口。

## 恢复检查点

- 最后完成：#296 已合入；#297 分支已重放到最新 main；
- 当前进行中：重新提交 #297 场所增量并等待自动门禁；
- 下一步最小任务：完成 CI、快速 Review 和合入；
- 外部等待：GitHub Actions；
- 最后更新时间：2026-07-16 10:47（北京时间）。
