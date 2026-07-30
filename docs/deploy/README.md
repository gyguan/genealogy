# 部署与运维

本目录记录当前仍需执行的部署、环境联调和运维步骤，不保存一次性上线报告。

## 当前入口

- `sae-rds-oss-checklist.md`：SAE、RDS、OSS 云端部署与联调检查。
- `authentication-operations.md`：登录认证体系的配置、部署和运维。

## 维护规则

- 不在文档中提交真实密码、Token、证书和生产连接信息；
- 环境变量名称、部署步骤、健康检查和回滚方式变化时同步更新；
- 一次性上线结论或 Issue 收口报告移入 `docs/archive/testing/` 或 `docs/archive/delivery/`；
- 后端 Profile 与数据库配置的权威说明见 `docs/backend/environment-configuration.md`。
