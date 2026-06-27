-- Seed system reference data for Genealogy MVP.
-- This script is intentionally separate from table DDL so the database directory clearly contains data preset logic.
-- All statements are idempotent and safe to re-run in new environments through Flyway.

-- 1. System roles.
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

-- 2. System permissions.
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

-- 3. Role-permission bindings.
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
