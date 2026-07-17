# Issue #541 执行看板

- Issue：[#541 按双 Card 多 TAB 规范重构宗族文化页面](https://github.com/gyguan/genealogy/issues/541)
- 目标：将宗族文化的文化资料、迁徙脉络、文化场所统一重构为“查询 Card + 结果 Card”双 Card 多 TAB 页面。
- 工作分支：`agent/issue-541-culture-page-refactor`
- 最后更新时间：2026-07-17 19:44（北京时间）

## 范围

### 本次实现

- 移除宗族文化独立说明 Card。
- 将模块标题、三个 Tabs 和查询表单统一收口到查询 Card。
- 各 Tab 默认一行四个常用查询条件，低频条件进入更多筛选。
- 查询条件和更多筛选区域不使用分隔线。
- 多选查询下拉补齐全选、清空和搜索能力。
- 结果 Card 的标题、总数和新增按钮随当前 Tab 变化。
- 保持现有 URL 状态、按需加载、详情 Drawer、编辑页、权限和错误处理。
- 更新文化模块聚焦测试与页面模式 E2E。

### 非目标

- 不修改 OpenAPI、后端接口、数据库或领域模型。
- 不改变审核、归档、删除和权限语义。
- 不重做详情 Drawer 和编辑表单。
- 不引入新依赖或全局状态库。

## 任务分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦测试 + 类型检查 + 构建
- 拆分信号：未命中；改动集中在现有文化模块页面组合、样式和测试，可在一个 Issue 内完成闭环
- 活跃耗时口径：仅记录规则/现场读取、代码修改、聚焦验证、diff 检查和 GitHub 收尾；CI 等待单独记录
- 外部等待：当前无

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、建立 Issue、分支和执行检查点 | ✅ 已完成 | 约 5 分钟 | 已确认标准流程；本提交为业务代码前检查点 |
| 2 | 读取三个 Tab 现有实现并确定最小重构边界 | 🔄 进行中 | 已累计 <1 分钟 | 下一步读取页面、样式、状态模型和测试 |
| 3 | 实现统一双 Card 多 TAB 页面骨架与查询交互 | ⏳ 待处理 | — |  |
| 4 | 更新样式及文化模块聚焦测试 | ⏳ 待处理 | — |  |
| 5 | 执行最简门禁并检查最终 diff | ⏳ 待处理 | — | `test:culture-shell`、`typecheck`、`build`、diff 检查 |
| 6 | 更新 PR/Issue 看板并完成合入收尾 | ⏳ 待处理 | — |  |

## 影响模块

- `frontend/genealogy-web/src/features/culture/`
- `frontend/genealogy-web/e2e/culture-page-pattern.spec.ts`
- 可能涉及文化模块已有单元测试文件

## 复用资产

- 复用 `CultureProductPage` 的 Tab URL 状态和按需挂载逻辑。
- 复用三个 Tab 现有服务、详情 Drawer、编辑页和权限动作。
- 复用 `culturePagePatterns` 配置和现有 Playwright Mock。
- 复用已有文化模块定向测试脚本，不新增测试框架。

## 验证方案

```bash
cd frontend/genealogy-web
npm run test:culture-shell
npm run typecheck
npm run build
```

如可执行环境支持，再运行：

```bash
npm run test:culture
```

## 已知风险

- 三个 Tab 当前各自包含页面头、查询 Card 和结果 Card，统一骨架时需要避免重复渲染 Tabs 或主操作。
- 现有 E2E 依赖按钮文案和 DOM class，重构后需同步更新定位器。
- 多选全选能力应保持查询状态和 URL 序列化兼容，不改变 API 参数。

## 恢复检查点

- 已创建 Issue #541。
- 已从最新 `main` 创建分支 `agent/issue-541-culture-page-refactor`。
- 当前尚未修改业务代码。
- 下一步：读取 `CultureProductPage`、三个 StandardTab、`CultureSearchHeader`、`culture.css` 和文化页面模式测试，确定最小组件调整方案。
