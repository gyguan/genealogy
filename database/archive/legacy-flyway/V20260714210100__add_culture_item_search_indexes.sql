-- Purpose: 为文化资料关键词搜索、来源覆盖筛选和批量计数补充匹配索引。
-- Issue/PR: #167 / PR #181
-- Risk: medium
-- Lock impact: 创建扩展和普通 GIN/B-Tree 索引；索引构建期间会消耗 I/O，并对 culture_item/source_binding 持有索引创建所需锁。
-- Data volume: 只扫描 culture_item 与 source_binding，不更新业务数据；两表均为新模块或既有绑定表。
-- Compatibility: 仅新增扩展和索引，对旧代码、旧字段和查询结果无行为改变。
-- Rollback/Compensation: 使用更高版本前向补偿迁移删除本文件新增索引；pg_trgm 可能被其他模块复用，不直接删除扩展。
-- Verification: Migration Governance、PostgreSQL Startup、Hibernate schema validate；检查 pg_indexes 中新增索引并执行关键词/hasSource 查询测试。

create extension if not exists pg_trgm;

create index idx_culture_item__title_trgm
    on culture_item using gin (lower(title) gin_trgm_ops)
    where deleted_at is null;

create index idx_culture_item__summary_trgm
    on culture_item using gin (lower(summary) gin_trgm_ops)
    where deleted_at is null and summary is not null;

create index idx_culture_item__content_trgm
    on culture_item using gin (lower(content) gin_trgm_ops)
    where deleted_at is null and content is not null;

create index idx_culture_item__historical_period_trgm
    on culture_item using gin (lower(historical_period) gin_trgm_ops)
    where deleted_at is null and historical_period is not null;

create index idx_culture_item__location_text_trgm
    on culture_item using gin (lower(location_text) gin_trgm_ops)
    where deleted_at is null and location_text is not null;

create index idx_source_binding__culture_target_active
    on source_binding (clan_id, target_type, target_id, source_id)
    where binding_status <> 'archived';
