# Deploy to Alibaba Cloud SAE

本目录用于将 `backend/genealogy-backend` 部署到阿里云 SAE（Serverless 应用引擎）。

## 推荐架构

```text
GitHub Actions
  ↓
Maven 编译 Spring Boot Jar
  ↓
上传 Jar 到 OSS
  ↓
调用 SAE DeployApplication 发布应用
  ↓
SAE 运行 genealogy-backend
  ↓
连接 RDS PostgreSQL
```

## 你不再需要

```text
不需要 ECS
不需要 SSH 登录服务器
不需要在服务器安装 Docker
不需要 docker compose
不需要维护系统环境
```

## 阿里云侧前置准备

1. 开通 SAE。
2. 创建一个 Java 应用。
3. 创建 RDS PostgreSQL 实例。
4. 创建 OSS Bucket，用于存放构建后的 Jar 包。
5. 准备 RAM 用户 AccessKey，并授予 SAE、OSS 相关权限。
6. 如果希望自动健康检查，需要给 SAE 应用配置公网访问地址。

## GitHub Secrets

进入 GitHub 仓库：

```text
Settings → Secrets and variables → Actions → New repository secret
```

添加以下 Secrets：

| Secret | 必填 | 说明 |
|---|---:|---|
| ALIBABA_CLOUD_ACCESS_KEY_ID | 是 | 阿里云 RAM 用户 AccessKey ID |
| ALIBABA_CLOUD_ACCESS_KEY_SECRET | 是 | 阿里云 RAM 用户 AccessKey Secret |
| ALIBABA_CLOUD_REGION_ID | 是 | 地域，例如 cn-hangzhou |
| SAE_APP_ID | 是 | SAE 应用 ID |
| OSS_BUCKET | 是 | OSS Bucket 名称 |
| OSS_ENDPOINT | 是 | OSS Endpoint，例如 https://oss-cn-hangzhou.aliyuncs.com |
| SPRING_DATASOURCE_URL | 是 | RDS PostgreSQL JDBC 地址 |
| SPRING_DATASOURCE_USERNAME | 是 | 数据库用户名 |
| SPRING_DATASOURCE_PASSWORD | 是 | 数据库密码 |
| SAE_PUBLIC_URL | 否 | SAE 公网访问地址，用于部署后自动访问 /api/v1/health |

## 触发部署

进入 GitHub：

```text
Actions → Deploy Backend to SAE → Run workflow
```

可以选择：

```text
skip_health_check=false  默认，执行健康检查
skip_health_check=true   跳过健康检查
```

## 数据库环境变量示例

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://pgm-xxx.pg.rds.aliyuncs.com:5432/genealogy
SPRING_DATASOURCE_USERNAME=genealogy
SPRING_DATASOURCE_PASSWORD=your-password
```

## 失败诊断能力

当前 `deploy-sae.yml` 已增强部署诊断，失败时会尽量把关键错误输出到 GitHub Actions 日志：

1. 预检查必填 Secrets 是否存在。
2. Maven 打包失败时输出最后 160 行日志。
3. 打印 Jar 包路径和大小。
4. 上传 OSS 后执行 `ossutil64 stat` 校验对象是否存在。
5. 打印 Package URL。
6. 捕获并输出 `DeployApplication` 响应。
7. 部署前后尝试查询 SAE 应用状态和配置。
8. 配置 `SAE_PUBLIC_URL` 后，会最多重试 30 次访问 `/api/v1/health`。
9. 健康检查失败时，会再次输出 SAE 应用状态和配置。

## 验证

部署完成后，在 SAE 控制台查看公网访问地址，然后访问：

```text
https://你的SAE公网地址/api/v1/health
```

如果配置了 GitHub Secret `SAE_PUBLIC_URL`，workflow 会自动访问：

```text
${SAE_PUBLIC_URL}/api/v1/health
```

返回 `status=UP` 即表示应用启动成功。

## 说明

当前 workflow 使用 Jar 包部署方式：GitHub Actions 先将 Jar 上传到 OSS，再调用 SAE 发布命令。不同阿里云账号或 SAE 版本的 CLI 参数可能存在差异；若首次运行失败，根据 GitHub Actions 的错误信息调整 `DeployApplication` 参数即可。
