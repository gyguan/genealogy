-- RBAC + membership refactor phase 1.
-- Defensive migration for databases that may already contain partial RBAC tables.

create table if not exists app_permission (
    id bigserial primary key,
    permission_code varchar(128),
    permission_name varchar(100),
    module_code varchar(64),
    module_name varchar(100),
    resource_code varchar(64),
    action_code varchar(64),
    description text,
    system_permission boolean default true,
    status varchar(32) default 'active',
    created_by bigint references app_user(id),
    created_at timestamp default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp default now()
);

alter table app_permission add column if not exists permission_code varchar(128);
alter table app_permission add column if not exists permission_name varchar(100);
alter table app_permission add column if not exists module_code varchar(64);
alter table app_permission add column if not exists module_name varchar(100);
alter table app_permission add column if not exists resource_code varchar(64);
alter table app_permission add column if not exists action_code varchar(64);
alter table app_permission add column if not exists description text;
alter table app_permission add column if not exists system_permission boolean default true;
alter table app_permission add column if not exists status varchar(32) default 'active';
alter table app_permission add column if not exists created_by bigint references app_user(id);
alter table app_permission add column if not exists created_at timestamp default now();
alter table app_permission add column if not exists updated_by bigint references app_user(id);
alter table app_permission add column if not exists updated_at timestamp default now();

update app_permission
set permission_code = replace(permission_code, ':', '.')
where permission_code like '%:%';

update app_permission
set resource_code = coalesce(resource_code, nullif(split_part(permission_code, '.', 1), ''), 'legacy'),
    action_code = coalesce(action_code, nullif(split_part(permission_code, '.', 2), ''), 'unknown');

