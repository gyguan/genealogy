-- Purpose: 为文化资料正式变更提供受控审核载荷，并新增文化专属权限与有界历史查询索引。
-- Issue/PR: #168 / PR #189
-- Risk: medium
-- Lock impact: 新建小表、插入权限种子并创建部分索引；不改写 culture_item、revision、review_task 现有数据。
-- Data volume: 不回填历史业务数据；权限映射仅作用于内置角色。
-- Compatibility: 只新增表、权限和索引；旧 source 权限兼容逻辑继续有效，非文化审核流程不变。
-- Rollback/Compensation: 使用更高版本前向迁移撤销角色映射、停用权限并删除内部 payload 表；不修改本迁移。
-- Verification: Migration Governance、PostgreSQL Startup、Hibernate validate、文化审核 apply/rollback 集成测试。

create table culture_revision_payload (
    revision_id bigint primary key references revision(id) on delete cascade,
    payload_json text not null,
    created_at timestamp not null default now()
);

create index idx_revision__culture_item_history
    on revision (clan_id, target_type, target_id, submit_time desc)
    where target_type = 'culture_item';

create index idx_review_task__culture_pending_scope
    on review_task (clan_id, branch_id, status, created_at desc)
    where status = 'pending';

insert into app_permission(permission_code, permission_name, module_code, action_code, description, created_at, updated_at)
values
    ('culture.view', '查看宗族文化', 'culture', 'view', '查看授权范围内的文化资料', now(), now()),
    ('culture.create', '新增文化资料', 'culture', 'create', '新增文化资料草稿', now(), now()),
    ('culture.update', '维护文化资料', 'culture', 'update', '维护草稿或提交正式资料变更', now(), now()),
    ('culture.delete', '删除文化资料', 'culture', 'delete', '删除草稿或提交正式资料删除申请', now(), now()),
    ('culture.submit_review', '提交文化审核', 'culture', 'submit_review', '提交文化资料审核', now(), now()),
    ('culture.review', '审核文化资料', 'culture', 'review', '审核文化资料及其来源绑定变更', now(), now()),
    ('culture.archive', '归档文化资料', 'culture', 'archive', '归档草稿或提交正式资料归档申请', now(), now()),
    ('culture.feature', '管理文化精选', 'culture', 'feature', '提交首页精选状态变更', now(), now()),
    ('culture.view_sensitive', '查看敏感文化资料', 'culture', 'view_sensitive', '查看 private、sealed 或高度敏感文化资料', now(), now())
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
        'culture.view', 'culture.create', 'culture.update', 'culture.delete',
        'culture.submit_review', 'culture.archive', 'culture.feature', 'culture.view_sensitive'
    ))
    or (r.role_code = 'editor' and p.permission_code in (
        'culture.view', 'culture.create', 'culture.update', 'culture.delete',
        'culture.submit_review'
    ))
    or (r.role_code = 'reviewer' and p.permission_code in (
        'culture.view', 'culture.review', 'culture.view_sensitive'
    ))
    or (r.role_code = 'viewer' and p.permission_code = 'culture.view')
)
where p.module_code = 'culture'
on conflict (role_id, permission_id) do nothing;
