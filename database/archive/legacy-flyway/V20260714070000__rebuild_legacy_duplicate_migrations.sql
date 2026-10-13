-- Forward compensation for immutable legacy duplicate V3/V4/V5 files.
-- Runtime packaging keeps permission V3/V4 and import-foundation V5 as canonical.

alter table source
    add column if not exists source_date varchar(100),
    add column if not exists confidence_level varchar(32) not null default 'unknown',
    add column if not exists privacy_level varchar(32) not null default 'clan_only',
    add column if not exists sensitive_level varchar(32) not null default 'normal',
    add column if not exists updated_at timestamp not null default now();

update source
set verification_status = case
        when verification_status is null or trim(verification_status) = '' then 'draft'
        when lower(verification_status) = 'unverified' then 'draft'
        when lower(verification_status) in ('verified', 'reviewed', 'approved') then 'official'
        else lower(verification_status)
    end,
    confidence_level = coalesce(nullif(trim(confidence_level), ''), 'unknown'),
    privacy_level = coalesce(nullif(trim(privacy_level), ''), 'clan_only'),
    sensitive_level = coalesce(nullif(trim(sensitive_level), ''), 'normal'),
    updated_at = coalesce(updated_at, created_at, now());

update source set source_type = 'oral_history' where source_type = 'oral_record';

alter table source
    alter column verification_status set default 'draft',
    alter column confidence_level set default 'unknown',
    alter column privacy_level set default 'clan_only',
    alter column sensitive_level set default 'normal',
    alter column updated_at set default now();

alter table source_binding
    add column if not exists confidence_level varchar(32) not null default 'unknown',
    add column if not exists binding_status varchar(32) not null default 'official',
    add column if not exists updated_at timestamp not null default now();

update source_binding
set confidence_level = coalesce(nullif(trim(confidence_level), ''), 'unknown'),
    binding_status = case
        when binding_status is null or trim(binding_status) = '' then 'official'
        when lower(binding_status) = 'unverified' then 'draft'
        when lower(binding_status) in ('verified', 'reviewed', 'approved') then 'official'
        else lower(binding_status)
    end,
    updated_at = coalesce(updated_at, created_at, now());

alter table source_binding
    alter column confidence_level set default 'unknown',
    alter column binding_status set default 'official',
    alter column updated_at set default now();

alter table source_attachment
    add column if not exists privacy_level varchar(32) not null default 'clan_only',
    add column if not exists sensitive_level varchar(32) not null default 'normal';

update source_attachment
set privacy_level = coalesce(nullif(privacy_level, ''), 'clan_only'),
    sensitive_level = coalesce(nullif(sensitive_level, ''), 'normal');

alter table source_attachment
    alter column privacy_level set default 'clan_only',
    alter column sensitive_level set default 'normal';

create table if not exists attachment (
    id bigserial primary key,
    clan_id bigint,
    source_id bigint,
    file_name varchar(255),
    file_type varchar(120),
    file_size bigint,
    storage_path varchar(1000),
    thumbnail_path varchar(1000),
    checksum varchar(128),
    uploaded_by bigint,
    uploaded_at timestamp,
    access_level varchar(32)
);

create table if not exists user_account (
    id bigserial primary key,
    username varchar(100),
    phone varchar(50),
    email varchar(100),
    display_name varchar(100),
    password_hash varchar(255),
    status varchar(32) default 'active',
    created_at timestamp default now(),
    last_login_at timestamp
);

create table if not exists role (
    id bigserial primary key,
    role_code varchar(64),
    role_name varchar(100),
    description varchar(255)
);

