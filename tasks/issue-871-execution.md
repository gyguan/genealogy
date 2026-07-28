# Issue #871 执行看板

## 实现

- [x] 明确授权环境、攻击角色、范围与阻断规则；
- [x] 新增依赖、密钥和配置静态扫描；
- [x] 新增真实 PostgreSQL 动态渗透测试；
- [x] 覆盖认证、会话、CSRF、重放和账号枚举；
- [x] 覆盖跨宗族越权及敏感数据泄漏；
- [x] 覆盖 SQL 注入、路径遍历和错误信息泄漏；
- [x] 覆盖危险文件上传和安全响应头；
- [x] 归档请求、响应、日志、SARIF 和汇总报告。

## 最终验证

- [ ] Security Penetration 静态门禁通过；
- [ ] Security Penetration 动态门禁通过；
- [ ] Functional E2E 通过；
- [ ] Critical/High 未修复问题为 0；
- [ ] Artifact ID 与 SHA-256 已记录；
- [ ] PR 已合并；
- [ ] Issue #871 已关闭；
- [ ] EPIC #869 已同步。