update app_permission
set permission_code = coalesce(permission_code, resource_code || '.' || action_code),
    permission_name = coalesce(permission_name, permission_code, '未命名权限'),
    module_code = coalesce(module_code, resource_code, 'legacy'),
    module_name = coalesce(module_name, module_code, resource_code, '权限管理'),
    system_permission = coalesce(system_permission, true),
    status = coalesce(status, 'active'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

with duplicated as (
    select id,
           row_number() over (partition by resource_code, action_code order by id) as rn
    from app_permission
)
delete from app_permission p
using duplicated d
where p.id = d.id
  and d.rn > 1;

with duplicated as (
    select id,
           row_number() over (partition by permission_code order by id) as rn
    from app_permission
)
delete from app_permission p
using duplicated d
where p.id = d.id
  and d.rn > 1;

alter table app_permission alter column system_permission set default true;
alter table app_permission alter column status set default 'active';
alter table app_permission alter column created_at set default now();
alter table app_permission alter column updated_at set default now();
create unique index if not exists ux_app_permission_permission_code on app_permission(permission_code);
create unique index if not exists ux_app_permission_resource_action on app_permission(resource_code, action_code);

comment on table app_permission is '权限点定义表：定义系统可管控的业务动作。';
comment on column app_permission.permission_code is '权限编码，采用资源.动作格式。';
comment on column app_permission.permission_name is '权限中文名称。';
comment on column app_permission.module_code is '权限所属模块编码。';
comment on column app_permission.module_name is '权限所属模块名称。';
comment on column app_permission.resource_code is '权限作用资源编码。';
comment on column app_permission.action_code is '权限动作编码。';
comment on column app_permission.description is '权限点说明。';
comment on column app_permission.created_by is '创建人用户ID。';
comment on column app_permission.created_at is '创建时间。';
comment on column app_permission.updated_by is '最后更新人用户ID。';
comment on column app_permission.updated_at is '最后更新时间。';

create table if not exists app_role_permission (
    id bigserial primary key,
    role_id bigint references app_role(id),
    permission_id bigint references app_permission(id),
    effect varchar(16) default 'allow',
    status varchar(32) default 'active',
    created_by bigint references app_user(id),
    created_at timestamp default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp default now()
);

alter table app_role_permission add column if not exists role_id bigint references app_role(id);
alter table app_role_permission add column if not exists permission_id bigint references app_permission(id);
alter table app_role_permission add column if not exists effect varchar(16) default 'allow';
alter table app_role_permission add column if not exists status varchar(32) default 'active';
alter table app_role_permission add column if not exists created_by bigint references app_user(id);
alter table app_role_permission add column if not exists created_at timestamp default now();
alter table app_role_permission add column if not exists updated_by bigint references app_user(id);
alter table app_role_permission add column if not exists updated_at timestamp default now();
update app_role_permission set effect = coalesce(effect, 'allow'), status = coalesce(status, 'active'), created_at = coalesce(created_at, now()), updated_at = coalesce(updated_at, now());
create unique index if not exists ux_app_role_permission_role_permission on app_role_permission(role_id, permission_id);
comment on table app_role_permission is '角色权限关系表。';
comment on column app_role_permission.role_id is '角色ID。';
comment on column app_role_permission.permission_id is '权限点ID。';
comment on column app_role_permission.effect is '授权效果。';
comment on column app_role_permission.created_by is '创建人用户ID。';
comment on column app_role_permission.created_at is '创建时间。';
comment on column app_role_permission.updated_by is '最后更新人用户ID。';
comment on column app_role_permission.updated_at is '最后更新时间。';

create table if not exists clan_membership (
    id bigserial primary key,
    clan_id bigint references clan(id),
    user_id bigint references app_user(id),
    person_id bigint references person(id),
    join_status varchar(32) default 'invited',
    member_status varchar(32) default 'active',
    invited_by bigint references app_user(id),
    joined_at timestamp,
    created_by bigint references app_user(id),
    created_at timestamp default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp default now()
);

alter table clan_membership add column if not exists clan_id bigint references clan(id);
alter table clan_membership add column if not exists user_id bigint references app_user(id);
alter table clan_membership add column if not exists person_id bigint references person(id);
alter table clan_membership add column if not exists join_status varchar(32) default 'invited';
alter table clan_membership add column if not exists member_status varchar(32) default 'active';
alter table clan_membership add column if not exists invited_by bigint references app_user(id);
alter table clan_membership add column if not exists joined_at timestamp;
alter table clan_membership add column if not exists created_by bigint references app_user(id);
alter table clan_membership add column if not exists created_at timestamp default now();
alter table clan_membership add column if not exists updated_by bigint references app_user(id);
alter table clan_membership add column if not exists updated_at timestamp default now();
update clan_membership set join_status = coalesce(join_status, 'invited'), member_status = coalesce(member_status, 'active'), created_at = coalesce(created_at, now()), updated_at = coalesce(updated_at, now());
create unique index if not exists ux_clan_membership_clan_user on clan_membership(clan_id, user_id);
comment on table clan_membership is '宗族成员身份表。';
comment on column clan_membership.created_by is '创建人用户ID。';
comment on column clan_membership.created_at is '创建时间。';
comment on column clan_membership.updated_by is '最后更新人用户ID。';
comment on column clan_membership.updated_at is '最后更新时间。';

create table if not exists member_role (
    id bigserial primary key,
    membership_id bigint references clan_membership(id),
    role_id bigint references app_role(id),
    scope_type varchar(32) default 'clan',
    scope_id bigint,
    status varchar(32) default 'active',
    granted_by bigint references app_user(id),
    granted_at timestamp default now(),
    revoked_at timestamp,
    created_by bigint references app_user(id),
    created_at timestamp default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp default now()
);

alter table member_role add column if not exists membership_id bigint references clan_membership(id);
alter table member_role add column if not exists role_id bigint references app_role(id);
alter table member_role add column if not exists scope_type varchar(32) default 'clan';
alter table member_role add column if not exists scope_id bigint;
alter table member_role add column if not exists status varchar(32) default 'active';
alter table member_role add column if not exists granted_by bigint references app_user(id);
alter table member_role add column if not exists granted_at timestamp default now();
alter table member_role add column if not exists revoked_at timestamp;
alter table member_role add column if not exists created_by bigint references app_user(id);
alter table member_role add column if not exists created_at timestamp default now();
alter table member_role add column if not exists updated_by bigint references app_user(id);
alter table member_role add column if not exists updated_at timestamp default now();
update member_role set scope_type = coalesce(scope_type, 'clan'), status = coalesce(status, 'active'), granted_at = coalesce(granted_at, created_at, now()), created_at = coalesce(created_at, now()), updated_at = coalesce(updated_at, now());
create unique index if not exists ux_member_role_membership_role_scope on member_role(membership_id, role_id, scope_type, scope_id);
comment on table member_role is '成员角色授权表。';
comment on column member_role.created_by is '创建人用户ID。';
comment on column member_role.created_at is '创建时间。';
comment on column member_role.updated_by is '最后更新人用户ID。';
comment on column member_role.updated_at is '最后更新时间。';

create index if not exists idx_app_permission_module on app_permission(module_code);
create index if not exists idx_app_role_permission_role on app_role_permission(role_id);
create index if not exists idx_clan_membership_clan on clan_membership(clan_id);
create index if not exists idx_member_role_membership on member_role(membership_id);

with seed(permission_code, permission_name, module_code, module_name, resource_code, action_code) as (
    values
        ('clan.view','查看宗族','clan','宗族管理','clan','view'),
        ('clan.update','编辑宗族','clan','宗族管理','clan','update'),
        ('branch.view','查看支派','branch','支派管理','branch','view'),
        ('branch.create','创建支派','branch','支派管理','branch','create'),
        ('branch.update','编辑支派','branch','支派管理','branch','update'),
        ('branch.delete','删除支派','branch','支派管理','branch','delete'),
        ('generation.view','查看字辈','generation','字辈管理','generation','view'),
        ('generation.create','创建字辈','generation','字辈管理','generation','create'),
        ('generation.update','编辑字辈','generation','字辈管理','generation','update'),
        ('person.view','查看人物','person','人物档案','person','view'),
        ('person.create','创建人物','person','人物档案','person','create'),
        ('person.update','编辑人物','person','人物档案','person','update'),
        ('person.delete','删除人物','person','人物档案','person','delete'),
        ('person.submit_review','人物提交审核','person','人物档案','person','submit_review'),
        ('relationship.view','查看关系','relationship','亲属关系','relationship','view'),
        ('relationship.create','创建关系','relationship','亲属关系','relationship','create'),
        ('relationship.update','编辑关系','relationship','亲属关系','relationship','update'),
        ('relationship.delete','删除关系','relationship','亲属关系','relationship','delete'),
        ('relationship.submit_review','关系提交审核','relationship','亲属关系','relationship','submit_review'),
        ('source.view','查看来源','source','来源资料','source','view'),
        ('source.create','创建来源','source','来源资料','source','create'),
        ('source.update','编辑来源','source','来源资料','source','update'),
        ('source.delete','删除来源','source','来源资料','source','delete'),
        ('source.verify','验证来源','source','来源资料','source','verify'),
        ('source.submit_review','来源提交审核','source','来源资料','source','submit_review'),
        ('review.view','查看审核','review','审核中心','review','view'),
        ('review.submit','提交审核','review','审核中心','review','submit'),
        ('review.approve','审核通过','review','审核中心','review','approve'),
        ('review.reject','审核驳回','review','审核中心','review','reject'),
        ('tree.view','查看世系','tree','世系图谱','tree','view'),
        ('export.person','导出人物','export','导出','person','export'),
        ('export.relationship','导出关系','export','导出','relationship','export'),
        ('export.genealogy_book','导出族谱','export','导出','genealogy_book','export'),
        ('member.view','查看修谱成员','member','成员权限','member','view'),
        ('member.invite','邀请修谱成员','member','成员权限','member','invite'),
        ('member.update','编辑修谱成员','member','成员权限','member','update'),
        ('member.grant_role','授予成员角色','member','成员权限','member','grant_role'),
        ('member.revoke_role','撤销成员角色','member','成员权限','member','revoke_role')
)
insert into app_permission (permission_code, permission_name, module_code, module_name, resource_code, action_code, description, system_permission, status)
select permission_code, permission_name, module_code, module_name, resource_code, action_code, permission_name, true, 'active'
from seed
on conflict (resource_code, action_code) do update
set permission_code = excluded.permission_code,
    permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    module_name = excluded.module_name,
    description = excluded.description,
    system_permission = excluded.system_permission,
    status = excluded.status,
    updated_at = now();

with rp(role_code, permission_code) as (
    values
        ('clan_admin','clan.view'),('clan_admin','clan.update'),('clan_admin','branch.view'),('clan_admin','branch.create'),('clan_admin','branch.update'),('clan_admin','branch.delete'),('clan_admin','generation.view'),('clan_admin','generation.create'),('clan_admin','generation.update'),('clan_admin','person.view'),('clan_admin','person.create'),('clan_admin','person.update'),('clan_admin','person.delete'),('clan_admin','person.submit_review'),('clan_admin','relationship.view'),('clan_admin','relationship.create'),('clan_admin','relationship.update'),('clan_admin','relationship.delete'),('clan_admin','relationship.submit_review'),('clan_admin','source.view'),('clan_admin','source.create'),('clan_admin','source.update'),('clan_admin','source.delete'),('clan_admin','source.verify'),('clan_admin','source.submit_review'),('clan_admin','review.view'),('clan_admin','review.submit'),('clan_admin','review.approve'),('clan_admin','review.reject'),('clan_admin','tree.view'),('clan_admin','export.person'),('clan_admin','export.relationship'),('clan_admin','export.genealogy_book'),('clan_admin','member.view'),('clan_admin','member.invite'),('clan_admin','member.update'),('clan_admin','member.grant_role'),('clan_admin','member.revoke_role'),
        ('branch_admin','clan.view'),('branch_admin','branch.view'),('branch_admin','branch.update'),('branch_admin','generation.view'),('branch_admin','person.view'),('branch_admin','person.create'),('branch_admin','person.update'),('branch_admin','person.submit_review'),('branch_admin','relationship.view'),('branch_admin','relationship.create'),('branch_admin','relationship.update'),('branch_admin','relationship.submit_review'),('branch_admin','source.view'),('branch_admin','source.create'),('branch_admin','source.update'),('branch_admin','source.submit_review'),('branch_admin','review.view'),('branch_admin','review.submit'),('branch_admin','tree.view'),('branch_admin','export.person'),('branch_admin','export.relationship'),
        ('editor','clan.view'),('editor','branch.view'),('editor','generation.view'),('editor','person.view'),('editor','person.create'),('editor','person.update'),('editor','person.submit_review'),('editor','relationship.view'),('editor','relationship.create'),('editor','relationship.update'),('editor','relationship.submit_review'),('editor','source.view'),('editor','source.create'),('editor','source.update'),('editor','source.submit_review'),('editor','review.view'),('editor','review.submit'),('editor','tree.view'),
        ('reviewer','clan.view'),('reviewer','branch.view'),('reviewer','generation.view'),('reviewer','person.view'),('reviewer','relationship.view'),('reviewer','source.view'),('reviewer','review.view'),('reviewer','review.approve'),('reviewer','review.reject'),('reviewer','tree.view'),
        ('viewer','clan.view'),('viewer','branch.view'),('viewer','generation.view'),('viewer','person.view'),('viewer','relationship.view'),('viewer','source.view'),('viewer','review.view'),('viewer','tree.view')
)
insert into app_role_permission (role_id, permission_id, effect, status)
select r.id, p.id, 'allow', 'active'
from rp
join app_role r on r.role_code = rp.role_code
join app_permission p on p.permission_code = rp.permission_code
on conflict (role_id, permission_id) do update
set effect = excluded.effect, status = excluded.status, updated_at = now();

insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
select distinct on (cm.clan_id, cm.user_id)
    cm.clan_id, cm.user_id, cm.person_id, cm.join_status, cm.member_status, cm.invited_by, cm.joined_at,
    coalesce(cm.invited_by, cm.user_id), cm.created_at, coalesce(cm.invited_by, cm.user_id), cm.updated_at
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

insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
select cmship.id,
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
join clan_membership cmship on cmship.clan_id = cm.clan_id and cmship.user_id = cm.user_id
where cm.role_id is not null
on conflict (membership_id, role_id, scope_type, scope_id) do update
set status = excluded.status,
    granted_by = excluded.granted_by,
    granted_at = excluded.granted_at,
    updated_by = excluded.updated_by,
    updated_at = now();
