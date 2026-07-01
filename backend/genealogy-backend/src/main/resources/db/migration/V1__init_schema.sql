-- Clean Genealogy MVP1 schema.
-- This script is intended for a fresh database. Seed data lives in V2__init_data.sql.

create table if not exists app_user (
    id bigserial primary key,
    username varchar(100) not null unique,
    phone varchar(50),
    email varchar(100),
    password_hash varchar(255) not null,
    display_name varchar(100) not null,
    avatar_url varchar(500),
    status varchar(32) not null default 'active',
    last_login_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp
);

create table if not exists app_role (
    id bigserial primary key,
    role_code varchar(64) not null unique,
    role_name varchar(100) not null,
    description text,
    system_role boolean not null default true,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists app_auth_session (
    id bigserial primary key,
    user_id bigint not null references app_user(id),
    token_hash varchar(255) not null,
    issued_at timestamp not null,
    expires_at timestamp not null,
    revoked_at timestamp,
    client_ip varchar(64),
    user_agent varchar(500)
);

create table if not exists clan (
    id bigserial primary key,
    clan_code varchar(64) not null unique,
    clan_name varchar(200) not null,
    surname varchar(50) not null,
    hall_name varchar(100),
    commandery varchar(100),
    ancestor_person_id bigint,
    origin_place varchar(255),
    current_places jsonb,
    description text,
    status varchar(32) not null default 'draft',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists branch (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    parent_id bigint references branch(id),
    branch_name varchar(200) not null,
    branch_path varchar(500),
    level int not null default 1,
    sort_order int not null default 0,
    founder_person_id bigint,
    migration_from varchar(255),
    migration_to varchar(255),
    manager_member_id bigint,
    description text,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists person (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    person_code varchar(64),
    name varchar(100) not null,
    genealogy_name varchar(100),
    courtesy_name varchar(100),
    alias_name varchar(200),
    gender varchar(20) not null default 'unknown',
    generation_no int,
    generation_word varchar(20),
    rank_in_family varchar(50),
    birth_date date,
    birth_date_precision varchar(20),
    death_date date,
    death_date_precision varchar(20),
    is_living boolean,
    birth_place varchar(255),
    residence_place varchar(255),
    occupation varchar(100),
    education varchar(100),
    title_or_honor varchar(200),
    biography text,
    tomb_place varchar(255),
    epitaph text,
    has_descendant boolean,
    lineage_status varchar(50) not null default 'normal',
    privacy_level varchar(32) not null default 'clan_only',
    data_status varchar(32) not null default 'draft',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_by bigint references app_user(id),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    unique (clan_id, person_code)
);

alter table clan add constraint fk_clan_ancestor_person foreign key (ancestor_person_id) references person(id);
alter table branch add constraint fk_branch_founder_person foreign key (founder_person_id) references person(id);

create table if not exists clan_member (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    user_id bigint not null references app_user(id),
    person_id bigint references person(id),
    branch_id bigint references branch(id),
    role_id bigint not null references app_role(id),
    member_name varchar(100),
    join_status varchar(32) not null default 'invited',
    invited_by bigint references app_user(id),
    member_status varchar(32) not null default 'active',
    scope_type varchar(32) not null default 'clan',
    scope_id bigint,
    joined_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (clan_id, user_id, role_id, scope_type, scope_id)
);

alter table branch add constraint fk_branch_manager_member foreign key (manager_member_id) references clan_member(id);

create table if not exists relationship (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    from_person_id bigint not null references person(id),
    to_person_id bigint not null references person(id),
    relation_type varchar(50) not null,
    relation_label varchar(100),
    is_lineage_relation boolean not null default false,
    is_biological boolean not null default false,
    is_primary boolean not null default true,
    description text,
    confidence_level varchar(32) not null default 'medium',
    data_status varchar(32) not null default 'draft',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp,
    constraint chk_relationship_not_self check (from_person_id <> to_person_id)
);

create table if not exists generation_scheme (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    scheme_name varchar(200) not null,
    poem_text text,
    start_generation int,
    is_default boolean not null default false,
    validation_enabled boolean not null default true,
    strict_mode boolean not null default false,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now()
);

create table if not exists generation_word (
    id bigserial primary key,
    scheme_id bigint not null references generation_scheme(id),
    generation_no int not null,
    word varchar(20) not null,
    description varchar(255),
    sort_order int not null default 0,
    unique (scheme_id, generation_no)
);

create table if not exists source (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_name varchar(200) not null,
    source_type varchar(50) not null,
    provider_name varchar(100),
    book_title varchar(200),
    volume_no varchar(100),
    page_no varchar(100),
    excerpt text,
    verification_status varchar(32) not null default 'unverified',
    description text,
    created_by bigint references app_user(id),
    created_at timestamp not null default now()
);

create table if not exists source_binding (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    source_id bigint not null references source(id),
    target_type varchar(50) not null,
    target_id bigint not null,
    binding_reason varchar(255),
    excerpt text,
    created_by bigint references app_user(id),
    created_at timestamp not null default now()
);

create table if not exists source_attachment (
    id bigserial primary key,
    source_id bigint not null references source(id),
    clan_id bigint not null references clan(id),
    original_filename varchar(255) not null,
    stored_filename varchar(255) not null,
    content_type varchar(120),
    file_size bigint not null default 0,
    storage_path varchar(1000) not null,
    checksum varchar(128),
    upload_status varchar(32) not null default 'uploaded',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    deleted_at timestamp
);

create table if not exists person_event (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    person_id bigint not null references person(id),
    event_type varchar(50) not null,
    event_title varchar(200) not null,
    event_date date,
    event_date_precision varchar(20) not null default 'day',
    event_place varchar(255),
    event_description text,
    source_type varchar(50),
    source_id bigint,
    sort_order int not null default 0,
    data_status varchar(32) not null default 'official',
    created_by bigint references app_user(id),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    deleted_at timestamp
);

create table if not exists revision (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    target_type varchar(50) not null,
    target_id bigint not null,
    change_type varchar(32) not null,
    before_data jsonb,
    after_data jsonb,
    diff_summary text,
    submitter_id bigint references app_user(id),
    submit_time timestamp not null default now(),
    status varchar(32) not null default 'draft',
    approved_at timestamp,
    rejected_reason text
);

create table if not exists review_task (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    revision_id bigint not null references revision(id),
    review_level int not null default 1,
    reviewer_id bigint references app_user(id),
    reviewer_role varchar(50),
    branch_id bigint references branch(id),
    status varchar(32) not null default 'pending',
    review_comment text,
    reviewed_at timestamp,
    created_at timestamp not null default now()
);

create table if not exists import_job (
    id bigserial primary key,
    clan_id bigint not null references clan(id),
    branch_id bigint references branch(id),
    import_type varchar(50) not null default 'person_csv',
    original_filename varchar(255),
    total_count int not null default 0,
    success_count int not null default 0,
    failure_count int not null default 0,
    status varchar(32) not null default 'completed',
    error_summary text,
    created_by bigint references app_user(id),
    created_at timestamp not null default now()
);

create table if not exists import_job_error (
    id bigserial primary key,
    job_id bigint not null references import_job(id),
    row_no int,
    error_message text,
    raw_data text,
    created_at timestamp not null default now()
);

create table if not exists operation_log (
    id bigserial primary key,
    clan_id bigint references clan(id),
    actor_id bigint references app_user(id),
    action_type varchar(100) not null,
    target_type varchar(50),
    target_id bigint,
    summary varchar(500),
    detail text,
    request_id varchar(100),
    client_ip varchar(64),
    created_at timestamp not null default now()
);

create index if not exists idx_app_user_username on app_user(username);
create index if not exists idx_app_auth_session_user on app_auth_session(user_id);
create index if not exists idx_app_role_code on app_role(role_code);
create index if not exists idx_branch_clan on branch(clan_id);
create index if not exists idx_branch_parent on branch(parent_id);
create index if not exists idx_person_clan on person(clan_id);
create index if not exists idx_person_branch on person(branch_id);
create index if not exists idx_person_status on person(clan_id, data_status);
create index if not exists idx_relationship_from on relationship(from_person_id);
create index if not exists idx_relationship_to on relationship(to_person_id);
create index if not exists idx_relationship_clan on relationship(clan_id);
create index if not exists idx_generation_scheme_clan on generation_scheme(clan_id);
create index if not exists idx_generation_word_scheme on generation_word(scheme_id);
create index if not exists idx_source_clan on source(clan_id);
create index if not exists idx_source_binding_target on source_binding(target_type, target_id);
create index if not exists idx_source_attachment_source on source_attachment(source_id);
create index if not exists idx_person_event_person on person_event(person_id, event_date);
create index if not exists idx_revision_clan_status on revision(clan_id, status);
create index if not exists idx_review_task_reviewer_status on review_task(reviewer_id, status);
create index if not exists idx_import_job_clan on import_job(clan_id);
create index if not exists idx_operation_log_clan_created on operation_log(clan_id, created_at desc);

-- Table and column descriptions for PostgreSQL metadata.
comment on table app_user is '用户账号表，支持登录认证、展示身份和账号状态管理';
comment on column app_user.id is '用户主键ID';
comment on column app_user.username is '登录用户名，全局唯一';
comment on column app_user.phone is '手机号';
comment on column app_user.email is '邮箱';
comment on column app_user.password_hash is '密码哈希';
comment on column app_user.display_name is '用户展示名称';
comment on column app_user.avatar_url is '头像URL';
comment on column app_user.status is '账号状态，例如active、disabled';
comment on column app_user.last_login_at is '最近登录时间';
comment on column app_user.created_at is '创建时间';
comment on column app_user.updated_at is '更新时间';
comment on column app_user.deleted_at is '软删除时间，空表示未删除';

comment on table app_role is '系统角色表，记录宗族管理员、支派管理员、编辑、审核员、查看者等角色';
comment on column app_role.id is '系统角色主键ID';
comment on column app_role.role_code is '角色编码，全局唯一';
comment on column app_role.role_name is '角色名称';
comment on column app_role.description is '角色描述';
comment on column app_role.system_role is '是否系统内置角色';
comment on column app_role.created_at is '创建时间';
comment on column app_role.updated_at is '更新时间';

comment on table app_auth_session is '认证会话表，记录登录令牌、过期和撤销状态';
comment on column app_auth_session.id is '会话主键ID';
comment on column app_auth_session.user_id is '用户ID';
comment on column app_auth_session.token_hash is '令牌哈希';
comment on column app_auth_session.issued_at is '签发时间';
comment on column app_auth_session.expires_at is '过期时间';
comment on column app_auth_session.revoked_at is '撤销时间，空表示未撤销';
comment on column app_auth_session.client_ip is '客户端IP';
comment on column app_auth_session.user_agent is '客户端User-Agent';

comment on table clan is '宗族主表，记录一个姓氏宗族空间的基础资料、源流信息和状态';
comment on column clan.id is '宗族主键ID';
comment on column clan.clan_code is '宗族编码，用于系统内唯一识别宗族';
comment on column clan.clan_name is '宗族名称，例如淮阳张氏宗族';
comment on column clan.surname is '姓氏';
comment on column clan.hall_name is '堂号';
comment on column clan.commandery is '郡望';
comment on column clan.ancestor_person_id is '始祖或中心祖人物ID';
comment on column clan.origin_place is '祖籍或发源地';
comment on column clan.current_places is '当前主要分布地，JSON数组';
comment on column clan.description is '宗族简介、家训家风、源流说明等';
comment on column clan.status is '宗族状态，例如draft、active、archived';
comment on column clan.created_by is '创建人用户ID';
comment on column clan.created_at is '创建时间';
comment on column clan.updated_at is '更新时间';

comment on table branch is '支派表，记录宗族下的房支、迁徙和管理范围';
comment on column branch.id is '支派主键ID';
comment on column branch.clan_id is '所属宗族ID';
comment on column branch.parent_id is '父级支派ID，顶级支派为空';
comment on column branch.branch_name is '支派名称';
comment on column branch.branch_path is '支派层级路径，用于快速判断上下级关系';
comment on column branch.level is '支派层级，顶级为1';
comment on column branch.sort_order is '排序号';
comment on column branch.founder_person_id is '本支派始迁祖或开派人物ID';
comment on column branch.migration_from is '迁出地';
comment on column branch.migration_to is '迁入地';
comment on column branch.manager_member_id is '支派负责人对应的宗族成员ID';
comment on column branch.description is '支派简介、迁徙故事和范围说明';
comment on column branch.status is '支派状态，例如active、inactive';
comment on column branch.created_at is '创建时间';
comment on column branch.updated_at is '更新时间';

comment on table person is '人物档案表，记录族谱成员的身份、世次、生卒、履历、隐私和入谱状态';
comment on column person.id is '人物主键ID';
comment on column person.clan_id is '所属宗族ID';
comment on column person.branch_id is '所属支派ID';
comment on column person.person_code is '人物编码，用于导入导出和外部识别';
comment on column person.name is '常用姓名';
comment on column person.genealogy_name is '谱名或族谱记载姓名';
comment on column person.courtesy_name is '字、号等称谓';
comment on column person.alias_name is '别名、曾用名、乳名等';
comment on column person.gender is '性别，例如male、female、unknown';
comment on column person.generation_no is '世次或代数';
comment on column person.generation_word is '字辈用字';
comment on column person.rank_in_family is '排行或房内序位';
comment on column person.birth_date is '出生日期';
comment on column person.birth_date_precision is '出生日期精度，例如day、month、year、unknown';
comment on column person.death_date is '逝世日期';
comment on column person.death_date_precision is '逝世日期精度，例如day、month、year、unknown';
comment on column person.is_living is '是否在世';
comment on column person.birth_place is '出生地';
comment on column person.residence_place is '居住地或主要活动地';
comment on column person.occupation is '职业';
comment on column person.education is '教育经历或最高学历';
comment on column person.title_or_honor is '职衔、功名、荣誉或族内称号';
comment on column person.biography is '人物传记、履历和补充说明';
comment on column person.tomb_place is '墓葬地';
comment on column person.epitaph is '墓志铭或碑文摘要';
comment on column person.has_descendant is '是否有后裔';
comment on column person.lineage_status is '世系状态，例如normal、adopted、out_adopted、unknown';
comment on column person.privacy_level is '隐私级别，例如public、clan_only、branch_only、private';
comment on column person.data_status is '资料状态，例如draft、pending、official、rejected';
comment on column person.created_by is '创建人用户ID';
comment on column person.created_at is '创建时间';
comment on column person.updated_by is '最近更新人用户ID';
comment on column person.updated_at is '更新时间';
comment on column person.deleted_at is '软删除时间，空表示未删除';

comment on table clan_member is '宗族成员表，记录用户加入宗族、绑定人物、角色授权范围和成员状态';
comment on column clan_member.id is '宗族成员主键ID';
comment on column clan_member.clan_id is '所属宗族ID';
comment on column clan_member.user_id is '关联用户ID';
comment on column clan_member.person_id is '关联族谱人物ID';
comment on column clan_member.branch_id is '所属或管理支派ID';
comment on column clan_member.role_id is '角色ID';
comment on column clan_member.member_name is '成员显示名称';
comment on column clan_member.join_status is '加入状态，例如invited、joined、rejected';
comment on column clan_member.invited_by is '邀请人用户ID';
comment on column clan_member.member_status is '成员状态，例如active、inactive、removed';
comment on column clan_member.scope_type is '授权范围类型，例如clan、branch';
comment on column clan_member.scope_id is '授权范围对象ID';
comment on column clan_member.joined_at is '加入时间';
comment on column clan_member.created_at is '创建时间';
comment on column clan_member.updated_at is '更新时间';

comment on table relationship is '人物关系表，记录亲子、配偶、继嗣、出嗣等中国式族谱关系';
comment on column relationship.id is '关系主键ID';
comment on column relationship.clan_id is '所属宗族ID';
comment on column relationship.from_person_id is '关系发起方人物ID';
comment on column relationship.to_person_id is '关系指向方人物ID';
comment on column relationship.relation_type is '关系类型，例如parent_child、spouse、adoptive、successor';
comment on column relationship.relation_label is '关系标签，例如father、mother、spouse、heir_successor';
comment on column relationship.is_lineage_relation is '是否计入主世系';
comment on column relationship.is_biological is '是否血缘关系';
comment on column relationship.is_primary is '是否主关系';
comment on column relationship.description is '关系说明和证据摘要';
comment on column relationship.confidence_level is '可信度，例如low、medium、high';
comment on column relationship.data_status is '资料状态，例如draft、pending、official、rejected';
comment on column relationship.created_by is '创建人用户ID';
comment on column relationship.created_at is '创建时间';
comment on column relationship.updated_at is '更新时间';
comment on column relationship.deleted_at is '软删除时间，空表示未删除';

comment on table generation_scheme is '字辈方案表，记录宗族或支派使用的字辈诗和校验规则';
comment on column generation_scheme.id is '字辈方案主键ID';
comment on column generation_scheme.clan_id is '所属宗族ID';
comment on column generation_scheme.branch_id is '适用支派ID，空表示宗族通用';
comment on column generation_scheme.scheme_name is '字辈方案名称';
comment on column generation_scheme.poem_text is '字辈诗全文';
comment on column generation_scheme.start_generation is '字辈起始世次';
comment on column generation_scheme.is_default is '是否默认方案';
comment on column generation_scheme.validation_enabled is '是否启用字辈校验';
comment on column generation_scheme.strict_mode is '是否严格校验字辈';
comment on column generation_scheme.status is '方案状态';
comment on column generation_scheme.created_at is '创建时间';

comment on table generation_word is '字辈明细表，记录每一代对应的字辈用字';
comment on column generation_word.id is '字辈明细主键ID';
comment on column generation_word.scheme_id is '所属字辈方案ID';
comment on column generation_word.generation_no is '世次或代数';
comment on column generation_word.word is '该世次对应的字辈字';
comment on column generation_word.description is '字辈说明';
comment on column generation_word.sort_order is '排序号';

comment on table "source" is '来源资料表，记录族谱原文、地方志、口述访谈、图片等证据来源';
comment on column "source".id is '来源主键ID';
comment on column "source".clan_id is '所属宗族ID';
comment on column "source".source_name is '来源名称';
comment on column "source".source_type is '来源类型，例如genealogy_book、local_chronicle、oral_record、photo';
comment on column "source".provider_name is '提供人或提供机构';
comment on column "source".book_title is '书名、资料集名称或档案标题';
comment on column "source".volume_no is '卷册号';
comment on column "source".page_no is '页码或位置编号';
comment on column "source".excerpt is '原文摘录';
comment on column "source".verification_status is '复核状态，例如unverified、verified、rejected';
comment on column "source".description is '来源说明';
comment on column "source".created_by is '创建人用户ID';
comment on column "source".created_at is '创建时间';

comment on table source_binding is '来源绑定表，记录来源资料与人物、关系、支派、字辈等对象的证据关系';
comment on column source_binding.id is '绑定主键ID';
comment on column source_binding.clan_id is '所属宗族ID';
comment on column source_binding.source_id is '来源资料ID';
comment on column source_binding.target_type is '绑定对象类型，例如person、relationship、branch、clan、generation_word';
comment on column source_binding.target_id is '绑定对象ID';
comment on column source_binding.binding_reason is '绑定原因';
comment on column source_binding.excerpt is '与该对象相关的来源摘录';
comment on column source_binding.created_by is '创建人用户ID';
comment on column source_binding.created_at is '创建时间';

comment on table source_attachment is '来源附件表，记录来源资料关联的上传文件元数据';
comment on column source_attachment.id is '来源附件主键ID';
comment on column source_attachment.source_id is '来源资料ID';
comment on column source_attachment.clan_id is '所属宗族ID';
comment on column source_attachment.original_filename is '原始文件名';
comment on column source_attachment.stored_filename is '存储文件名';
comment on column source_attachment.content_type is '文件MIME类型';
comment on column source_attachment.file_size is '文件大小，单位字节';
comment on column source_attachment.storage_path is '文件存储路径';
comment on column source_attachment.checksum is '文件校验和';
comment on column source_attachment.upload_status is '上传状态，例如uploaded、metadata_only、failed';
comment on column source_attachment.created_by is '上传人用户ID';
comment on column source_attachment.created_at is '上传记录创建时间';
comment on column source_attachment.deleted_at is '软删除时间，空表示未删除';

comment on table person_event is '人物事件表，记录出生、婚配、子女出生、迁徙、逝世等时间线事件';
comment on column person_event.id is '人物事件主键ID';
comment on column person_event.clan_id is '所属宗族ID';
comment on column person_event.person_id is '人物ID';
comment on column person_event.event_type is '事件类型，例如birth、marriage、child_birth、death';
comment on column person_event.event_title is '事件标题';
comment on column person_event.event_date is '事件日期';
comment on column person_event.event_date_precision is '事件日期精度，例如day、month、year、unknown';
comment on column person_event.event_place is '事件地点';
comment on column person_event.event_description is '事件描述';
comment on column person_event.source_type is '事件来源类型，例如source、relationship、manual';
comment on column person_event.source_id is '事件来源对象ID';
comment on column person_event.sort_order is '排序号';
comment on column person_event.data_status is '资料状态';
comment on column person_event.created_by is '创建人用户ID';
comment on column person_event.created_at is '创建时间';
comment on column person_event.updated_at is '更新时间';
comment on column person_event.deleted_at is '软删除时间，空表示未删除';

comment on table revision is '修订记录表，记录待审核变更的前后数据和Diff摘要';
comment on column revision.id is '修订主键ID';
comment on column revision.clan_id is '所属宗族ID';
comment on column revision.target_type is '变更对象类型';
comment on column revision.target_id is '变更对象ID';
comment on column revision.change_type is '变更类型，例如created、modified、deleted';
comment on column revision.before_data is '变更前数据快照，JSON格式';
comment on column revision.after_data is '变更后数据快照，JSON格式';
comment on column revision.diff_summary is '差异摘要';
comment on column revision.submitter_id is '提交人用户ID';
comment on column revision.submit_time is '提交时间';
comment on column revision.status is '修订状态，例如draft、pending、approved、rejected';
comment on column revision.approved_at is '审核通过时间';
comment on column revision.rejected_reason is '驳回原因';

comment on table review_task is '审核任务表，记录修订记录的审核层级、审核人、状态和意见';
comment on column review_task.id is '审核任务主键ID';
comment on column review_task.clan_id is '所属宗族ID';
comment on column review_task.revision_id is '关联修订记录ID';
comment on column review_task.review_level is '审核层级';
comment on column review_task.reviewer_id is '审核人用户ID';
comment on column review_task.reviewer_role is '审核角色';
comment on column review_task.branch_id is '审核关联支派ID';
comment on column review_task.status is '审核状态，例如pending、approved、rejected';
comment on column review_task.review_comment is '审核意见';
comment on column review_task.reviewed_at is '审核处理时间';
comment on column review_task.created_at is '任务创建时间';

comment on table import_job is '导入任务表，记录人物或关系导入批次、统计和执行状态';
comment on column import_job.id is '导入任务主键ID';
comment on column import_job.clan_id is '所属宗族ID';
comment on column import_job.branch_id is '导入目标支派ID';
comment on column import_job.import_type is '导入类型，例如person_csv、relationship_csv';
comment on column import_job.original_filename is '原始导入文件名';
comment on column import_job.total_count is '总记录数';
comment on column import_job.success_count is '成功记录数';
comment on column import_job.failure_count is '失败记录数';
comment on column import_job.status is '导入状态，例如previewed、completed、failed';
comment on column import_job.error_summary is '错误摘要';
comment on column import_job.created_by is '创建人用户ID';
comment on column import_job.created_at is '创建时间';

comment on table import_job_error is '导入错误明细表，记录导入任务中每行失败原因和原始数据';
comment on column import_job_error.id is '导入错误主键ID';
comment on column import_job_error.job_id is '导入任务ID';
comment on column import_job_error.row_no is '错误行号';
comment on column import_job_error.error_message is '错误信息';
comment on column import_job_error.raw_data is '原始行数据';
comment on column import_job_error.created_at is '错误记录创建时间';

comment on table operation_log is '操作日志表，记录用户操作、审核动作、导入导出和审计追踪信息';
comment on column operation_log.id is '日志主键ID';
comment on column operation_log.clan_id is '所属宗族ID';
comment on column operation_log.actor_id is '操作者用户ID';
comment on column operation_log.action_type is '动作类型，例如person_create、review_approve、person_import';
comment on column operation_log.target_type is '操作对象类型';
comment on column operation_log.target_id is '操作对象ID';
comment on column operation_log.summary is '操作摘要';
comment on column operation_log.detail is '操作详情，通常为JSON或文本描述';
comment on column operation_log.request_id is '请求ID，用于链路追踪';
comment on column operation_log.client_ip is '客户端IP';
comment on column operation_log.created_at is '操作时间';
