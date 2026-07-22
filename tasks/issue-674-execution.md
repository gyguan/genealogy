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
| 2 | 将详情 TAB 更新改为替换当前历史记录 | 进行中 | URL 保留 TAB，不新增历史 |
| 3 | 增加浏览器历史行为回归测试 | 待开始 | `pushState=0`、`replaceState=1` |
| 4 | 验证查询条件及返回地址状态保留 | 待开始 | history state 不丢失 |
| 5 | 完成 CI、Review 和合入 | 待开始 | 全部门禁通过 |

## 恢复检查点

- 当前阶段：根因确认，准备调整人物详情 TAB URL 写入策略。
- 风险：不得影响人物列表查询条件、分页、滚动位置和直接访问详情页兜底返回。
- 下一步：修改 `personArchiveUrlState.ts` 并补充测试。
- 最后更新时间：2026-07-22 09:09（多伦多时间）
