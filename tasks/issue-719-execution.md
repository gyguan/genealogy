# Issue #719 执行看板

## 目标

统一前端操作反馈入口，减少页面直接依赖 Ant Design Message、Popconfirm 和自定义反馈实现。

## 本批实现

- [x] 创建统一 `feedback.success/info/warning/error` API
- [x] 草稿删除入口迁移到统一 Feedback API
- [x] 草稿删除确认迁移到 `ConfirmAction`
- [x] 保留持续错误通过页面 `PageFeedback` 展示
- [x] 增加统一反馈与删除入口防回退测试
- [x] Ant Design Message 审计基线从 109 下调到 107
- [x] 确认弹窗审计基线从 63 下调到 62
- [ ] Frontend CI、类型检查和生产构建通过
- [ ] PR Ready 并合入 main

## 后续批次

1. 迁移建谱向导中直接 `message` 调用。
2. 迁移来源资料库与宗族文化高频页面。
3. 收敛应用 `notify` 与统一 Feedback API 的双轨调用。

## 分支

`agent/issue-719-unify-operation-feedback`
