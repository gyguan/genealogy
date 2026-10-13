-- Purpose: 建设文化场所运行时管理所需的关联人物、隐私约束、权限和查询索引。
-- Issue/PR: #171 / PR #223
-- Risk: medium
-- Lock impact: culture_site 新增可空列、约束和索引；权限表幂等写入。
-- Data volume: 不迁移宗族简介或静态祠堂占位数据，不复制 source_attachment。
-- Compatibility: 已有 culture_site 行保持可读；related_person_id 默认为空。
-- Rollback/Compensation: 仅开发环境可使用 database/rollback/20260715_issue-171_remove_culture_site_management.sql。
-- Verification: PostgreSQL/Flyway、Hibernate validate、权限/隐私/审核和附件聚合测试。

alter table culture_site
    add column if not exists related_person_id bigint;

alter table culture_site
    drop constraint if exists fk_culture_site__related_person;

alter table culture_site
    add constraint fk_culture_site__related_person
        foreign key (related_person_id) references person(id);

alter table culture_site
    drop constraint if exists ck_culture_site__coordinate_pair;

alter table culture_site
    add constraint ck_culture_site__coordinate_pair
        check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null));

create index if not exists idx_culture_site__clan_branch_status_type
    on culture_site (clan_id, branch_id, data_status, site_type, sort_order, id)
    where deleted_at is null;

create index if not exists idx_culture_site__clan_location_period
    on culture_site (clan_id, address_text, founded_period, current_status)
    where deleted_at is null;

create index if not exists idx_culture_site__related_person
    on culture_site (related_person_id)
    where deleted_at is null and related_person_id is not null;

create index if not exists idx_revision__culture_site_history
    on revision (clan_id, target_type, target_id, submit_time desc)
    where target_type = 'culture_site';

insert into app_permission(permission_code, permission_name, module_code, action_code, description, created_at, updated_at)
values
    ('culture_site.view', '查看文化场所', 'culture', 'site_view', '查看授权范围内的祠堂与文化场所', now(), now()),
    ('culture_site.create', '新增文化场所', 'culture', 'site_create', '新增文化场所草稿', now(), now()),
    ('culture_site.update', '维护文化场所', 'culture', 'site_update', '维护草稿或提交正式场所变更', now(), now()),
    ('culture_site.delete', '删除文化场所', 'culture', 'site_delete', '删除草稿或提交正式场所删除申请', now(), now()),
    ('culture_site.submit_review', '提交场所审核', 'culture', 'site_submit_review', '提交文化场所审核', now(), now()),
    ('culture_site.archive', '归档文化场所', 'culture', 'site_archive', '归档草稿或提交正式场所归档申请', now(), now()),
    ('culture_site.feature', '管理场所精选', 'culture', 'site_feature', '通过审核变更文化场所首页精选状态', now(), now()),
    ('culture_site.view_sensitive', '查看敏感场所', 'culture', 'site_view_sensitive', '查看私有或封存地址、坐标、来源摘录和影像', now(), now())
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
        'culture_site.view', 'culture_site.create', 'culture_site.update', 'culture_site.delete',
        'culture_site.submit_review', 'culture_site.archive', 'culture_site.feature', 'culture_site.view_sensitive'
    ))
    or (r.role_code = 'editor' and p.permission_code in (
        'culture_site.view', 'culture_site.create', 'culture_site.update', 'culture_site.delete', 'culture_site.submit_review'
    ))
    or (r.role_code = 'reviewer' and p.permission_code in ('culture_site.view', 'culture_site.view_sensitive'))
    or (r.role_code = 'viewer' and p.permission_code = 'culture_site.view')
)
where p.permission_code like 'culture_site.%'
on conflict (role_id, permission_id) do nothing;
