# 真实功能测试 GitHub Actions

## 工作流

```text
.github/workflows/functional-e2e.yml
```

单个 Job 按以下顺序执行：

1. 启动 PostgreSQL 16 Service；
2. 使用 Testcontainers 执行后端 PostgreSQL 集成测试；
3. 使用同一提交构建并启动 Spring Boot；
4. 动态生成临时账号和密码；
5. 注册首次建谱管理员账号；
6. 注册受限账号，并将其预先加入另一个测试宗族；
7. 安装前端依赖与 Chromium；
8. 启动 Vite，并代理到真实后端；
9. 执行 `npm run test:e2e:real`；
10. 无论成功失败均归档报告和日志。

## 数据安全

- 账号、密码和宗族名称均在每次 Actions Run 中动态生成；
- 临时密码只写入当前 Job 环境，不写入仓库和 Artifact；
- 数据库随 GitHub Actions Service 销毁；
- 不连接开发、测试共享环境或生产环境；
- 不使用真实个人信息。

## 失败证据

Artifact 包含：

- PostgreSQL 集成测试日志；
- Surefire/Failsafe 报告；
- Spring Boot 日志；
- Vite 日志；
- Playwright 日志、Trace、截图、视频、HTML 报告。

## 触发方式

- PR 修改后端、前端、测试文档、相关任务文件或本工作流时自动触发；
- 支持 `workflow_dispatch` 手工触发；
- 同一 PR 新提交会取消旧运行。

## 准出原则

- 不使用 `continue-on-error`；
- 后端集成测试或真实 E2E 任一失败，工作流失败；
- 服务启动超时快速失败并输出日志；
- P0 失败必须进入 #818 归因，不能通过跳过测试隐藏。
