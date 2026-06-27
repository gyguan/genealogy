# SAE / RDS / OSS 云端部署联调清单

本文用于 MVP1 后续云端部署联调。当前仓库已完成本地 MVP1 API 验收能力，云端部署需要实际云资源和密钥，不能在代码仓内直接完成，因此以 checklist 固化。

## 一、目标环境

```text
应用运行：SAE 或等价 Java 运行环境
数据库：RDS PostgreSQL
附件存储：OSS
CI/CD：GitHub Actions
```

## 二、SAE 应用配置

- [ ] 创建 Java 17 应用。
- [ ] 配置启动命令：`java -jar genealogy-backend-*.jar`。
- [ ] 配置健康检查：`/api/v1/health`。
- [ ] 配置 JVM 参数，例如：`-Xms512m -Xmx1024m`。
- [ ] 配置日志采集。
- [ ] 配置公网/内网访问策略。

## 三、RDS PostgreSQL 配置

- [ ] 创建 PostgreSQL 实例。
- [ ] 创建数据库：`genealogy`。
- [ ] 创建应用用户：`genealogy`。
- [ ] 配置白名单或 VPC 访问。
- [ ] 配置连接串环境变量：

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://{host}:{port}/genealogy
SPRING_DATASOURCE_USERNAME=genealogy
SPRING_DATASOURCE_PASSWORD={password}
```

- [ ] 首次启动确认 Flyway 自动迁移成功。
- [ ] 确认 `flyway_schema_history` 表存在。
- [ ] 确认 JPA validate 通过。

## 四、OSS 附件存储配置

当前 MVP 默认使用本地存储：

```yaml
genealogy:
  attachment:
    storage-root: ./data/attachments
```

云端切换 OSS 前需要：

- [ ] 抽象 StorageService 接口。
- [ ] 实现 LocalStorageService。
- [ ] 实现 OssStorageService。
- [ ] 配置 bucket、endpoint、accessKey、secretKey。
- [ ] 下载接口改为受控流式下载或临时签名 URL。
- [ ] 确认非授权用户不能下载附件。

## 五、GitHub Actions 发布配置

- [ ] 配置云平台访问密钥到 GitHub Secrets。
- [ ] 增加 build jar workflow。
- [ ] 增加 deploy workflow。
- [ ] 发布前执行：`mvn -B clean test`。
- [ ] 发布后执行健康检查。
- [ ] 发布失败自动中断并保留日志。

## 六、生产环境变量建议

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
GENEALOGY_ATTACHMENT_STORAGE_ROOT
SERVER_PORT
SPRING_PROFILES_ACTIVE=prod
```

## 七、联调验收步骤

1. 部署后端应用。
2. 确认健康检查通过。
3. 打开 Swagger。
4. 注册/登录。
5. 创建宗族。
6. 创建支派、字辈、人物和关系。
7. 上传附件。
8. 提交并审核。
9. 查询世系图。
10. 查询操作日志。
11. 导出 CSV。

## 八、风险提示

- 生产环境不要执行 `db/seed/demo-data.sql`。
- 生产数据库不要随意 `docker compose down -v` 或 drop schema。
- Flyway 已执行脚本不得修改历史版本，应新增版本脚本。
- 附件本地存储不适合多实例部署，云端建议切换 OSS。
