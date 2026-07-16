# Issue #302 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/302
- 工作分支：`agent/issue-302-migration-crud`
- 所属总控：#291
- 堆叠基线：#301 / `agent/issue-301-culture-item-crud`
- 前置说明：#300 尚未实现，本 Issue 不关闭或代替 #300。

## 实现范围

- 查询区与结果区拆分为双 Card；
- 查询操作顺序统一为“重置、查询”；
- 结果标题展示总数；
- 行内动作收敛为“查看、编辑、更多”；
- 详情 Drawer 统一为 720 px、业务路线标题、状态与三段 Tabs；
- 区分 403、404、服务失败和追踪局部失败；
- 首次失败可重试，刷新失败保留旧结果，空态提供下一步；
- 审核、归档和删除复用统一治理弹窗，失败保留现场并处理状态冲突提示。

## 非目标

- 不修改迁徙独立编辑页和人物选择器；
- 不修改后端、API、数据库和审核规则；
- 不新增地图或迁徙动画；
- 不处理移动端 Card List。

## 验证

- Frontend TypeScript；
- 生产构建；
- Culture API Check；
- 完整浏览器 E2E 由 #305 收口。
