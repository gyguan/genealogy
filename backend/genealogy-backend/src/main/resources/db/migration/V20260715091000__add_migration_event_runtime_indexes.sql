-- Purpose: 补充迁徙时间轴与版本追踪的运行时索引，复用 #166 已有顺序唯一性和基础状态索引。
-- Issue/PR: #170 / PR #214
-- Risk: low
-- Lock impact: 仅在新模块表 migration_event 与 revision 上创建两个普通/部分索引；不改写业务行。
-- Data volume: 不回填、不迁移旧 branch.migration_from/migration_to，不产生无来源迁徙事实。
-- Compatibility: 旧支派迁徙字段继续只读；新写入只进入 migration_event；无双写。
-- Rollback/Compensation: 执行 database/rollback/20260715_issue-170_drop_migration_runtime_indexes.sql 删除本次索引。
-- Verification: Migration Governance、PostgreSQL Startup、迁徙分页/顺序冲突集成测试和 EXPLAIN 基础检查。

create index idx_migration_event__clan_branch_status_sequence
    on migration_event (clan_id, branch_id, data_status, sequence_no, id)
    where deleted_at is null;

create index idx_revision__migration_event_history
    on revision (clan_id, target_type, target_id, submit_time desc)
    where target_type = 'migration_event';
