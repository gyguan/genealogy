# 真实 Playwright 功能测试

本目录只放置连接真实 Spring Boot 和 PostgreSQL 的浏览器测试。

## 与现有 E2E 的边界

- `e2e/`：允许通过 `page.route` Mock API，主要验证页面结构、交互和 URL 状态；
- `e2e-real/`：禁止 Mock 核心 `/api/v1/**` 业务请求，验证浏览器、前端、后端和数据库真实链路。

## 执行

先启动 PostgreSQL、后端和前端，然后设置测试账号：

```bash
export E2E_BASE_URL=http://127.0.0.1:5179
export FUNCTIONAL_TEST_RUN_ID=local-smoke
export FUNCTIONAL_TEST_ADMIN_USERNAME=ft_clan_admin
export FUNCTIONAL_TEST_ADMIN_PASSWORD='...'
export FUNCTIONAL_TEST_VIEWER_USERNAME=ft_viewer
export FUNCTIONAL_TEST_VIEWER_PASSWORD='...'

npm run test:e2e:real
```

查看用例列表：

```bash
npm run test:e2e:real:list
```

## 失败证据

失败时保存在：

- `test-results/real-e2e/`：Trace、截图、视频和附件；
- `playwright-report-real/`：HTML 报告；
- `test-results/real-e2e-results.json`：机器可读结果。

## 约束

1. 不允许为核心业务 API 增加 Route Mock；
2. 不使用生产账号和生产数据；
3. 测试数据名称必须包含 `FUNCTIONAL_TEST_RUN_ID`；
4. 不使用固定长等待代替业务状态；
5. P0 用例失败不得通过 `skip` 或删除断言处理。
