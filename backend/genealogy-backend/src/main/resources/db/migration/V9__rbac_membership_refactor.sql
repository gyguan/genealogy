-- RBAC + membership refactor phase 1.
-- Add permission and membership authorization tables, seed permissions, and migrate legacy clan_member data.

create table if not exists app_permission (
    id bigserial primary key,
    permission_code varchar(128) not null unique,
    permission_name varchar(100) not null,
    module_code varchar(64) not null,
    module_name varchar(100) not null,
    resource_code varchar(64) not null,
    action_code varchar(64) not null,
    description text,
    system_permission boolean not null default true,
    status varchar(32) not null default 'active',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    unique (resource_code, action_code)
);

comment on table app_permission is '权限点定义表：定义系统可管控的业务动作，例如人物创建、关系维护、审核通过等。';
comment on column app_permission.id is '主键ID。';
comment on column app_permission.permission_code is '权限编码，建议采用资源.动作格式，例如 person.create、review.approve。';
comment on column app_permission.permission_name is '权限中文名称。';
comment on column app_permission.module_code is '权限所属模块编码。';
comment on column app_permission.module_name is '权限所属模块名称。';
comment on column app_permission.resource_code is '权限作用资源编码，例如 clan、branch、person、relationship、source、review。';
comment on column app_permission.action_code is '权限动作编码，例如 view、create、update、delete、approve、reject、export。';
comment on column app_permission.description is '权限点说明。';
comment on column app_permission.system_permission is '是否系统内置权限点。';
comment on column app_permission.status is '权限点状态：active 启用，disabled 停用。';
comment on column app_permission.created_by is '创建人用户ID，关联 app_user.id。';
comment on column app_permission.created_at is '创建时间。';
comment on column app_permission.updated_by is '最后更新人用户ID，关联 app_user.id。';
comment on column app_permission.updated_at is '最后更新时间。';

create table if not exists app_role_permission (
    id bigserial primary key,
    role_id bigint not null references app_role(id),
    permission_id bigint not null references app_permission(id),
    effect varchar(16) not null default 'allow',
    status varchar(32) not null default 'active',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    constraint chk_app_role_permission_effect check (effect in ('allow', 'deny')),
    unique (role_id, permission_id)
);

comment on table app_role_permission is '角色权限关系表：定义某个角色拥有或拒绝哪些权限点。';
comment on column app_role_permission.id is '主键ID。';
comment on column app_role_permission.role_id is '角色ID，关联 app_role.id。';
comment on column app_role_permission.permission_id is '权限点ID，关联 app_permission.id。';
comment on column app_role_permission.effect is '授权效果：allow 表示允许，deny 表示显式拒绝。MVP 阶段默认使用 allow。';
comment on column app_role_permission.status is '关系状态：active 启用，disabled 停用。';
comment on column app_role_permission.created_by is '创建人用户ID，关联 app_user.id。';
comment on column app_role_permission.created_at is '创建时间。';
comment on column app_role_permission.updated_by is '最后更新人用户ID，关联 app_user.id。';
comment on column app_role_permission.updated_at is '最后更新时间。';

create table if not exists clan_membership (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    user_id bigint not null references app_user(id),
    person_id bigint references person(id),
    join_status varchar(32) not null default 'invited',
    member_status varchar(32) not null default 'active',
    invited_by bigint references app_user(id),
    joined_at timestamp,
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    unique (clan_id, user_id)
);

