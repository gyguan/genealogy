# Issue #674 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/674
- 分支：`agent/issue-674-person-detail-tab-history`
- 目标：人物详情页切换多个 TAB 后，点击一次“返回人物档案”即可回到查询列表。
- 根因：TAB 切换通过 `pushState` 重复增加浏览器历史记录。
- 契约强度：纯前端路由行为调整，不涉及后端接口。
- 验证强度：人物档案 URL 状态测试 + TypeScript + 生产构建。

## 任务

| 序号 | 任务 | 状态 | 验证 |
|---:|---|---|---|
| 1 | 定位 TAB 历史栈累积原因 | 已完成 | `writePersonDetailTab(tab, 'push')` |
| 2 | 将详情 TAB 更新改为替换当前历史记录 | 已完成 | URL 保留 TAB，不新增历史 |
| 3 | 增加浏览器历史行为回归测试 | 已完成 | 连续切换时 `pushState=0`、`replaceState=4` |
| 4 | 验证查询条件及返回地址状态保留 | 已完成 | returnUrl 与滚动状态对象保持不变 |
| 5 | 完成 CI、Review 和合入 | 已完成 | Frontend CI #1259 成功 |

## Review 结论

- Correctness：TAB 仍同步到 URL，但不会增加 history 长度；
- Navigation：返回按钮仍使用进入详情页时唯一的历史记录，一次返回查询列表；
- Compatibility：保留现有调用参数，避免扩大改动范围；
- Scope：不修改详情进入、列表查询、编辑入口、权限与后端接口。

## 验证结果

- 人物档案 URL 状态及历史行为测试：成功；
- 既有前端测试：成功；
- TypeScript：成功；
- 生产构建：成功；
- Frontend CI #1259：成功。

## 恢复检查点

- 当前阶段：实现、测试与 Review 已完成，等待合入。
- 未解决风险：无。
- 下一步：PR Ready 后 squash 合入。
- 最后更新时间：2026-07-22 09:14（多伦多时间）
