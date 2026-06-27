# MVP1 API 验收说明

本文说明如何使用仓库内置脚本完成 MVP1 端到端 API 验收。

## 一、前置条件

启动 PostgreSQL：

```bash
cd backend/genealogy-backend
docker compose up -d
```

启动后端：

```bash
mvn spring-boot:run
```

确认健康检查通过：

```text
http://localhost:8080/api/v1/health
```

## 二、执行验收脚本

脚本位置：

```text
backend/genealogy-backend/scripts/mvp1-api-test.sh
```

执行：

```bash
cd backend/genealogy-backend
chmod +x scripts/mvp1-api-test.sh
./scripts/mvp1-api-test.sh
```

如果后端不是默认地址，可指定：

```bash
BASE_URL=http://localhost:8080 ./scripts/mvp1-api-test.sh
```

## 三、脚本覆盖范围

脚本会自动执行以下流程：

```text
1. 健康检查
2. 注册用户
3. 登录并获取 token
4. 匿名写接口拦截验证
5. 创建宗族，并自动成为 clan_admin
6. 创建支派
7. 创建字辈方案和字辈明细
8. 创建父辈人物和在世子辈人物
9. 验证在世人员匿名访问敏感字段脱敏
10. 验证宗族成员可查看在世人员完整字段
11. 创建亲子关系
12. 创建资料来源
13. 绑定来源到人物
14. 上传附件
15. 下载附件并校验内容一致
16. 提交人物审核
17. clan_admin 审核通过
18. 查看世系图
19. 查询操作日志
20. 下载人物/关系模板
21. 导出人物/关系 CSV
```

## 四、输出结果

脚本成功后会输出类似：

```text
MVP1 API acceptance passed.
RunId: 20260627120000
BaseUrl: http://localhost:8080
ClanId: 1
BranchId: 1
ParentId: 1
ChildId: 2
RelationshipId: 1
SourceId: 1
AttachmentId: 1
ReviewTaskId: 1
TempDir: /tmp/genealogy-mvp1-20260627120000
```

临时响应和导出文件会保存在：

```text
/tmp/genealogy-mvp1-{RUN_ID}
```

## 五、失败排查

### 1. 健康检查失败

确认后端已经启动：

```bash
mvn spring-boot:run
```

确认数据库已经启动：

```bash
docker compose ps
```

### 2. Flyway schema 非空但没有 history 表

本地验证环境建议清库重建：

```bash
docker compose down -v
docker compose up -d
mvn spring-boot:run
```

### 3. 登录失败

脚本会自动注册唯一用户名，一般不会冲突。如果手动指定 `RUN_ID` 导致重复，可换一个：

```bash
RUN_ID=manual001 ./scripts/mvp1-api-test.sh
```

### 4. 附件上传失败

确认 `application.yml` 中本地附件目录可写：

```yaml
genealogy:
  attachment:
    storage-root: ./data/attachments
```

### 5. 权限失败

脚本依赖“创建宗族后创建者自动成为 clan_admin”的能力。如果该步骤失败，优先检查：

```text
clan_member
app_role
app_user
```

## 六、验收通过标准

```text
脚本从头到尾执行成功，输出 MVP1 API acceptance passed，即认为本地 MVP1 API 主链路验收通过。
```
