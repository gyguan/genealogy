# Issue #837 执行看板

## DEFINE

- 目标：验证会话失效、并发冲突、深层世系边界、失败恢复与数据持久化稳定性。
- 环境：PostgreSQL 16 + Flyway + Spring Boot + React/Vite + Chromium/Playwright。
- 成功标准：失败不产生部分正式数据；失效会话不可继续访问；并发动作最多一次生效；树查询按阈值截断并在时限内响应；CI 证据可定位。

## PLAN

1. 创建稳定性测试人物并并发提交审核。
2. 校验并发请求仅产生一个有效审核任务，人物不被错误转为正式状态。
3. 清理会话 Cookie 与浏览器存储，校验受保护接口拒绝并返回登录页。
4. 使用极小 maxNodes/maxEdges 与超深 maxDepth 查询世系，校验边界及响应时间。
5. 校验失败响应不伪装为成功或空数据。
6. 归档 Playwright trace、截图、视频、服务日志及 JSON 证据。
7. 全部门禁通过后更新 PR、合并并关闭 Issue。

## BUILD

- [x] 创建执行分支。
- [x] 建立执行检查点。
- [ ] 新增真实 Playwright 稳定性专项。
- [ ] 创建 Draft PR。
- [ ] 根据 CI 修复测试或业务缺陷。

## VERIFY

- [ ] Backend CI。
- [ ] Frontend CI。
- [ ] Functional E2E。
- [ ] Member Branch Scope E2E。
- [ ] Artifact、Trace、截图、视频和服务日志。

## REVIEW

- [ ] 会话、权限、幂等、部分数据和树阈值复核。
- [ ] 更新 PR、Issue #837 和父 Issue #830。