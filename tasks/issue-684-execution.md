# Issue #684 执行看板：查询总数移至外层结果 Card

## 目标

- [x] 外层标题显示“查询结果（共 XX 条）”；
- [x] 页面级按钮保留在外层 Header 右侧；
- [x] 内层业务 Card 不再重复显示总数；
- [x] 保留业务 Card 在外层 Body 内的真实嵌套关系。

## 覆盖范围

- [x] 人物档案、来源资料库、审计追踪、世系图谱；
- [x] 数据导入、修谱工作台、审核中心、成员与权限；
- [x] 宗族文化三个 TAB。

## 验证

- [x] 查询结果源码结构测试；
- [x] TypeScript；
- [x] 生产构建；
- [ ] Frontend CI；
- [ ] Culture / Tracking / Import Page Gate。
