# Genealogy Backend

中国式族谱系统 MVP 1 后端工程。

## 技术栈

```text
Java 17
Spring Boot 3.x
PostgreSQL
Flyway
Spring Data JPA
JWT 预留
OpenAPI 预留
```

## 本阶段目标

当前目录先初始化可运行的后端工程骨架，包含：

- Spring Boot 启动类
- Maven 配置
- application.yml
- Flyway 初始化脚本
- 统一响应 ApiResponse
- 分页响应 PageResponse
- 业务异常 BusinessException
- 全局异常处理 GlobalExceptionHandler
- 健康检查接口
- 各业务模块包结构占位

## 云端编译

后端代码变更会触发 GitHub Actions：

```text
Backend CI → mvn -B clean test
```

本分支用于再次验证本地 API 启动链路。

## 本地启动

准备 PostgreSQL：

```text
数据库名：genealogy
用户名：genealogy
密码：123456
```

当前默认配置位于：

```text
src/main/resources/application.yml
```

默认连接串：

```text
jdbc:postgresql://localhost:5432/genealogy
```

从 GitHub 拉取后启动：

```bash
git pull
cd backend/genealogy-backend
mvn spring-boot:run
```

启动时 Flyway 会自动执行 `src/main/resources/db/migration` 下的建表和系统预置脚本。

健康检查：

```text
GET http://localhost:8080/api/v1/health
```

Swagger/OpenAPI：

```text
http://localhost:8080/swagger-ui.html
http://localhost:8080/api-docs
```

## 认证登录接口

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

当前采用轻量 token 会话机制：密码使用 PBKDF2 哈希存储；登录后生成不透明 token，服务端保存 token hash，调用 `/me` 和 `/logout` 时通过 `Authorization: Bearer {token}` 识别当前用户。
