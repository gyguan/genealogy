# Deploy to Alibaba Cloud ECS

本目录用于将 `backend/genealogy-backend` 部署到阿里云 ECS。

## 方案

```text
GitHub Actions
  ↓
Maven 编译 Spring Boot Jar
  ↓
打包 Dockerfile + Jar + docker-compose.yml
  ↓
通过 SSH 上传到 ECS
  ↓
在 ECS 执行 docker compose up -d --build
```

## ECS 前置条件

ECS 需要提前准备：

1. 已安装 Docker。
2. 已安装 Docker Compose 插件，即支持 `docker compose` 命令。
3. 安全组开放 8080 端口。
4. 安全组开放 SSH 端口，默认 22。
5. ECS 用户具备执行 Docker 的权限。

## GitHub Secrets

在 GitHub 仓库中配置：

```text
Settings → Secrets and variables → Actions → New repository secret
```

需要添加：

| Secret | 说明 |
|---|---|
| ECS_HOST | ECS 公网 IP 或域名 |
| ECS_USER | SSH 用户名，如 root 或 ecs-user |
| ECS_SSH_PRIVATE_KEY | SSH 私钥内容 |
| ECS_SSH_PORT | SSH 端口，可选，默认 22 |

## 触发部署

进入 GitHub 仓库：

```text
Actions → Deploy Backend to ECS → Run workflow
```

## 验证

部署完成后访问：

```text
http://ECS_HOST:8080/api/v1/health
```

如果返回 `status=UP`，说明后端已启动。

## 注意

当前 docker-compose 内置 PostgreSQL，适合 MVP 验证。生产环境建议改为阿里云 RDS PostgreSQL。
