# Issue #296 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/296
- 目标：将迁徙事件新增和编辑迁移为可恢复的独立编辑页面，并使用人物业务搜索选择器替代始迁祖技术 ID 输入和展示。
- 工作分支：`agent/issue-296-migration-editor`
- Draft PR：#330
- 所属总控：#291
- 前置依赖：#293 尚未实现；本 Issue 仅补齐 #296/#297 必需的最小共享编辑页基础，不迁移文化资料编辑，不代替 #293 的完整验收。

## 本次范围

- 建立宗族文化复杂编辑页的最小共享页面壳、离开确认和底部固定操作区；
- 增加迁徙事件创建/编辑 URL 状态和刷新恢复；
- 将始迁祖改为按姓名检索的人物业务选择器；
- 删除迁徙详情中 `人物 #<id>` 的技术 ID 回退展示；
- 保持现有迁徙列表、详情、审核和权限语义。

## 非目标

- 不修改数据库、OpenAPI、后端接口和审核生效规则；
- 不整改迁徙列表、详情 Drawer 和治理弹窗的整体页面规范；
- 不实现地图、坐标和迁徙动画；
- 不迁移文化资料编辑页。

## 交付分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及，复用 `/persons/search` 和现有文化 API
- 验证强度：聚焦代码复核 + TypeScript + 前端构建 + Culture API Check；浏览器 E2E 作为手工专项项
- 拆分信号：未新增数据库/API/后端切片；因 #293 未落地，仅纳入两个后续 Issue 共用的最小页面基础

## 执行看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 和现有迁徙/人物检索实现 | ✅ 已完成 | 约 18 分钟 | 确认无既有分支/PR；主干仍使用 Modal 和人物 ID |
| 2 | 建立分支、任务看板和 Draft PR | ✅ 已完成 | 约 2 分钟 | 分支 `agent/issue-296-migration-editor`，PR #330 |
| 3 | 建立共享复杂编辑页壳与编辑 URL 状态 | ✅ 已完成 | 约 6 分钟 | `CultureEditorShell`、`cultureEditorState`、固定操作区和离开保护 |
| 4 | 实现迁徙事件独立编辑页和保存闭环 | ✅ 已完成 | 约 9 分钟 | 五组业务表单；草稿/正式变更语义；失败保留输入 |
| 5 | 接入人物业务搜索选择器并移除技术 ID 展示 | ✅ 已完成 | 约 5 分钟 | 复用 `/persons/search`；显示姓名、支派和代次；无 ID 回退 |
| 6 | 补充聚焦测试和最简验证 | ✅ 已完成 | 约 5 分钟活跃；约 3 分钟外部等待 | URL 状态测试通过；API Contract、TypeScript、生产构建通过；E2E 用例已补充但未在本环境实际执行 |
| 7 | 更新看板、快速 Review、合入并回写 Issue | 🔄 进行中 | 已累计约 3 分钟 | 无未解决 Review 线程；等待最终合入 |

## 复用资产

- 人物检索：`GET /persons/search`；
- 记录归一化：`shared/utils/records.ts`；
- 支派与治理字典：`cultureLibraryService.ts`、`cultureOptions.ts`；
- 编辑页共享能力：`CultureEditorShell.tsx`、`cultureEditorState.ts`、`CulturePersonSelect.tsx`；
- 迁徙 URL 查询状态：`migrationEventUrlState.ts`。

## 影响模块

- `frontend/genealogy-web/src/features/culture/`
- `frontend/genealogy-web/e2e/culture-migrations.spec.ts`
- 不涉及后端、数据库与 OpenAPI 生成文件。

## 验证结果

- ✅ API Contract run `29466710207`：通过；
- ✅ Frontend CI run `29466710259`：TypeScript 与生产构建通过；
- ✅ `cultureEditorState` 聚焦编译与 Node 测试：通过；
- ✅ PR #330 无未解决 Review 线程；
- 📝 Playwright 已补充独立编辑、人物选择、保存回跳和刷新恢复用例；本执行环境未运行浏览器 E2E，不能描述为已通过。

## 风险与约束

- #293 未实现，本分支只包含 #296/#297 必需的最小共享基础；
- `/persons/search` 通过统一适配器消费后端已授权、已脱敏结果，人物姓名不可见时只显示安全业务文案；
- 浏览器 E2E 未在本执行环境实际运行，后续 #305 最终准出仍需执行完整 Culture E2E；
- `main` 在实现期间合入了首页、建谱向导和人物编辑页面变更，本 PR 未修改这些文件，合入时仍需由 GitHub 做最终冲突判定。

## 恢复检查点

- 最后完成：实现、聚焦测试、自动门禁和快速 Review；
- 当前进行中：将 PR 转为 Ready 并合入 `main`；
- 下一步最小任务：合入后回写 Issue #296，并将 PR #335 Base 调整为 `main`；
- 外部等待：无；
- 最后更新时间：2026-07-16 10:36（北京时间）。
