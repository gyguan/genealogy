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

## 本地启动

准备 PostgreSQL：

```text
数据库名：genealogy
用户名：genealogy
密码：genealogy
```

启动：

```bash
mvn spring-boot:run
```

健康检查：

```text
GET /api/v1/health
```

## 模块规划

```text
common            公共能力
auth              认证登录
clan              宗族管理
branch            支派管理
generation        字辈管理
person            人物管理
relationship      关系管理
source            资料来源
review            审核中心
tree              世系图查询
member            成员权限
importexport      导入导出
operationlog      操作日志
```