create table if not exists member_role (
    id bigserial primary key,
    member_id bigint,
    role_id bigint,
    scope_type varchar(32) default 'clan',
    scope_id bigint,
    created_at timestamp default now()
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_source_verification_status') then
        alter table source add constraint chk_source_verification_status
            check (verification_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_confidence_level') then
        alter table source add constraint chk_source_confidence_level
            check (confidence_level in ('high', 'medium', 'low', 'unknown'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_privacy_level') then
        alter table source add constraint chk_source_privacy_level
            check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_sensitive_level') then
        alter table source add constraint chk_source_sensitive_level
            check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_binding_confidence_level') then
        alter table source_binding add constraint chk_source_binding_confidence_level
            check (confidence_level in ('high', 'medium', 'low', 'unknown'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_binding_status') then
        alter table source_binding add constraint chk_source_binding_status
            check (binding_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_attachment_privacy_level') then
        alter table source_attachment add constraint chk_source_attachment_privacy_level
            check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_attachment_sensitive_level') then
        alter table source_attachment add constraint chk_source_attachment_sensitive_level
            check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));
    end if;
end $$;

create unique index if not exists uk_source_binding_target on source_binding(source_id, target_type, target_id);
create index if not exists idx_source_clan_status on source(clan_id, verification_status);
create index if not exists idx_source_clan_privacy on source(clan_id, privacy_level);
create index if not exists idx_source_attachment_source_created on source_attachment(source_id, created_at desc) where deleted_at is null;
create index if not exists idx_attachment_clan on attachment(clan_id);
create index if not exists idx_attachment_source on attachment(source_id);
create index if not exists idx_user_account_username on user_account(username);
create index if not exists idx_role_code on role(role_code);
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = current_schema()
          and table_name = 'member_role'
          and column_name = 'member_id'
    ) then
        execute 'create index if not exists idx_member_role_member on member_role(member_id)';
    end if;
end $$;
create index if not exists idx_member_role_role on member_role(role_id);
create index if not exists idx_revision_source_binding_pending on revision(target_type, target_id, status) where target_type = 'source_binding';
create index if not exists idx_review_task_revision_status on review_task(revision_id, status);
create index if not exists idx_source_binding_active_target on source_binding(source_id, target_type, target_id, binding_status);


-- Consolidate the immutable V22 and operation-log seed migrations in their final dot-code form.
insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
values
    ('cross_clan_admin', '跨宗族管理员', '跨宗族运维和审计角色，可访问全部宗族空间', true, now(), now()),
    ('clan_admin', '宗族管理员', '管理本宗族空间、成员授权、支派、人物、关系、来源、审核和导出', true, now(), now()),
    ('branch_admin', '支派管理员', '管理授权支派及下级支派范围内的人物、关系、来源和支派数据', true, now(), now()),
    ('editor', '修谱编辑', '维护授权范围内的人物档案、世系关系、来源证据并提交审核', true, now(), now()),
    ('reviewer', '审核员', '查看待审内容，执行通过或驳回', true, now(), now()),
    ('viewer', '查看者', '仅可查看授权范围内的宗族、人物、关系和来源摘要', true, now(), now())
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

with permissions(permission_code, permission_name, sort_order, permission_type, description) as (
    values
        ('clan.view', '查看宗族', 101, 'business', '查看宗族空间和基础信息'),
        ('clan.update', '维护宗族', 102, 'business', '维护宗族基础信息'),
        ('clan.manage_settings', '管理宗族设置', 103, 'business', '维护宗族设置'),
        ('clan.delete', '删除宗族', 104, 'business', '删除宗族空间'),
        ('member.invite', '邀请成员', 201, 'system', '邀请成员加入宗族'),
        ('member.update_role', '调整成员角色', 202, 'system', '调整成员角色和授权范围'),
        ('member.disable', '停用成员', 203, 'system', '停用或恢复宗族成员'),
        ('member.transfer_owner', '转移宗族负责人', 204, 'system', '转移宗族负责人'),
        ('branch.view', '查看支派', 301, 'business', '查看支派信息'),
        ('branch.create', '创建支派', 302, 'business', '创建支派'),
        ('branch.update', '维护支派', 303, 'business', '维护支派信息'),
        ('branch.delete', '删除支派', 304, 'business', '删除支派'),
        ('person.view', '查看人物', 401, 'business', '查看人物档案'),
        ('person.create', '创建人物', 402, 'business', '创建人物档案'),
        ('person.update', '维护人物', 403, 'business', '维护人物档案'),
        ('person.delete', '删除人物', 404, 'business', '删除人物档案'),
        ('person.submit_review', '提交人物审核', 405, 'business', '提交人物变更审核'),
        ('relationship.view', '查看关系', 501, 'business', '查看亲属关系'),
        ('relationship.create', '创建关系', 502, 'business', '创建亲属关系'),
        ('relationship.update', '维护关系', 503, 'business', '维护亲属关系'),
        ('relationship.delete', '删除关系', 504, 'business', '删除亲属关系'),
        ('relationship.check_conflict', '检查关系冲突', 505, 'business', '检查亲属关系冲突'),
        ('relationship.submit_review', '提交关系审核', 506, 'business', '提交关系变更审核'),
        ('source.view', '查看来源', 601, 'business', '查看来源资料'),
        ('source.create', '创建来源', 602, 'business', '创建来源资料'),
        ('source.update', '维护来源', 603, 'business', '维护来源资料'),
        ('source.delete', '删除来源', 604, 'business', '删除来源资料'),
        ('source.bind', '绑定来源', 605, 'business', '绑定来源资料和族谱对象'),
        ('attachment.view', '查看附件', 701, 'business', '查看来源附件'),
        ('attachment.upload', '上传附件', 702, 'business', '上传来源附件'),
        ('attachment.preview', '预览附件', 703, 'business', '预览来源附件'),
        ('attachment.download', '下载附件', 704, 'business', '下载来源附件'),
        ('attachment.delete', '删除附件', 705, 'business', '删除来源附件'),
        ('review_task.view', '查看审核任务', 801, 'business', '查看审核任务'),
        ('review_task.approve', '审核通过', 802, 'business', '审核通过任务'),
        ('review_task.reject', '审核驳回', 803, 'business', '审核驳回任务'),
        ('review_task.assign', '分配审核任务', 804, 'business', '分配审核任务'),
        ('export_task.create', '创建导出任务', 901, 'business', '创建导出任务'),
        ('export_task.approve', '审批导出任务', 902, 'business', '审批导出任务'),
        ('export_task.download', '下载导出结果', 903, 'business', '下载导出结果'),
        ('operation_log.view', '查看操作日志', 1001, 'system', '查看当前宗族操作日志和审计追踪'),
        ('operation_log.export', '导出操作日志', 1002, 'system', '导出当前宗族操作日志和审计报表')
)
insert into app_permission (
    permission_code, permission_name, permission_type, resource_type, action_type,
    resource_code, action_code, module_code, module_name, permission_category,
    enabled, sort_order, description, system_permission, status, created_at, updated_at
)
select permission_code,
       permission_name,
       permission_type,
       split_part(permission_code, '.', 1),
       split_part(permission_code, '.', 2),
       split_part(permission_code, '.', 1),
       split_part(permission_code, '.', 2),
       split_part(permission_code, '.', 1),
       split_part(permission_code, '.', 1),
       permission_type,
       true,
       sort_order,
       description,
       true,
       'active',
       now(),
       now()
from permissions
on conflict (resource_code, action_code) do update
set permission_code = excluded.permission_code,
    permission_name = excluded.permission_name,
    permission_type = excluded.permission_type,
    resource_type = excluded.resource_type,
    action_type = excluded.action_type,
    module_code = excluded.module_code,
    module_name = excluded.module_name,
    permission_category = excluded.permission_category,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    description = excluded.description,
    system_permission = excluded.system_permission,
    status = excluded.status,
    updated_at = now();

-- Remove obsolete coarse permissions only after their replacement rows exist.
delete from app_role_permission
where permission_id in (
    select id from app_permission
    where permission_code in (
        'clan.manage', 'branch.manage', 'person.manage', 'relationship.manage',
        'source.manage', 'review.view', 'review.approve', 'member.view', 'member.manage', 'log.view'
    )
);
delete from app_permission
where permission_code in (
    'clan.manage', 'branch.manage', 'person.manage', 'relationship.manage',
    'source.manage', 'review.view', 'review.approve', 'member.view', 'member.manage', 'log.view'
);

-- Rebuild the baseline built-in role grants against stable permission IDs.
delete from app_role_permission
where role_id in (
    select id from app_role
    where role_code in ('cross_clan_admin', 'clan_admin', 'branch_admin', 'editor', 'reviewer', 'viewer')
);

insert into app_role_permission (role_id, permission_id, effect, status, created_at, updated_at)
select r.id, p.id, 'allow', 'active', now(), now()
from app_role r
join app_permission p on p.permission_code in (
    'clan.view', 'clan.update', 'clan.manage_settings', 'clan.delete',
    'member.invite', 'member.update_role', 'member.disable', 'member.transfer_owner',
    'branch.view', 'branch.create', 'branch.update', 'branch.delete',
    'person.view', 'person.create', 'person.update', 'person.delete', 'person.submit_review',
    'relationship.view', 'relationship.create', 'relationship.update', 'relationship.delete',
    'relationship.check_conflict', 'relationship.submit_review',
    'source.view', 'source.create', 'source.update', 'source.delete', 'source.bind',
    'attachment.view', 'attachment.upload', 'attachment.preview', 'attachment.download', 'attachment.delete',
    'review_task.view', 'review_task.approve', 'review_task.reject', 'review_task.assign',
    'export_task.create', 'export_task.approve', 'export_task.download',
    'operation_log.view', 'operation_log.export'
)
where r.role_code in ('cross_clan_admin', 'clan_admin')
on conflict (role_id, permission_id) do update set effect = 'allow', status = 'active', updated_at = now();

insert into app_role_permission (role_id, permission_id, effect, status, created_at, updated_at)
select r.id, p.id, 'allow', 'active', now(), now()
from app_role r
join app_permission p on p.permission_code in (
    'clan.view', 'branch.view', 'branch.create', 'branch.update',
    'person.view', 'person.create', 'person.update', 'person.submit_review',
    'relationship.view', 'relationship.create', 'relationship.update',
    'relationship.check_conflict', 'relationship.submit_review',
    'source.view', 'source.create', 'source.update', 'source.bind',
    'attachment.view', 'attachment.upload', 'attachment.preview', 'attachment.download',
    'review_task.view', 'export_task.create'
)
where r.role_code = 'branch_admin'
on conflict (role_id, permission_id) do update set effect = 'allow', status = 'active', updated_at = now();

insert into app_role_permission (role_id, permission_id, effect, status, created_at, updated_at)
select r.id, p.id, 'allow', 'active', now(), now()
from app_role r
join app_permission p on p.permission_code in (
    'clan.view', 'branch.view',
    'person.view', 'person.create', 'person.update', 'person.submit_review',
    'relationship.view', 'relationship.create', 'relationship.update',
    'relationship.check_conflict', 'relationship.submit_review',
    'source.view', 'source.create', 'source.update', 'source.bind',
    'attachment.view', 'attachment.upload', 'attachment.preview', 'attachment.download',
    'review_task.view'
)
where r.role_code = 'editor'
on conflict (role_id, permission_id) do update set effect = 'allow', status = 'active', updated_at = now();

insert into app_role_permission (role_id, permission_id, effect, status, created_at, updated_at)
select r.id, p.id, 'allow', 'active', now(), now()
from app_role r
join app_permission p on p.permission_code in (
    'clan.view', 'branch.view', 'person.view', 'relationship.view', 'source.view',
    'attachment.view', 'attachment.preview',
    'review_task.view', 'review_task.approve', 'review_task.reject', 'operation_log.view'
)
where r.role_code = 'reviewer'
on conflict (role_id, permission_id) do update set effect = 'allow', status = 'active', updated_at = now();

insert into app_role_permission (role_id, permission_id, effect, status, created_at, updated_at)
select r.id, p.id, 'allow', 'active', now(), now()
from app_role r
join app_permission p on p.permission_code in (
    'clan.view', 'branch.view', 'person.view', 'relationship.view', 'source.view',
    'attachment.view', 'attachment.preview'
)
where r.role_code = 'viewer'
on conflict (role_id, permission_id) do update set effect = 'allow', status = 'active', updated_at = now();

insert into app_role_permission (role_id, permission_id, effect, status, created_at, updated_at)
select r.id, p.id, 'allow', 'active', now(), now()
from app_role r
join app_permission p on p.permission_code in ('operation_log.view', 'operation_log.export')
where r.role_code = 'auditor'
on conflict (role_id, permission_id) do update set effect = 'allow', status = 'active', updated_at = now();

update clan_member cm
set scope_type = 'clan', scope_id = cm.clan_id, updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code in ('cross_clan_admin', 'clan_admin', 'reviewer', 'viewer')
  and (cm.scope_type is null or cm.scope_type <> 'clan' or cm.scope_id is distinct from cm.clan_id);

update clan_member cm
set scope_type = 'branch_subtree', scope_id = coalesce(cm.scope_id, cm.branch_id), updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code = 'branch_admin'
  and coalesce(cm.scope_id, cm.branch_id) is not null;

update clan_member cm
set scope_type = 'branch', scope_id = coalesce(cm.scope_id, cm.branch_id), updated_at = now()
from app_role r
where cm.role_id = r.id
  and r.role_code = 'editor'
  and coalesce(cm.scope_id, cm.branch_id) is not null
  and cm.scope_type not in ('branch', 'branch_subtree');

update branch set branch_path = id::text, updated_at = now()
where (branch_path is null or branch_path = '') and parent_id is null;

with recursive branch_tree as (
    select id, parent_id, branch_path::text as branch_path
    from branch
    where parent_id is null and branch_path is not null and branch_path <> ''
    union all
    select child.id, child.parent_id, branch_tree.branch_path || '/' || child.id::text
    from branch child
    join branch_tree on child.parent_id = branch_tree.id
    where child.branch_path is null or child.branch_path = ''
)
update branch b
set branch_path = branch_tree.branch_path, updated_at = now()
from branch_tree
where b.id = branch_tree.id and (b.branch_path is null or b.branch_path = '');

insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
select c.id, null, 'permission_seed_update', 'clan', c.id,
       '权限模型初始化数据已升级',
       'Seeded final dot-style resource.action permissions and rebuilt built-in role grants.',
       'flyway-auth-readiness-permission-rebuild-' || c.id,
       '127.0.0.1', now()
from clan c
where not exists (
    select 1 from operation_log l
    where l.clan_id = c.id and l.request_id = 'flyway-auth-readiness-permission-rebuild-' || c.id
);
