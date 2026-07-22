# Issue 694 执行记录

## 覆盖节点

- 宗族：宗族查询结果表格
- 支派：支派查询结果表格
- 字辈：字辈方案查询结果表格、字辈明细查询结果表格
- 人物：人物查询结果表格
- 关系：关系查询结果表格
- 来源：已绑定对象查询结果表格

## 固定结构

```text
QueryResultCard
├─ Header：查询结果（共 XX 条）+ 节点级操作
└─ Table
```

共享 `ResultListCard` 不再渲染 Ant Design Card，仅负责在 `QueryResultCard` 内直接渲染 Table、状态提示和分页。
