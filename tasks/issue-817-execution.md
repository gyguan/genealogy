# Issue #817 执行记录

## 目标

新增可重复执行的真实功能测试 GitHub Actions，统一运行 PostgreSQL 集成测试和真实 Playwright。

## 已完成

- [x] 配置 PostgreSQL 16 Service 和健康检查；
- [x] 执行 `mvn -B -DskipITs=false verify`；
- [x] 构建并启动 Spring Boot `functional-test` Profile；
- [x] 动态生成测试账号和密码；
- [x] 注册首次建谱管理员账号；
- [x] 为受限账号建立另一宗族基线；
- [x] 安装前端依赖和 Chromium；
- [x] 启动 Vite 并代理到真实后端；
- [x] 执行 `npm run test:e2e:real`；
- [x] 配置服务启动超时、失败日志和 Artifact；
- [x] 配置 PR、手工触发与并发取消。

## 安全边界

- 不硬编码真实凭据；
- 临时密码在 Run 中动态生成；
- 不连接共享或生产数据库；
- 工作流失败不使用 `continue-on-error` 忽略。

## 验证状态

工作流配置已写入分支。Draft PR 创建后将触发首次真实 Actions；结果、Job 和失败日志由 #818 记录和分析。
