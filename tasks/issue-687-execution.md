# Issue #687 执行看板：固定查询结果双层 Card

## 唯一目标结构

```text
查询结果 Card（共 XX 条）                    页面级按钮
└─ 业务查询结果 Card
```

## 实现

- [x] `QueryResultCard` 内部强制创建一个 `BusinessResultCard`；
- [x] 页面不再直接导入或使用 `BusinessResultCard`；
- [x] 外层承载查询结果、总数和页面级按钮；
- [x] 内层承载业务标题、业务局部控件和结果内容；
- [x] 覆盖 11 处查询结果页面；
- [x] 不修改接口和业务逻辑。

## 验证

- [x] 源码结构测试；
- [x] TypeScript；
- [x] 生产构建；
- [x] Frontend CI；
- [x] Culture / Tracking / Import Page Gate。