comment on table clan_membership is '宗族成员身份表：表示某个系统账号是否加入某个宗族，可选绑定谱内人物。';
comment on column clan_membership.id is '主键ID。';
comment on column clan_membership.clan_id is '宗族ID，关联 clan.id。';
comment on column clan_membership.user_id is '系统用户ID，关联 app_user.id。';
comment on column clan_membership.person_id is '可选谱内人物ID，表示该系统用户对应族谱中的哪个人物。';
comment on column clan_membership.join_status is '加入状态：invited 已邀请，joined 已加入，rejected 已拒绝等。';
comment on column clan_membership.member_status is '成员状态：active 有效，disabled 停用，removed 移除等。';
comment on column clan_membership.invited_by is '邀请人用户ID，关联 app_user.id。';
comment on column clan_membership.joined_at is '加入时间。';
comment on column clan_membership.created_by is '创建人用户ID，关联 app_user.id。';
comment on column clan_membership.created_at is '创建时间。';
comment on column clan_membership.updated_by is '最后更新人用户ID，关联 app_user.id。';
comment on column clan_membership.updated_at is '最后更新时间。';

create table if not exists member_role (
    id bigserial primary key,
    membership_id bigint not null references clan_membership(id),
    role_id bigint not null references app_role(id),
    scope_type varchar(32) not null default 'clan',
    scope_id bigint not null,
    status varchar(32) not null default 'active',
    granted_by bigint references app_user(id),
    granted_at timestamp not null default now(),
    revoked_at timestamp,
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    constraint chk_member_role_scope_type check (scope_type in ('global', 'clan', 'branch', 'self')),
    unique (membership_id, role_id, scope_type, scope_id)
);

comment on table member_role is '成员角色授权表：表示某个宗族成员在某个范围内拥有什么角色。';
comment on column member_role.id is '主键ID。';
comment on column member_role.membership_id is '宗族成员身份ID，关联 clan_membership.id。';
comment on column member_role.role_id is '角色ID，关联 app_role.id。';
comment on column member_role.scope_type is '授权范围类型：global 平台级，clan 宗族级，branch 支派级，self 本人/家庭级。';
comment on column member_role.scope_id is '授权范围ID：scope_type 为 clan 时关联 clan.id，为 branch 时关联 branch.id，为 self 时关联 person.id，为 global 时建议为 0。';
comment on column member_role.status is '授权状态：active 有效，disabled 停用，revoked 已撤销。';
comment on column member_role.granted_by is '授权人用户ID，关联 app_user.id。';
comment on column member_role.granted_at is '授权时间。';
comment on column member_role.revoked_at is '撤销时间。';
comment on column member_role.created_by is '创建人用户ID，关联 app_user.id。';
comment on column member_role.created_at is '创建时间。';
comment on column member_role.updated_by is '最后更新人用户ID，关联 app_user.id。';
comment on column member_role.updated_at is '最后更新时间。';

create index if not exists idx_app_permission_module on app_permission(module_code);
create index if not exists idx_app_permission_resource_action on app_permission(resource_code, action_code);
create index if not exists idx_app_role_permission_role on app_role_permission(role_id);
create index if not exists idx_app_role_permission_permission on app_role_permission(permission_id);
create index if not exists idx_clan_membership_clan on clan_membership(clan_id);
create index if not exists idx_clan_membership_user on clan_membership(user_id);
create index if not exists idx_clan_membership_person on clan_membership(person_id);
create index if not exists idx_member_role_membership on member_role(membership_id);
create index if not exists idx_member_role_role on member_role(role_id);
create index if not exists idx_member_role_scope on member_role(scope_type, scope_id);

