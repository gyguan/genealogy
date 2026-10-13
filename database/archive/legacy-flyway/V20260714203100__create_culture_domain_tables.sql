-- Purpose: 建立宗族文化资料、迁徙事件和文化场所三类领域对象的持久化基础。
-- Issue/PR: #166 / PR #174
-- Risk: medium
-- Lock impact: 仅创建新表、约束和索引；不会改写或扫描 clan、branch、person 等历史业务表。
-- Data volume: 新表初始为空，本迁移不执行历史数据回填。
-- Compatibility: 旧 clan.hall_name/commandery/origin_place 与 branch.migration_from/migration_to 保持只读兼容，不建立双写。
-- Rollback/Compensation: 无业务数据时可执行 database/rollback/20260714_issue-166_drop_culture_domain_tables.sql；有数据后使用更高版本前向补偿。
-- Verification: 检查三张表、约束、索引及默认值，并执行 Hibernate schema validate 与 PostgreSQL 启动检查。

create table culture_item (
    id bigserial,
    clan_id bigint not null,
    branch_id bigint,
    category varchar(40) not null,
    title varchar(200) not null,
    summary varchar(1000),
    content text,
    historical_period varchar(200),
    location_text varchar(500),
    confidence_level varchar(20) not null default 'unknown',
    privacy_level varchar(32) not null default 'clan_only',
    sensitive_level varchar(32) not null default 'normal',
    data_status varchar(32) not null default 'draft',
    is_featured_on_home boolean not null default false,
    sort_order integer not null default 0,
    created_by bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    version bigint not null default 0,
    constraint pk_culture_item primary key (id),
    constraint fk_culture_item__clan foreign key (clan_id) references clan(id),
    constraint fk_culture_item__branch foreign key (branch_id) references branch(id),
    constraint fk_culture_item__created_by foreign key (created_by) references app_user(id),
    constraint ck_culture_item__category check (category in (
        'surname_origin',
        'hall_name',
        'commandery',
        'family_instruction',
        'ancestor_instruction',
        'clan_rule',
        'genealogy_preface',
        'genealogy_rule',
        'person_story',
        'custom_tradition',
        'other'
    )),
    constraint ck_culture_item__confidence check (confidence_level in ('high', 'medium', 'low', 'unknown')),
    constraint ck_culture_item__privacy check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed')),
    constraint ck_culture_item__sensitive check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive')),
    constraint ck_culture_item__status check (data_status in ('draft', 'pending_review', 'official', 'rejected', 'archived')),
    constraint ck_culture_item__title_not_blank check (length(btrim(title)) > 0),
    constraint ck_culture_item__sort_order check (sort_order >= 0)
);

