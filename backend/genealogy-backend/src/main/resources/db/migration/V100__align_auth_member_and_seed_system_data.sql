-- Align auth/member schema and seed system data.
-- This migration is idempotent and safe for environments that already applied earlier migrations.

-- clan_member.user_id was created against legacy user_account in V2, while current auth uses app_user.
-- Use NOT VALID to avoid blocking upgrades from old demo data; new rows are still checked.
alter table clan_member drop constraint if exists clan_member_user_id_fkey;
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'fk_clan_member_app_user') then
        alter table clan_member
            add constraint fk_clan_member_app_user
            foreign key (user_id) references app_user(id) not valid;
    end if;
end $$;

-- Align enum defaults with Java enum names: active/inactive/invited/removed and clan/branch.
alter table clan_member alter column member_status set default 'active';
alter table clan_member alter column scope_type set default 'clan';
update clan_member set member_status = lower(member_status) where member_status in ('ACTIVE', 'INACTIVE', 'INVITED', 'REMOVED');
update clan_member set scope_type = lower(scope_type) where scope_type in ('CLAN', 'BRANCH');
alter table clan_member alter column updated_at set default now();

-- role_id must be explicitly set by the application; avoid invalid default 0.
alter table clan_member alter column role_id drop default;

create unique index if not exists uk_clan_member_clan_user on clan_member(clan_id, user_id);
create index if not exists idx_clan_member_role on clan_member(role_id);
create index if not exists idx_clan_member_scope on clan_member(scope_type, scope_id);

-- System roles.
insert into app_role(role_code, role_name, description, system_role, created_at, updated_at) values
    ('clan_admin', '宗族管理员', '拥有宗族全量管理、成员管理和审核权限', true, now(), now()),
    ('branch_admin', '支派管理员', '管理授权支派范围内的人物、关系和资料', true, now(), now()),
    ('editor', '编辑人员', '采集和维护人物、关系、来源资料，可提交审核', true, now(), now()),
    ('viewer', '只读成员', '查看授权范围内的族谱资料', true, now(), now())
on conflict (role_code) do update set
    role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

-- System permissions. V7 already seeds part of them; keep this as the full current baseline.
insert into app_permission(permission_code, permission_name, module_code, action_code, description, created_at, updated_at) values
    ('clan:manage', '管理宗族', 'clan', 'manage', '创建和维护宗族基础资料', now(), now()),
    ('member:manage', '管理成员', 'member', 'manage', '维护宗族成员和角色', now(), now()),
    ('branch:manage', '管理支派', 'branch', 'manage', '创建和维护支派资料', now(), now()),
    ('generation:manage', '管理字辈', 'generation', 'manage', '维护字辈方案和字辈明细', now(), now()),
    ('person:write', '维护人物', 'person', 'write', '创建和修改人物档案', now(), now()),
    ('relationship:write', '维护关系', 'relationship', 'write', '创建和修改人物关系', now(), now()),
    ('source:write', '维护来源', 'source', 'write', '创建资料来源和来源绑定', now(), now()),
    ('attachment:write', '维护附件', 'attachment', 'write', '上传和登记资料附件', now(), now()),
    ('review:submit', '提交审核', 'review', 'submit', '提交资料变更审核', now(), now()),
    ('review:approve', '审核变更', 'review', 'approve', '审核通过或驳回资料变更', now(), now()),
    ('import:execute', '执行导入', 'importexport', 'import', '导入人物或关系 CSV', now(), now()),
    ('export:execute', '执行导出', 'importexport', 'export', '导出人物或关系 CSV', now(), now()),
    ('tree:read', '查看世系', 'tree', 'read', '查看授权范围内的世系图', now(), now()),
    ('log:read', '查看日志', 'operationlog', 'read', '查看操作审计日志', now(), now())
on conflict (permission_code) do update set
    permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    action_code = excluded.action_code,
    description = excluded.description,
    updated_at = now();

-- Role-permission bindings.
insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
cross join app_permission p
where r.role_code = 'clan_admin'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in (
    'branch:manage', 'generation:manage', 'person:write', 'relationship:write', 'source:write',
    'attachment:write', 'review:submit', 'import:execute', 'export:execute', 'tree:read'
)
where r.role_code = 'branch_admin'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in (
    'person:write', 'relationship:write', 'source:write', 'attachment:write',
    'review:submit', 'import:execute', 'export:execute', 'tree:read'
)
where r.role_code = 'editor'
on conflict (role_id, permission_id) do nothing;

insert into app_role_permission(role_id, permission_id)
select r.id, p.id
from app_role r
join app_permission p on p.permission_code in ('export:execute', 'tree:read')
where r.role_code = 'viewer'
on conflict (role_id, permission_id) do nothing;

-- Useful indexes for current query patterns.
create index if not exists idx_app_role_code on app_role(role_code);
create index if not exists idx_app_permission_code on app_permission(permission_code);
create index if not exists idx_operation_log_actor_created on operation_log(actor_id, created_at desc);
create index if not exists idx_operation_log_action_created on operation_log(action_type, created_at desc);
create index if not exists idx_operation_log_created on operation_log(created_at desc);
create index if not exists idx_relationship_clan_type on relationship(clan_id, relation_type);
create index if not exists idx_relationship_clan_to_type on relationship(clan_id, to_person_id, relation_type);
create index if not exists idx_relationship_clan_pair_type on relationship(clan_id, from_person_id, to_person_id, relation_type);
create index if not exists idx_attachment_clan on attachment(clan_id);
create index if not exists idx_attachment_source on attachment(source_id);