insert into app_permission (
    permission_code,
    permission_name,
    module_code,
    module_name,
    resource_code,
    action_code,
    description,
    system_permission,
    status
)
values
    ('clan.view', '查看宗族', 'clan', '宗族管理', 'clan', 'view', '查看宗族基础信息。', true, 'active'),
    ('clan.update', '编辑宗族', 'clan', '宗族管理', 'clan', 'update', '编辑宗族基础信息。', true, 'active'),
    ('branch.view', '查看支派', 'branch', '支派管理', 'branch', 'view', '查看支派。', true, 'active'),
    ('branch.create', '创建支派', 'branch', '支派管理', 'branch', 'create', '创建支派。', true, 'active'),
    ('branch.update', '编辑支派', 'branch', '支派管理', 'branch', 'update', '编辑支派。', true, 'active'),
    ('branch.delete', '删除支派', 'branch', '支派管理', 'branch', 'delete', '删除支派。', true, 'active'),
    ('generation.view', '查看字辈', 'generation', '字辈管理', 'generation', 'view', '查看字辈方案和字辈明细。', true, 'active'),
    ('generation.create', '创建字辈', 'generation', '字辈管理', 'generation', 'create', '创建字辈方案或字辈明细。', true, 'active'),
    ('generation.update', '编辑字辈', 'generation', '字辈管理', 'generation', 'update', '编辑字辈方案或字辈明细。', true, 'active'),
    ('person.view', '查看人物', 'person', '人物档案', 'person', 'view', '查看人物档案。', true, 'active'),
    ('person.create', '创建人物', 'person', '人物档案', 'person', 'create', '创建人物档案。', true, 'active'),
    ('person.update', '编辑人物', 'person', '人物档案', 'person', 'update', '编辑人物档案。', true, 'active'),
    ('person.delete', '删除人物', 'person', '人物档案', 'person', 'delete', '删除人物档案。', true, 'active'),
    ('person.submit_review', '人物提交审核', 'person', '人物档案', 'person', 'submit_review', '提交人物变更审核。', true, 'active'),
    ('relationship.view', '查看关系', 'relationship', '亲属关系', 'relationship', 'view', '查看亲属关系。', true, 'active'),
    ('relationship.create', '创建关系', 'relationship', '亲属关系', 'relationship', 'create', '创建亲属关系。', true, 'active'),
    ('relationship.update', '编辑关系', 'relationship', '亲属关系', 'relationship', 'update', '编辑亲属关系。', true, 'active'),
    ('relationship.delete', '删除关系', 'relationship', '亲属关系', 'relationship', 'delete', '删除亲属关系。', true, 'active'),
    ('relationship.submit_review', '关系提交审核', 'relationship', '亲属关系', 'relationship', 'submit_review', '提交关系变更审核。', true, 'active'),
    ('source.view', '查看来源', 'source', '来源资料', 'source', 'view', '查看来源资料。', true, 'active'),
    ('source.create', '创建来源', 'source', '来源资料', 'source', 'create', '创建来源资料。', true, 'active'),
    ('source.update', '编辑来源', 'source', '来源资料', 'source', 'update', '编辑来源资料。', true, 'active'),
    ('source.delete', '删除来源', 'source', '来源资料', 'source', 'delete', '删除来源资料。', true, 'active'),
    ('source.verify', '验证来源', 'source', '来源资料', 'source', 'verify', '验证来源资料。', true, 'active'),
    ('source.submit_review', '来源提交审核', 'source', '来源资料', 'source', 'submit_review', '提交来源资料变更审核。', true, 'active'),
    ('review.view', '查看审核', 'review', '审核中心', 'review', 'view', '查看审核任务。', true, 'active'),
    ('review.submit', '提交审核', 'review', '审核中心', 'review', 'submit', '提交审核任务。', true, 'active'),
    ('review.approve', '审核通过', 'review', '审核中心', 'review', 'approve', '审核通过。', true, 'active'),
    ('review.reject', '审核驳回', 'review', '审核中心', 'review', 'reject', '审核驳回。', true, 'active'),
    ('tree.view', '查看世系', 'tree', '世系图谱', 'tree', 'view', '查看世系图谱。', true, 'active'),
    ('export.person', '导出人物', 'export', '导出', 'person', 'export', '导出人物数据。', true, 'active'),
    ('export.relationship', '导出关系', 'export', '导出', 'relationship', 'export', '导出关系数据。', true, 'active'),
    ('export.genealogy_book', '导出族谱', 'export', '导出', 'genealogy_book', 'export', '导出族谱成册资料。', true, 'active'),
    ('member.view', '查看修谱成员', 'member', '成员权限', 'member', 'view', '查看修谱成员。', true, 'active'),
    ('member.invite', '邀请修谱成员', 'member', '成员权限', 'member', 'invite', '邀请修谱成员。', true, 'active'),
    ('member.update', '编辑修谱成员', 'member', '成员权限', 'member', 'update', '编辑修谱成员身份。', true, 'active'),
    ('member.grant_role', '授予成员角色', 'member', '成员权限', 'member', 'grant_role', '给修谱成员授予角色。', true, 'active'),
    ('member.revoke_role', '撤销成员角色', 'member', '成员权限', 'member', 'revoke_role', '撤销修谱成员角色。', true, 'active')
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    module_name = excluded.module_name,
    resource_code = excluded.resource_code,
    action_code = excluded.action_code,
    description = excluded.description,
    system_permission = excluded.system_permission,
    status = excluded.status,
    updated_at = now();