create table migration_event (
    id bigserial,
    clan_id bigint not null,
    branch_id bigint not null,
    sequence_no integer not null,
    from_location varchar(500),
    to_location varchar(500),
    migration_time_text varchar(200),
    founder_person_id bigint,
    reason varchar(1000),
    description text,
    confidence_level varchar(20) not null default 'unknown',
    privacy_level varchar(32) not null default 'clan_only',
    sensitive_level varchar(32) not null default 'normal',
    data_status varchar(32) not null default 'draft',
    created_by bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    version bigint not null default 0,
    constraint pk_migration_event primary key (id),
    constraint fk_migration_event__clan foreign key (clan_id) references clan(id),
    constraint fk_migration_event__branch foreign key (branch_id) references branch(id),
    constraint fk_migration_event__founder foreign key (founder_person_id) references person(id),
    constraint fk_migration_event__created_by foreign key (created_by) references app_user(id),
    constraint ck_migration_event__sequence check (sequence_no > 0),
    constraint ck_migration_event__locations check (
        length(btrim(coalesce(from_location, ''))) > 0
        or length(btrim(coalesce(to_location, ''))) > 0
    ),
    constraint ck_migration_event__confidence check (confidence_level in ('high', 'medium', 'low', 'unknown')),
    constraint ck_migration_event__privacy check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed')),
    constraint ck_migration_event__sensitive check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive')),
    constraint ck_migration_event__status check (data_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'))
);

create table culture_site (
    id bigserial,
    clan_id bigint not null,
    branch_id bigint,
    site_type varchar(40) not null,
    site_name varchar(200) not null,
    address_text varchar(500),
    founded_period varchar(200),
    current_status varchar(100),
    summary varchar(1000),
    description text,
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    confidence_level varchar(20) not null default 'unknown',
    privacy_level varchar(32) not null default 'clan_only',
    sensitive_level varchar(32) not null default 'normal',
    data_status varchar(32) not null default 'draft',
    is_featured_on_home boolean not null default false,
    sort_order integer not null default 0,
    created_by bigint,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    version bigint not null default 0,
    constraint pk_culture_site primary key (id),
    constraint fk_culture_site__clan foreign key (clan_id) references clan(id),
    constraint fk_culture_site__branch foreign key (branch_id) references branch(id),
    constraint fk_culture_site__created_by foreign key (created_by) references app_user(id),
    constraint ck_culture_site__type check (site_type in ('ancestral_hall', 'ancestral_home', 'cemetery', 'memorial', 'other')),
    constraint ck_culture_site__name_not_blank check (length(btrim(site_name)) > 0),
    constraint ck_culture_site__latitude check (latitude is null or (latitude >= -90 and latitude <= 90)),
    constraint ck_culture_site__longitude check (longitude is null or (longitude >= -180 and longitude <= 180)),
    constraint ck_culture_site__confidence check (confidence_level in ('high', 'medium', 'low', 'unknown')),
    constraint ck_culture_site__privacy check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed')),
    constraint ck_culture_site__sensitive check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive')),
    constraint ck_culture_site__status check (data_status in ('draft', 'pending_review', 'official', 'rejected', 'archived')),
    constraint ck_culture_site__sort_order check (sort_order >= 0)
);

create index idx_culture_item__clan_status_updated
    on culture_item (clan_id, data_status, updated_at desc)
    where deleted_at is null;

create index idx_culture_item__clan_branch_category
    on culture_item (clan_id, branch_id, category)
    where deleted_at is null;

create index idx_culture_item__featured
    on culture_item (clan_id, sort_order, updated_at desc)
    where deleted_at is null and data_status = 'official' and is_featured_on_home = true;

create unique index uk_migration_event__branch_sequence
    on migration_event (clan_id, branch_id, sequence_no)
    where deleted_at is null;

create index idx_migration_event__clan_status_updated
    on migration_event (clan_id, data_status, updated_at desc)
    where deleted_at is null;

create index idx_migration_event__branch_sequence
    on migration_event (branch_id, sequence_no)
    where deleted_at is null;

create index idx_migration_event__founder
    on migration_event (founder_person_id)
    where deleted_at is null and founder_person_id is not null;

create index idx_culture_site__clan_status_updated
    on culture_site (clan_id, data_status, updated_at desc)
    where deleted_at is null;

create index idx_culture_site__clan_branch_type
    on culture_site (clan_id, branch_id, site_type)
    where deleted_at is null;

create index idx_culture_site__featured
    on culture_site (clan_id, sort_order, updated_at desc)
    where deleted_at is null and data_status = 'official' and is_featured_on_home = true;

comment on table culture_item is '宗族或支派级文本型文化档案';
comment on column culture_item.content is '文化正文，列表接口默认不返回';
comment on column culture_item.is_featured_on_home is '首页精选候选标识，正式展示仍需状态、权限和隐私过滤';
comment on table migration_event is '支派结构化迁徙事件，按 sequence_no 表达顺序';
comment on column migration_event.migration_time_text is '朝代、年号或模糊年代等历史时期文本';
comment on table culture_site is '祠堂、祖居、墓园和纪念设施等文化场所';
comment on column culture_site.current_status is '场所现实状态，不等同于资料审核 data_status';
comment on column culture_site.latitude is '可选纬度；接口必须按隐私级别最小披露';
comment on column culture_site.longitude is '可选经度；接口必须按隐私级别最小披露';
