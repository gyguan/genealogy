# Issue #553 执行看板

## 任务信息

- Issue：#553 `[数据导入 P1-02] 调整查询结果 Card 头部规范间距`
- 分支：`agent/issue-553-import-result-header-spacing`
- Draft PR：#554
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：定向 Chromium E2E + TypeScript + Build + API Check

## DEFINE

### 目标

按前端页面规范统一结果 Card Header 的 16px 内边距，并使桌面端标题组和“新建导入”按钮垂直居中。

### 范围

- 调整 `import-workbench.css` 中结果 Card Header 间距和对齐。
- 增加桌面、390px 视口的 E2E 几何断言。

### 非目标

- 不调整查询条件、任务列表、按钮文案和业务流程。
- 不修改 API、后端、权限或导入逻辑。

## PLAN

- [x] 核对页面规范和当前 CSS。
- [x] 创建 Issue、分支和 Draft PR。
- [x] 显式设置桌面端 16px Header 内边距与垂直居中。
- [x] 将移动端 Header 上下内边距由 12px 统一为 16px。
- [x] 增加 E2E 间距与对齐断言。
- [x] 执行 Import Page Gate 和 Frontend CI。
- [x] 检查最终 diff、PR 和 CI，满足门禁后合入 main。

## 实现结果

1. 结果 Card Header 水平内边距显式设置为 16px。
2. 桌面端标题与按钮区域上下内边距均为 16px，Header 最小高度为 76px。
3. 桌面端标题组与“新建导入”按钮按垂直中心对齐。
4. 390px 视口下 Header 上下内边距由 12px 调整为 16px，按钮仍保持整行布局。
5. E2E 新增真实浏览器几何校验，覆盖标题与按钮顶部距离、桌面中心对齐和移动端内边距。

## 验证结果

最终实现提交：`7444b8c4ab79e8925b5b38a8eef26cca42f8a90f`。

- 现有导入状态测试：通过。
- 导入任务查询模型测试：通过。
- TypeScript：通过。
- 生产构建：通过。
- API 契约检查：通过。
- Chromium E2E：通过。
- Import Page Gate：通过。
- Frontend CI：通过。

## 失败修复记录

首轮 E2E 使用 `.import-result-card .ant-card-head-title > div`，同时匹配了结果 Card 内嵌移动任务 Card 的标题节点，触发 Playwright strict-mode 冲突。已将定位器收紧到结果 Card 的直接 Header；间距断言本身未放宽，复跑通过。

## 治理记录

本任务在重新读取最新根规则前已先提交两笔样式/测试变更，晚于规则要求的“执行检查点与 Draft PR 先于业务代码”顺序。发现后已立即补齐执行看板和 Draft PR，后续严格按门禁完成验证与合入。变更仅涉及 CSS 与测试，未直接写入 main，也未绕过 CI。

## 风险与回滚

纯样式和 E2E 断言调整；回退对应 PR 即可。
