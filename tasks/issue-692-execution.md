# Issue #692 执行看板：查询结果严格两层结构

## 唯一目标结构

```text
查询 Card

查询结果容器
├─ Header：查询结果（共 XX 条）+ 操作按钮
└─ Table / List / Graph / Tabs
```

## 实现

- [ ] 删除 `BusinessResultCard`；
- [ ] 删除业务结果 Card Header / Body；
- [ ] 删除 11 个页面的 `businessTitle` / `businessClassName`；
- [ ] 结果局部操作合并到外层 Header；
- [ ] 结果内容直接渲染为外层容器子节点；
- [ ] 删除 `.business-result-card` 相关样式；
- [ ] 更新专项规范和自动化测试。

## 验证

- [ ] 结构测试；
- [ ] TypeScript；
- [ ] 生产构建；
- [ ] Frontend CI；
- [ ] Culture / Tracking / Import Page Gate。
