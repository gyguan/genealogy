# Issue #681 执行看板：修正查询结果业务 Card 嵌套关系

- Issue：https://github.com/gyguan/genealogy/issues/681
- 分支：`agent/issue-681-query-result-nested-card`
- 目标：业务查询结果 Card 必须明确位于“查询结果”Card 的 Body 内部，不再呈现为上下两个同级 Card。

## 根因

- JSX 已包含外层 Card 与内层 `BusinessResultCard`，但外层 Body 使用灰色背景，外层 Header 高度偏大，视觉上形成两个上下区域；
- 公共测试仅检查外层类名和内层组件同时存在，没有验证外层关闭标签位于内层关闭标签之后；
- 相关 E2E 未校验内层 Card 的父节点和边界是否被外层 Body 包含。

## 实施

- [x] 外层 Body 改为连续白色背景；
- [x] 业务 Card 通过直接子选择器固定在外层 Body 内；
- [x] 取消业务 Card 阴影，使用内嵌边框表达层级；
- [x] 为业务 Card 增加明确的 DOM 角色标识；
- [x] 11 处源码结构测试增加真实父子顺序校验；
- [x] 数据导入 E2E 增加直接父子选择器和四周内边距几何校验；
- [ ] Frontend CI；
- [ ] Import Page Gate；
- [ ] Review 与 squash 合入。

## 验收重点

```text
.query-result-outer-card
└─ .ant-card-body
   └─ .business-result-card[data-query-result-role="business"]
```

- 外层 Body 背景为白色；
- 业务 Card 四周均位于外层 Body 内边距范围内；
- 页面级操作仍在外层 Header；
- 排序、Tabs、业务标题与总数仍位于业务 Card。
