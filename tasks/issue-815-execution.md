# Issue #815 执行记录

## 目标

建设不 Mock 核心业务 API、连接真实后端与 PostgreSQL 的 Playwright 测试入口。

## 已完成

- [x] 新增独立 `playwright.real.config.ts`；
- [x] 新增真实 E2E 目录和认证公共 Helper；
- [x] 实现真实登录、创建宗族、数据库查询和深链接恢复；
- [x] 实现查看者越权创建宗族拒绝场景；
- [x] 增加统一 npm 命令；
- [x] 配置 Trace、截图、视频、HTML 和 JSON 报告；
- [x] 明确 Mock E2E 与真实 E2E 的职责边界。

## 测试用例

- `FT-AUTH-001`
- `FT-CLAN-001`
- `FT-NAV-001`
- `FT-PERM-001`

## 验证边界

当前分支已完成测试代码和命令配置。真实执行依赖 #817 启动 PostgreSQL、Spring Boot、Vite 并初始化测试账号，因此本 Issue 不把未运行的命令声称为已通过。

## 后续

- #816 增加真实 PostgreSQL 集成测试；
- #817 将本测试接入 GitHub Actions 并提供账号与运行环境；
- #818 根据首次执行结果修复选择器、环境或业务缺陷。
