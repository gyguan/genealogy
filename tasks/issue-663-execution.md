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
| 3 | 改为非破坏式人数同步 | 进行中 | 不再写入 React 节点 `textContent` |
| 4 | 执行前端门禁 | 待开始 | 测试 / TypeScript / build |
| 5 | Review 并合入 main | 待开始 | CI / merge |

## 修复方案

- 保留原始 `Typography.Text` 及其 React 子节点；
- 从原始文本读取人数并写入 `data-member-total-count`；
- 使用 CSS 伪元素展示“（共N名）”；
- 原始文本仅视觉隐藏，不从 DOM 删除，不修改分页总数。

## 验收标准

- 接口返回成员后，标题从初始值更新为真实总数；
- 查询、重置、切换宗族、翻页后标题总数可继续变化；
- 标题格式保持“成员列表（共N名）”；
- 邀请与授权按钮布局不变；
- 前端门禁全部通过。
