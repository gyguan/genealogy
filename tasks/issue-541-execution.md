# Issue #541 执行看板

- Issue：[#541 按双 Card 多 TAB 规范重构宗族文化页面](https://github.com/gyguan/genealogy/issues/541)
- 目标：将宗族文化的文化资料、迁徙脉络、文化场所统一重构为“查询 Card + 结果 Card”双 Card 多 TAB 页面。
- 工作分支：`agent/issue-541-culture-page-refactor`
- Draft PR：[#542](https://github.com/gyguan/genealogy/pull/542)
- 最后更新时间：2026-07-17 20:15（北京时间）

## 范围

### 本次实现

- 移除宗族文化独立说明 Card 和重复外层 Tabs Card。
- 将模块标题、三个 Tabs 和查询表单统一收口到查询 Card。
- 各 Tab 默认一行四个常用查询条件，低频条件进入更多筛选。
- 查询条件和更多筛选区域不使用分隔线。
- 分类、支派、状态、可见范围、已有来源、首页精选、场所类型等多选下拉补齐全选、清空和搜索能力。
- 宗族保持单选上下文：现有列表接口按单个 `clanId` 分页查询，不在前端拼接多宗族结果。
- 结果 Card 的标题、总数、排序和新增按钮随当前 Tab 变化。
- 保持现有 URL 状态、按需加载、详情 Drawer、编辑页、权限和错误处理。
- 更新文化模块聚焦测试与页面模式 E2E。

### 非目标

- 不修改 OpenAPI、后端接口、数据库或领域模型。
- 不改变审核、归档、删除和权限语义。
- 不重做详情 Drawer 和编辑表单。
- 不引入新依赖或全局状态库。
- 不实现跨宗族聚合分页查询。

## 任务分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦测试 + 类型检查 + 构建 + 文化页面 E2E
- 拆分信号：未命中；改动集中在现有文化模块页面组合、样式和测试，可在一个 Issue 内完成闭环
- 活跃耗时口径：仅记录规则/现场读取、代码修改、聚焦验证、diff 检查和 GitHub 收尾；CI 等待单独记录
- 外部等待：约 8 分钟；用于 GitHub Actions 安装 Chromium 和执行浏览器测试，不计入活跃耗时

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、建立 Issue、分支和执行检查点 | ✅ 已完成 | 约 5 分钟 | `672b562`，完成启动门禁 |
| 2 | 读取三个 Tab 现有实现并确定最小重构边界 | ✅ 已完成 | 约 4 分钟 | 保留请求、URL、详情、编辑与权限逻辑，仅调整页面组合和筛选交互 |
| 3 | 实现统一双 Card 多 TAB 页面骨架与查询交互 | ✅ 已完成 | 约 10 分钟 | 移除重复 Card；三个 Tab 统一四项默认筛选、更多筛选和结果 Card 操作 |
| 4 | 更新样式及文化模块聚焦测试 | ✅ 已完成 | 约 6 分钟 | 无筛选分隔线；新增全选/清空组件；更新单测与 Playwright 断言 |
| 5 | 执行门禁、定位 E2E 失败并完成修复 | ✅ 已完成 | 约 12 分钟 | 修复语义标题、首次宗族水合清除 URL 编辑状态和旧文案断言；全部门禁通过 |
| 6 | 更新 PR/Issue 看板并完成合入收尾 | 🔄 进行中 | 已累计约 2 分钟 | 等待本看板提交的最终检查完成后转 Ready 并合入 `main` |

## 影响模块

- `frontend/genealogy-web/src/features/culture/`
- `frontend/genealogy-web/e2e/culture-library.spec.ts`
- `frontend/genealogy-web/e2e/culture-migrations.spec.ts`
- `frontend/genealogy-web/e2e/culture-sites.spec.ts`
- `frontend/genealogy-web/e2e/culture-page-pattern.spec.ts`
- `frontend/genealogy-web/src/features/culture/culturePagePattern.test.mjs`

## 复用资产

- 复用 `CultureProductPage` 的 Tab URL 状态和按需挂载逻辑。
- 复用三个 Tab 现有服务、详情 Drawer、编辑页和权限动作。
- 复用 `culturePagePatterns` 配置和现有 Playwright Mock。
- 复用已有文化模块定向测试脚本，不新增测试框架或依赖。

## 验证结果

最新业务代码提交对应门禁已全部通过：

- `npm run test:culture-shell`：通过
- `npm run typecheck`：通过
- `npm run build`：通过
- Chromium 文化页面 E2E：通过
- Frontend CI 全量前端门禁：通过

失败修复记录：

1. 首轮 E2E 发现查询 Card 标题不是语义化 Heading，既有可访问性定位器无法识别；已在查询 Card 内恢复唯一可见的 `Title level={3}`。
2. 首次加载宗族上下文时，三个 Tab 可能在空 `clanId` 下提前挂载并清除 URL 编辑状态；已延迟业务域挂载至宗族上下文完成水合。
3. 既有移动端测试仍使用“新增资料 / 新增场所”旧文案；已同步为“新增文化资料 / 新增文化场所”。

分支 diff 检查：

- 仅修改文化页面组件、样式、文化测试和本任务看板；
- 未修改 API、后端、数据库、权限或审核逻辑；
- 未引入依赖、生成物或敏感信息。

## 已知边界

- 宗族查询仍是单宗族上下文，原因是当前 API 以单个 `clanId` 分页；跨宗族多选需要独立后端契约和聚合分页设计。
- 多选全选复用现有 URL 数组参数，不改变 API 参数结构。

## 恢复检查点

- 页面实现、样式、全部文化测试和失败修复已经提交到 PR #542。
- 业务代码对应 Frontend CI 与 Culture Page Gate 均已通过。
- 当前仅等待本执行看板提交触发的最终检查。
- 下一步：最终检查通过后更新 PR 描述、转 Ready、合入 `main` 并回写 Issue 完成摘要。