with role_permissions(role_code, permission_code) as (
    values
        -- clan_admin: full clan-level administration.
        ('clan_admin', 'clan.view'),
        ('clan_admin', 'clan.update'),
        ('clan_admin', 'branch.view'),
        ('clan_admin', 'branch.create'),
        ('clan_admin', 'branch.update'),
        ('clan_admin', 'branch.delete'),
        ('clan_admin', 'generation.view'),
        ('clan_admin', 'generation.create'),
        ('clan_admin', 'generation.update'),
        ('clan_admin', 'person.view'),
        ('clan_admin', 'person.create'),
        ('clan_admin', 'person.update'),
        ('clan_admin', 'person.delete'),
        ('clan_admin', 'person.submit_review'),
        ('clan_admin', 'relationship.view'),
        ('clan_admin', 'relationship.create'),
        ('clan_admin', 'relationship.update'),
        ('clan_admin', 'relationship.delete'),
        ('clan_admin', 'relationship.submit_review'),
        ('clan_admin', 'source.view'),
        ('clan_admin', 'source.create'),
        ('clan_admin', 'source.update'),
        ('clan_admin', 'source.delete'),
        ('clan_admin', 'source.verify'),
        ('clan_admin', 'source.submit_review'),
        ('clan_admin', 'review.view'),
        ('clan_admin', 'review.submit'),
        ('clan_admin', 'review.approve'),
        ('clan_admin', 'review.reject'),
        ('clan_admin', 'tree.view'),
        ('clan_admin', 'export.person'),
        ('clan_admin', 'export.relationship'),
        ('clan_admin', 'export.genealogy_book'),
        ('clan_admin', 'member.view'),
        ('clan_admin', 'member.invite'),
        ('clan_admin', 'member.update'),
        ('clan_admin', 'member.grant_role'),
        ('clan_admin', 'member.revoke_role'),

        -- branch_admin: branch-scoped management.
        ('branch_admin', 'clan.view'),
        ('branch_admin', 'branch.view'),
        ('branch_admin', 'branch.update'),
        ('branch_admin', 'generation.view'),
        ('branch_admin', 'person.view'),
        ('branch_admin', 'person.create'),
        ('branch_admin', 'person.update'),
        ('branch_admin', 'person.submit_review'),
        ('branch_admin', 'relationship.view'),
        ('branch_admin', 'relationship.create'),
        ('branch_admin', 'relationship.update'),
        ('branch_admin', 'relationship.submit_review'),
        ('branch_admin', 'source.view'),
        ('branch_admin', 'source.create'),
        ('branch_admin', 'source.update'),
        ('branch_admin', 'source.submit_review'),
        ('branch_admin', 'review.view'),
        ('branch_admin', 'review.submit'),
        ('branch_admin', 'tree.view'),
        ('branch_admin', 'export.person'),
        ('branch_admin', 'export.relationship'),

        -- editor: data maintenance and review submission.
        ('editor', 'clan.view'),
        ('editor', 'branch.view'),
        ('editor', 'generation.view'),
        ('editor', 'person.view'),
        ('editor', 'person.create'),
        ('editor', 'person.update'),
        ('editor', 'person.submit_review'),
        ('editor', 'relationship.view'),
        ('editor', 'relationship.create'),
        ('editor', 'relationship.update'),
        ('editor', 'relationship.submit_review'),
        ('editor', 'source.view'),
        ('editor', 'source.create'),
        ('editor', 'source.update'),
        ('editor', 'source.submit_review'),
        ('editor', 'review.view'),
        ('editor', 'review.submit'),
        ('editor', 'tree.view'),

        -- reviewer: read and approve/reject.
        ('reviewer', 'clan.view'),
        ('reviewer', 'branch.view'),
        ('reviewer', 'generation.view'),
        ('reviewer', 'person.view'),
        ('reviewer', 'relationship.view'),
        ('reviewer', 'source.view'),
        ('reviewer', 'review.view'),
        ('reviewer', 'review.approve'),
        ('reviewer', 'review.reject'),
        ('reviewer', 'tree.view'),

        -- viewer: read-only.
        ('viewer', 'clan.view'),
        ('viewer', 'branch.view'),
        ('viewer', 'generation.view'),
        ('viewer', 'person.view'),
        ('viewer', 'relationship.view'),
        ('viewer', 'source.view'),
        ('viewer', 'review.view'),
        ('viewer', 'tree.view')
)
insert into app_role_permission (role_id, permission_id, effect, status)
select r.id, p.id, 'allow', 'active'
from role_permissions rp
join app_role r on r.role_code = rp.role_code
join app_permission p on p.permission_code = rp.permission_code
on conflict (role_id, permission_id) do update
set effect = excluded.effect,
    status = excluded.status,
    updated_at = now();

