# 09. MVP 1 剩余建设 Backlog

本文用于暂存 MVP 1 剩余建设内容，并作为后续逐步实现的任务基线。

## 一、当前基线

当前后端已经完成数据底座主干，并通过启动级验证：

- Maven 编译与测试
- PostgreSQL 拉起
- Flyway 数据库迁移
- Hibernate/JPA schema validate
- Spring Boot 启动
- `/api/v1/health` 健康检查

已基本完成的能力包括：宗族、支派、字辈、人物、关系、世系图、资料来源、来源绑定、真实附件上传、人物/关系审核闭环、操作日志、认证登录、人物/关系 CSV 导入导出、前端 MVP 演示页面、端到端 smoke 脚本。

## 二、P0：MVP 闭环必须完成

状态：已完成 MVP 实现。

- P0-1 权限隐私 MVP 化：已完成登录态强校验、宗族成员校验、clan_admin 审核/成员管理权限、宗族创建权限自举、在世人员敏感字段脱敏、branch_admin/editor 支派范围控制。
- P0-2 审核覆盖扩展：已覆盖人物、关系、来源、支派、字辈方案的提交审核与通过/驳回状态回写，审核记录已返回 before/after payload。
- P0-3 真实附件上传能力：已支持本地存储版 multipart 上传、下载、文件类型/大小限制、checksum、权限校验、附件元数据登记。
- P0-4 前端最小闭环页面：已新增 `frontend/mvp` 静态演示前端，覆盖登录、宗族、支派、字辈、人物、关系、来源、审核、世系、导入导出、日志。

后续可增强点：附件 OSS 存储适配、正式前端工程化。

## 三、P1：建议在 MVP 验收前增强

状态：已完成 MVP 实现。

### P1-1 关系业务规则增强

已完成：

- 父亲/母亲唯一性约束。
- 重复关系拦截。
- 配偶关系双向自动补齐。
- 亲子/养育关系世次校验。
- 同宗族人物关系校验。
- 人物、关系、来源绑定、支派、字辈维护均已接入支派范围控制。

后续可增强点：继嗣、出嗣、养子等更细族谱规则可继续细化为独立规则引擎。

### P1-2 导入导出增强

已完成：

- 人物 CSV 预校验。
- 关系 CSV 模板。
- 关系 CSV 预校验。
- 关系 CSV 导入。
- 关系 CSV 导出。
- 按支派导出人物。

说明：MVP 阶段采用 Excel 兼容 UTF-8 BOM CSV，不引入 Apache POI。真实 `.xlsx` 导入可作为后续增强项。

### P1-3 世系图前端可视化增强

已完成：

- 前端世系页增加简单节点/边可视化。
- 保留原始 JSON 便于技术排查。
- 前端导入导出页增加关系 CSV 和按支派导出入口。

后续可增强点：节点展开/收起、人物卡片、按支派/世次筛选、专业树图布局。

## 四、P2：MVP 后增强

状态：已完成基础增强。

### P2-1 操作日志查询增强

已完成：

- 按动作类型筛选。
- 按操作者筛选。
- 按目标类型/目标 ID 筛选。
- 按时间范围筛选。
- 按关键词筛选 summary/detail。
- 前端日志页增加对应筛选字段。
- 审计日志写入失败不阻断主业务链路。

后续可增强点：操作日志 CSV 导出、日志归档、审计看板。

### P2-2 认证上下文重构

已完成：

- 新增 `RequestUserContext`。
- 新增 `RequestContextApplicationService`。
- 统一提取 userId、requestId、clientIp。
- 来源创建接口已接入统一请求上下文，并将 requestId/clientIp 写入审计日志。

后续可增强点：HandlerInterceptor、CurrentUserArgumentResolver、全 Controller 替换。

### P2-3 测试体系增强

已完成：

- 新增操作日志服务单元测试。
- 新增 `backend/genealogy-backend/scripts/mvp1-e2e-smoke.sh` 端到端 smoke 脚本。
- 继续保留完整 Backend CI 启动级验证：Maven、PostgreSQL、Flyway、JPA validate、Spring Boot 启动、健康检查。

后续可增强点：Controller 集成测试、审核流程测试、导入导出测试、越权测试。

## 五、当前总体状态

MVP 1 的 P0/P1/P2 基础建设均已完成一版可运行实现。后续建议进入：

1. SAE/RDS/OSS 部署环境联调。
2. 正式前端工程化。
3. 族谱复杂规则引擎化。
4. 更完整自动化测试覆盖。
