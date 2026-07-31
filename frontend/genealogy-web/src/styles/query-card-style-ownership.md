# Query Card 样式归属

查询 Card 的尺寸、栅格、字段、更多筛选和操作区样式仅允许由以下公共文件维护：

- `src/styles/shared/standard-query-card.css`
- `src/shared/ui/standard-query-actions.css`

业务页面 CSS 仅允许维护结果区、详情区、移动列表及其他业务展示样式，不得覆盖 `standard-query-*` 公共选择器，也不得重新引入页面专属查询布局。