insert into clan_membership (
    clan_id,
    user_id,
    person_id,
    join_status,
    member_status,
    invited_by,
    joined_at,
    created_by,
    created_at,
    updated_by,
    updated_at
)
select distinct on (cm.clan_id, cm.user_id)
    cm.clan_id,
    cm.user_id,
    cm.person_id,
    cm.join_status,
    cm.member_status,
    cm.invited_by,
    cm.joined_at,
    coalesce(cm.invited_by, cm.user_id),
    cm.created_at,
    coalesce(cm.invited_by, cm.user_id),
    cm.updated_at
from clan_member cm
order by cm.clan_id, cm.user_id, cm.created_at
on conflict (clan_id, user_id) do update
set person_id = coalesce(excluded.person_id, clan_membership.person_id),
    join_status = excluded.join_status,
    member_status = excluded.member_status,
    invited_by = excluded.invited_by,
    joined_at = coalesce(excluded.joined_at, clan_membership.joined_at),
    updated_by = excluded.updated_by,
    updated_at = now();

insert into member_role (
    membership_id,
    role_id,
    scope_type,
    scope_id,
    status,
    granted_by,
    granted_at,
    created_by,
    created_at,
    updated_by,
    updated_at
)
select
    cmship.id,
    cm.role_id,
    case when cm.scope_type = 'branch_subtree' then 'branch' else cm.scope_type end,
    coalesce(cm.scope_id, case when cm.scope_type in ('branch', 'branch_subtree') then cm.branch_id else cm.clan_id end, cm.clan_id),
    cm.member_status,
    cm.invited_by,
    coalesce(cm.joined_at, cm.created_at),
    coalesce(cm.invited_by, cm.user_id),
    cm.created_at,
    coalesce(cm.invited_by, cm.user_id),
    cm.updated_at
from clan_member cm
join clan_membership cmship
  on cmship.clan_id = cm.clan_id
 and cmship.user_id = cm.user_id
where cm.role_id is not null
on conflict (membership_id, role_id, scope_type, scope_id) do update
set status = excluded.status,
    granted_by = excluded.granted_by,
    granted_at = excluded.granted_at,
    updated_by = excluded.updated_by,
    updated_at = now();
