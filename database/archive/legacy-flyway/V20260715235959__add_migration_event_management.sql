-- Purpose: 收紧迁徙事件起止地与顺序约束，并补充迁徙专属权限、审核历史和筛选索引。
-- Issue/PR: #170 / PR #221
-- Risk: medium
-- Lock impact: 对 migration_event 增加 CHECK 与索引；当前表为新领域表，不回填旧 branch 迁徙字段。
-- Data volume: 不迁移、不双写历史 migration_from/migration_to；已有不合规草稿需先人工修订。
-- Compatibility: 旧支派字段继续只读；迁徙专题只消费 migration_event。
-- Rollback/Compensation: 使用 database/rollback/20260715_issue-170_remove_migration_management.sql，仅用于未产生业务数据的开发环境。
-- Verification: PostgreSQL 全量 Flyway、Hibernate validate、顺序冲突、自迁徙、权限和审核 apply 测试。

alter table migration_event
    drop constraint if exists ck_migration_event__locations;

alter table migration_event
    add constraint ck_migration_event__from_required
        check (length(btrim(coalesce(from_location, ''))) > 0),
    add constraint ck_migration_event__to_required
        check (length(btrim(coalesce(to_location, ''))) > 0),
    add constraint ck_migration_event__not_self_move
        check (lower(regexp_replace(btrim(from_location), '\\s+', '', 'g'))
            <> lower(regexp_replace(btrim(to_location), '\\s+', '', 'g'))),
    add constraint ck_migration_event__sequence_upper_bound
        check (sequence_no <= 100000);

create index if not exists idx_migration_event__clan_branch_status_sequence
    on migration_event (clan_id, branch_id, data_status, sequence_no, id)
    where deleted_at is null;

create index if not exists idx_migration_event__clan_locations
    on migration_event (clan_id, from_location, to_location)
    where deleted_at is null;

create index if not exists idx_migration_event__clan_time
    on migration_event (clan_id, migration_time_text, sequence_no)
    where deleted_at is null;

create index if not exists idx_revision__migration_event_history
    on revision (clan_id, target_type, target_id, submit_time desc)
    where target_type = 'migration_event';

insert into app_permission(permission_code, permission_name, module_code, action_code, description, created_at, updated_at)
values
    ('migration_event.view', '查看迁徙脉络', 'culture', 'migration_view', '查看授权支派范围内的迁徙事件', now(), now()),
    ('migration_event.create', '新增迁徙事件', 'culture', 'migration_create', '新增迁徙事件草稿', now(), now()),
    ('migration_event.update', '维护迁徙事件', 'culture', 'migration_update', '维护草稿或提交正式迁徙事件变更', now(), now()),
    ('migration_event.delete', '删除迁徙事件', 'culture', 'migration_delete', '删除草稿或提交正式迁徙事件删除申请', now(), now()),
    ('migration_event.submit_review', '提交迁徙审核', 'culture', 'migration_submit_review', '提交迁徙事件审核', now(), now()),
    ('migration_event.archive', '归档迁徙事件', 'culture', 'migration_archive', '归档草稿或提交正式迁徙事件归档申请', now(), now()),
    ('migration_event.view_sensitive', '查看敏感迁徙事件', 'culture', 'migration_view_sensitive', '查看 private、sealed 或高度敏感迁徙事件', now(), now())
on conflict (permission_code) do update set
    permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    action_code = excluded.action_code,
    description = excluded.description,
    updated_at = now();

insert into app_role_permission(role_id, permission_id, created_at)
select r.id, p.id, now()
from app_role r
join app_permission p on (
       r.role_code in ('clan_admin', 'cross_clan_admin')
    or (r.role_code = 'branch_admin' and p.permission_code in (
        'migration_event.view', 'migration_event.create', 'migration_event.update',
        'migration_event.delete', 'migration_event.submit_review', 'migration_event.archive',
        'migration_event.view_sensitive'
    ))
    or (r.role_code = 'editor' and p.permission_code in (
        'migration_event.view', 'migration_event.create', 'migration_event.update',
        'migration_event.delete', 'migration_event.submit_review'
    ))
    or (r.role_code = 'reviewer' and p.permission_code in (
        'migration_event.view', 'migration_event.view_sensitive'
    ))
    or (r.role_code = 'viewer' and p.permission_code = 'migration_event.view')
)
where p.permission_code like 'migration_event.%'
on conflict (role_id, permission_id) do nothing;
