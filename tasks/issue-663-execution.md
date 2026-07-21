# Issue #663 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/663
- 分支：`agent/issue-663-fix-member-total-sync`
- 目标：修复成员列表标题人数固定为 0 的回归问题。
- 影响模块：`frontend/genealogy-web/src/main.tsx`、`frontend/genealogy-web/src/member-permission-page.css`
- 根因：格式化逻辑通过 `textContent` 重建了 React 管理的文本子节点，导致后续总数更新落在已脱离 DOM 的旧节点上。

## 任务看板

| 序号 | 任务 | 状态 | 验证 |
|---:|---|---|---|
| 1 | 复核成员总数状态与 DOM 归位逻辑 | 已完成 | 已确认 `total` 状态正常，问题发生在展示层 |
| 2 | 建立 Issue、分支与执行看板 | 已完成 | GitHub 现场可恢复 |
| 3 | 改为非破坏式人数同步 | 已完成 | 不再写入 React 节点 `textContent` |
| 4 | 执行前端门禁 | 已完成 | Frontend CI #1209 成功 |
| 5 | Review 并合入 main | 进行中 | 无未解决 Review，等待最终门禁与合入 |

## 修复方案

- 保留原始 `Typography.Text` 及其 React 子节点；
- 从原始文本读取人数并写入 `data-member-total-count`；
- 使用 CSS 伪元素展示“（共N名）”；
- 原始文本仅视觉隐藏，不从 DOM 删除，不修改分页总数。

## 验收结果

- 接口返回成员后，React 可继续更新原始人数文本；
- MutationObserver 读取最新人数并同步到展示属性；
- 标题格式保持“成员列表（共N名）”；
- 邀请与授权按钮布局不变；
- 前端测试、TypeScript 和生产构建全部通过。

## Review 结论

- Correctness：消除固定 0 的直接根因，动态总数更新链路恢复；
- Architecture：沿用现有页面级归位机制，未扩大业务组件改动；
- Performance：仅人数变化时更新 `data` 属性，且观察器不监听属性变化，不会自触发循环；
- Security：未修改接口、权限或成员数据逻辑。
