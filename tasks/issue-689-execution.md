# Issue #689 执行看板：删除外层 ant-card-body

## 唯一目标 DOM

```text
.query-result-outer-card
├─ .query-result-outer-card__header
└─ .business-result-card
```

## 实现

- [x] 外层不再使用 Ant Design Card；
- [x] 外层不生成 `.ant-card-body`；
- [x] 业务 Card 成为外层直接子节点；
- [x] 外层 Header 保留查询结果、总数和页面级按钮；
- [x] 页面 API 和业务逻辑保持不变。

## 验证

- [x] 共享结构测试；
- [x] TypeScript；
- [x] 生产构建；
- [x] Frontend CI；
- [x] Culture / Tracking / Import Page Gate。
