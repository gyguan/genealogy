# Issue #877 执行看板

- Issue：#877 `[前端样式治理] 按 Ant Design 全局规范统一页面视觉与基础组件`
- 分支：`agent/issue-877-ant-design-governance`
- Draft PR：#878
- 目标：统一 Ant Design Token、基础排版与数字规范，清理全局 CSS 污染和迁移桥接，并推进重点页面基础组件收敛。
- 非目标：世系算法、文化内容重设计、移动端完整重构、暗色主题上线。
- 类型：跨模块前端架构治理
- 流程强度：重型
- 契约强度：无 API 变更
- 验证强度：TypeScript、构建、样式治理测试及相关页面回归
- 拆分结论：命中大范围拆分信号；采用单一总 PR、原子提交分阶段交付，避免多个并行 PR 引入样式基线冲突。
- 影响模块：应用壳、Shared UI、全局样式、工作台、人物、世系、来源等页面。

## 原子任务

| 任务 | 状态 | 验收 |
|---|---|---|
| T1 建立全局设计 Token 与排版基线 | 已完成 | 字体、颜色、背景、字阶、数字等宽统一 |
| T2 清理高风险全局选择器和 bridge 覆盖 | 进行中 | 不再由 `.field/.actions/.data-table` 污染 Ant 组件 |
| T3 收敛正式页面原型样式与基础组件 | 待开始 | 工作台等页面减少自研基础组件依赖 |
| T4 更新治理测试与 CSS 架构文档 | 待开始 | CI 阻止新增污染选择器、任意 `!important` 和非 Token 基线 |
| T5 全量验证、Review 与合入 | 待开始 | typecheck/build/dom-governance 通过，PR 合入 main |

## 已完成变更

- `AppProviders.tsx`：集中维护完整系统字体栈、字阶、行高、三级/禁用文字 Token 和 14px 表单标签基线。
- `styles/design-system.css`：建立全局排版、正文背景、表单控件继承和 `tabular-nums` 数字基线。
- `styles/index.css`：将设计基线作为权威全局层加载。
- `antd-bridge.css`：删除重复 body 基线，恢复 14px 表单标签，补充用户入口可见焦点样式，并减少 13px 非标准字阶。

## 验证方案

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run test:dom-governance
```

根据实际改动补充相关定向测试；无法通过远程连接直接执行的命令必须由 CI 作为事实依据。

## 风险

- 历史 CSS 使用范围广，直接删除可能造成页面回归；优先通过作用域收缩和 Token 化渐进退出。
- 世系画布和文化展示存在合理自定义视觉，不进行机械替换。
- Issue 范围大，必须逐任务提交并同步恢复点。
- 当前尚未完成正式页面自研基础组件迁移，不能将 Issue 标记完成。

## 恢复检查点

- 最后完成：T1 全局设计 Token 与排版基线；T2 第一批 bridge 排版与焦点修复
- 当前任务：T2 清理高风险全局选择器和 bridge 覆盖
- 最新业务提交：`5fd0983e7c9a41f3789e0fda836907d6a1dba3bb`
- CI：等待当前提交对应的 GitHub Actions 结果
- 阻塞：无
- 下一步最小任务：读取 `styles.css` 使用方，将 `.field/.actions/.data-table` 收缩到 legacy 作用域并同步治理测试
- 活跃耗时：仅记录本次已发生执行活动，不补算历史时间
- 外部等待：GitHub Actions 验证
- 最后更新时间：2026-07-28（北京时间）
