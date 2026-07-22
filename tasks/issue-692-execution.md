# Issue #692 执行看板：查询结果严格两层结构

## 唯一目标结构

```text
查询 Card

查询结果容器
├─ Header：查询结果（共 XX 条）+ 操作按钮
└─ Table / List / Graph / Tabs
```

## 实现

- [x] 删除 `BusinessResultCard`；
- [x] 删除业务结果 Card Header / Body；
- [x] 删除 11 个页面的 `businessTitle` / `businessClassName`；
- [x] 结果局部操作合并到外层 Header；
- [x] 结果内容直接渲染为外层容器子节点；
- [x] 删除 `.business-result-card` 相关样式；
- [x] 更新专项规范和自动化测试。

## 验证

- [x] 结构测试；
- [x] TypeScript；
- [x] 生产构建；
- [x] Frontend CI；
- [x] Culture / Tracking / Import Page Gate。
