\set ON_ERROR_STOP on

\if :{?dataset_code}
\else
  \set dataset_code PERF
\endif
\if :{?perf_clans}
\else
  \set perf_clans 2
\endif
\if :{?persons_per_clan}
\else
  \set persons_per_clan 5000
\endif
\if :{?branches_per_clan}
\else
  \set branches_per_clan 30
\endif
\if :{?children_per_parent}
\else
  \set children_per_parent 3
\endif
\if :{?spouse_every}
\else
  \set spouse_every 5
\endif
\if :{?source_bind_every}
\else
  \set source_bind_every 100
\endif

begin;
select pg_advisory_xact_lock(hashtext('genealogy-current-performance-seed'));

create temporary table _perf_config on commit drop as
select upper(:'dataset_code')::varchar(20) as dataset_code,
       :perf_clans::int as clan_count,
       :persons_per_clan::int as persons_per_clan,
       :branches_per_clan::int as branches_per_clan,
       :children_per_parent::int as children_per_parent,
       :spouse_every::int as spouse_every,
       :source_bind_every::int as source_bind_every,
       (select id from app_user where username = 'demo_admin' and deleted_at is null) as admin_user_id,
       (select id from app_role where role_code = 'clan_admin') as clan_admin_role_id;

do $$
declare
    c record;
begin
    select * into c from _perf_config;
    if c.admin_user_id is null or c.clan_admin_role_id is null then
        raise exception 'demo_admin or clan_admin role is missing';
    end if;
    if c.clan_count < 1 or c.clan_count > 100 then
        raise exception 'perf_clans must be between 1 and 100';
    end if;
    if c.persons_per_clan < 10 or c.persons_per_clan > 1000000 then
        raise exception 'persons_per_clan must be between 10 and 1000000';
    end if;
    if c.branches_per_clan < 1 or c.branches_per_clan > 10000 then
        raise exception 'branches_per_clan must be between 1 and 10000';
    end if;
    if c.children_per_parent < 1 or c.children_per_parent > 20 then
        raise exception 'children_per_parent must be between 1 and 20';
    end if;
    if c.spouse_every < 2 or c.source_bind_every < 1 then
        raise exception 'spouse_every must be >= 2 and source_bind_every must be >= 1';
    end if;
    if exists (
        select 1 from clan
        where clan_code like c.dataset_code || '-C%'
    ) then
        raise exception 'dataset code % already exists; reset the database or use another dataset_code', c.dataset_code;
    end if;
end
$$;

create temporary table _perf_clan_source on commit drop as
select g as clan_seq,
       cfg.dataset_code || '-C' || lpad(g::text, 3, '0') as clan_code,
       cfg.dataset_code || '压测宗族' || lpad(g::text, 3, '0') as clan_name
from _perf_config cfg
cross join generate_series(1, (select clan_count from _perf_config)) g;

insert into clan (clan_code, clan_name, surname, hall_name, commandery, origin_place, current_places, description, status, created_by, created_at, updated_at)
select clan_code,
       clan_name,
       '测',
       '性能堂',
       '测试郡',
       '压测起点' || clan_seq,
       jsonb_build_array('压测地区' || clan_seq, '压测地区' || clan_seq || '-新区'),
       '由当前模型压测数据工厂生成，不包含真实个人信息。',
       'active',
       cfg.admin_user_id,
       now() - interval '365 days',
       now()
from _perf_clan_source s
cross join _perf_config cfg;

create temporary table _perf_clan_map on commit drop as
select c.id as clan_id, s.clan_seq, s.clan_code
from _perf_clan_source s
join clan c on c.clan_code = s.clan_code;

create temporary table _perf_branch_source on commit drop as
select cm.clan_id,
       cm.clan_seq,
       b as branch_seq,
       case when b = 1 then '总支' else '压测房' || lpad(b::text, 4, '0') end as branch_name
from _perf_clan_map cm
cross join generate_series(1, (select branches_per_clan from _perf_config)) b;

-- Insert one root per clan, then all other branches below that root.
insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
select clan_id, null, branch_name, '/总支', 1, 1,
       '压测起点' || clan_seq, '压测中心' || clan_seq,
       '压测宗族根支。', 'active', now() - interval '300 days', now()
from _perf_branch_source
where branch_seq = 1;

create temporary table _perf_root_branch on commit drop as
select cm.clan_id, b.id as branch_id
from _perf_clan_map cm
join branch b on b.clan_id = cm.clan_id and b.parent_id is null and b.branch_name = '总支';

insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
select s.clan_id,
       r.branch_id,
       s.branch_name,
       '/总支/' || s.branch_name,
       2,
       s.branch_seq,
       '压测中心' || s.clan_seq,
       '压测地区' || s.clan_seq || '-' || s.branch_seq,
       '压测子支，序号 ' || s.branch_seq,
       'active',
       now() - interval '250 days',
       now()
from _perf_branch_source s
join _perf_root_branch r on r.clan_id = s.clan_id
where s.branch_seq > 1;

create temporary table _perf_branch_map on commit drop as
select s.clan_id,
       s.branch_seq,
       b.id as branch_id
from _perf_branch_source s
join branch b
  on b.clan_id = s.clan_id
 and b.branch_name = s.branch_name;

create temporary table _perf_person_source on commit drop as
select cm.clan_id,
       cm.clan_seq,
       p as person_seq,
       ((p - 1) % cfg.branches_per_clan) + 1 as branch_seq,
       case
           when p = 1 then 1
           else 2 + floor(ln(p::numeric) / ln((cfg.children_per_parent + 1)::numeric))::int
       end as generation_no,
       cfg.dataset_code || '-C' || lpad(cm.clan_seq::text, 3, '0') || '-P' || lpad(p::text, 8, '0') as person_code
from _perf_clan_map cm
cross join _perf_config cfg
cross join generate_series(1, (select persons_per_clan from _perf_config)) p;

insert into person (
    clan_id, branch_id, person_code, name, genealogy_name, gender,
    generation_no, generation_word, rank_in_family,
    birth_date, birth_date_precision, death_date, death_date_precision, is_living,
    birth_place, residence_place, occupation, education, biography,
    has_descendant, lineage_status, privacy_level, data_status,
    created_by, created_at, updated_by, updated_at
)
select ps.clan_id,
       bm.branch_id,
       ps.person_code,
       '测' || lpad(ps.clan_seq::text, 3, '0') || '氏' || lpad(ps.person_seq::text, 8, '0'),
       '测' || lpad(ps.clan_seq::text, 3, '0') || '氏' || lpad(ps.person_seq::text, 8, '0'),
       case when ps.person_seq % 2 = 0 then 'female' else 'male' end,
       ps.generation_no,
       substr('天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏', ((ps.generation_no - 1) % 32) + 1, 1),
       '第' || ps.person_seq || '位',
       make_date(least(2005, 1870 + ps.generation_no * 24), ((ps.person_seq - 1) % 12) + 1, ((ps.person_seq - 1) % 27) + 1),
       'day',
       case when 1870 + ps.generation_no * 24 < 1945
            then make_date(least(2020, 1940 + ps.generation_no * 18), ((ps.person_seq + 2) % 12) + 1, ((ps.person_seq + 5) % 27) + 1)
            else null end,
       case when 1870 + ps.generation_no * 24 < 1945 then 'day' else 'unknown' end,
       (1870 + ps.generation_no * 24 >= 1945),
       '压测出生地' || ps.clan_seq,
       '压测地区' || ps.clan_seq || '-' || ps.branch_seq,
       case ps.person_seq % 6 when 0 then '教师' when 1 then '工程师' when 2 then '医生' when 3 then '商人' when 4 then '农艺师' else '学生' end,
       case when ps.generation_no <= 3 then '家学' else '本科' end,
       '合成压测人物，person_seq=' || ps.person_seq,
       ps.person_seq <= floor((select persons_per_clan from _perf_config)::numeric / (select children_per_parent from _perf_config)),
       'normal',
       case when ps.person_seq % 100 = 0 then 'private'
            when ps.person_seq % 10 = 0 then 'branch_only'
            else 'clan_only' end,
       'official',
       cfg.admin_user_id,
       now() - interval '200 days',
       cfg.admin_user_id,
       now()
from _perf_person_source ps
join _perf_branch_map bm on bm.clan_id = ps.clan_id and bm.branch_seq = ps.branch_seq
cross join _perf_config cfg;

create temporary table _perf_person_map on commit drop as
select ps.clan_id, ps.person_seq, ps.branch_seq, ps.generation_no, p.id as person_id
from _perf_person_source ps
join person p on p.clan_id = ps.clan_id and p.person_code = ps.person_code;

update clan c
set ancestor_person_id = pm.person_id,
    updated_at = now()
from _perf_person_map pm
where pm.clan_id = c.id and pm.person_seq = 1;

update branch b
set founder_person_id = x.person_id,
    updated_at = now()
from (
    select bm.branch_id, min(pm.person_id) as person_id
    from _perf_branch_map bm
    join _perf_person_map pm on pm.clan_id = bm.clan_id and pm.branch_seq = bm.branch_seq
    group by bm.branch_id
) x
where b.id = x.branch_id;

-- Bounded-width biological tree: every node except the root has one deterministic parent.
insert into relationship (
    clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category,
    is_lineage_relation, is_biological, is_primary, description,
    confidence_level, data_status, created_by, created_at, updated_at
)
select child.clan_id,
       parent.person_id,
       child.person_id,
       'parent_child',
       case when parent.person_seq % 2 = 0 then 'biological_mother' else 'biological_father' end,
       'blood', true, true, true,
       '压测亲子边 parent_seq=' || parent.person_seq || ', child_seq=' || child.person_seq,
       'high', 'official', cfg.admin_user_id, now() - interval '100 days', now()
from _perf_person_map child
join _perf_config cfg on true
join _perf_person_map parent
  on parent.clan_id = child.clan_id
 and parent.person_seq = floor((child.person_seq - 2)::numeric / cfg.children_per_parent)::int + 1
where child.person_seq > 1;

-- Deterministic spouse edges in both directions.
insert into relationship (
    clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category,
    is_lineage_relation, is_biological, is_primary, description,
    confidence_level, data_status, created_by, created_at, updated_at
)
select left_p.clan_id, left_p.person_id, right_p.person_id,
       'spouse', 'spouse', 'marriage', false, false, true,
       '压测配偶正向边。', 'medium', 'official', cfg.admin_user_id, now() - interval '80 days', now()
from _perf_person_map left_p
join _perf_config cfg on true
join _perf_person_map right_p
  on right_p.clan_id = left_p.clan_id
 and right_p.person_seq = left_p.person_seq + 1
where left_p.person_seq % cfg.spouse_every = 0
  and left_p.person_seq < cfg.persons_per_clan;

insert into relationship (
    clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category,
    is_lineage_relation, is_biological, is_primary, description,
    confidence_level, data_status, created_by, created_at, updated_at
)
select right_p.clan_id, right_p.person_id, left_p.person_id,
       'spouse', 'spouse', 'marriage', false, false, false,
       '压测配偶反向边。', 'medium', 'official', cfg.admin_user_id, now() - interval '80 days', now()
from _perf_person_map left_p
join _perf_config cfg on true
join _perf_person_map right_p
  on right_p.clan_id = left_p.clan_id
 and right_p.person_seq = left_p.person_seq + 1
where left_p.person_seq % cfg.spouse_every = 0
  and left_p.person_seq < cfg.persons_per_clan;

-- Sparse ritual edges create non-blood graph paths without dominating the dataset.
insert into relationship (
    clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category,
    ritual_relation_type, succession_reason, successor_branch_id,
    is_lineage_relation, is_biological, is_primary, description,
    confidence_level, data_status, created_by, created_at, updated_at
)
select child.clan_id,
       ritual_parent.person_id,
       child.person_id,
       'in_adoption', 'legal_father', 'ritual', 'in_adoption',
       '压测稀疏入继关系。', bm.branch_id,
       true, false, false, '每1000人构造一条入继边。',
       'medium', 'official', cfg.admin_user_id, now() - interval '60 days', now()
from _perf_person_map child
join _perf_config cfg on true
join _perf_person_map ritual_parent
  on ritual_parent.clan_id = child.clan_id
 and ritual_parent.person_seq = greatest(1, child.person_seq - 100)
join _perf_branch_map bm
  on bm.clan_id = child.clan_id
 and bm.branch_seq = child.branch_seq
where child.person_seq % 1000 = 0;

-- One birth event per person drives timeline and aggregate queries.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order,
    data_status, created_by, created_at, updated_at
)
select p.clan_id, p.id, 'birth', '出生', p.birth_date, 'day', p.birth_place,
       '压测出生事件。', 'generated', null, 10,
       'official', cfg.admin_user_id, now() - interval '50 days', now()
from person p
join _perf_clan_map cm on cm.clan_id = p.clan_id
cross join _perf_config cfg;

create temporary table _perf_source_map on commit drop as
with inserted as (
    insert into source (
        clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no,
        source_date, excerpt, verification_status, description,
        confidence_level, privacy_level, sensitive_level,
        created_by, created_at, updated_at
    )
    select cm.clan_id,
           cm.clan_code || '压测谱书',
           'genealogy_book', '压测生成器', cm.clan_code || '合成谱书', '卷一', '1-999999',
           '合成数据', '用于来源绑定和附件统计压测。', 'verified', '合成来源，不含真实资料。',
           'medium', 'clan_only', 'normal', cfg.admin_user_id, now() - interval '40 days', now()
    from _perf_clan_map cm
    cross join _perf_config cfg
    returning id, clan_id
)
select * from inserted;

insert into source_binding (
    clan_id, source_id, target_type, target_id, binding_reason, excerpt,
    confidence_level, binding_status, created_by, created_at, updated_at
)
select pm.clan_id, sm.id, 'person', pm.person_id,
       '压测抽样人物来源', '按固定间隔绑定人物。',
       'medium', 'active', cfg.admin_user_id, now() - interval '30 days', now()
from _perf_person_map pm
join _perf_source_map sm on sm.clan_id = pm.clan_id
cross join _perf_config cfg
where pm.person_seq % cfg.source_bind_every = 0;

insert into source_attachment (
    source_id, clan_id, original_filename, stored_filename, content_type,
    file_size, storage_path, checksum, upload_status,
    privacy_level, sensitive_level, created_by, created_at
)
select sm.id, sm.clan_id,
       'perf-source-' || sm.clan_id || '.pdf',
       'perf-source-' || sm.clan_id || '.pdf',
       'application/pdf', 1048576,
       'data/uploads/performance/perf-source-' || sm.clan_id || '.pdf',
       md5('perf-source-' || sm.clan_id), 'metadata_only',
       'clan_only', 'normal', cfg.admin_user_id, now() - interval '20 days'
from _perf_source_map sm
cross join _perf_config cfg;

-- Grant demo_admin clan-level access to every performance clan.
insert into clan_membership (
    clan_id, user_id, person_id, join_status, member_status, invited_by,
    joined_at, created_by, created_at, updated_by, updated_at
)
select cm.clan_id, cfg.admin_user_id, pm.person_id, 'joined', 'active', cfg.admin_user_id,
       now(), cfg.admin_user_id, now(), cfg.admin_user_id, now()
from _perf_clan_map cm
join _perf_person_map pm on pm.clan_id = cm.clan_id and pm.person_seq = 1
cross join _perf_config cfg;

insert into member_role (
    membership_id, role_id, scope_type, scope_id, status,
    granted_by, granted_at, created_by, created_at, updated_by, updated_at
)
select m.id, cfg.clan_admin_role_id, 'clan', m.clan_id, 'active',
       cfg.admin_user_id, now(), cfg.admin_user_id, now(), cfg.admin_user_id, now()
from clan_membership m
join _perf_clan_map cm on cm.clan_id = m.clan_id
cross join _perf_config cfg
where m.user_id = cfg.admin_user_id;

if to_regclass(current_schema() || '.culture_item') is not null then
    insert into culture_item (
        clan_id, branch_id, category, title, summary, content, historical_period, location_text,
        confidence_level, privacy_level, sensitive_level, data_status,
        featured_on_home, sort_order, created_by, created_at, updated_at, version
    )
    select bm.clan_id, bm.branch_id, 'other',
           '压测文化资料-' || bm.branch_seq,
           '按支派生成的文化资料。', '压测正文 ' || repeat('数据', 20),
           '当代', '压测地区-' || bm.branch_seq,
           'medium', 'clan_only', 'normal', 'official',
           bm.branch_seq = 1, bm.branch_seq, cfg.admin_user_id, now(), now(), 1
    from _perf_branch_map bm
    cross join _perf_config cfg;
end if;

if to_regclass(current_schema() || '.migration_event') is not null then
    insert into migration_event (
        clan_id, branch_id, sequence_no, from_location, to_location, migration_time_text,
        founder_person_id, reason, description, confidence_level,
        privacy_level, sensitive_level, data_status,
        created_by, created_at, updated_at, version
    )
    select bm.clan_id, bm.branch_id, bm.branch_seq,
           '压测起点-' || bm.branch_seq,
           '压测终点-' || bm.branch_seq,
           '第' || bm.branch_seq || '阶段',
           b.founder_person_id, '压测迁徙', '按支派生成迁徙事件。', 'medium',
           'clan_only', 'normal', 'official',
           cfg.admin_user_id, now(), now(), 1
    from _perf_branch_map bm
    join branch b on b.id = bm.branch_id
    cross join _perf_config cfg;
end if;

insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
select cm.clan_id, cfg.admin_user_id, 'performance_seed', 'clan', cm.clan_id,
       '生成当前模型压测数据',
       'persons=' || cfg.persons_per_clan || ', branches=' || cfg.branches_per_clan,
       'perf-seed-' || lower(cm.clan_code), '127.0.0.1', now()
from _perf_clan_map cm
cross join _perf_config cfg;

analyze clan;
analyze branch;
analyze person;
analyze relationship;
analyze person_event;
analyze source;
analyze source_binding;

commit;

\echo 'Performance data generated.'
select cfg.dataset_code,
       cfg.clan_count,
       cfg.persons_per_clan,
       cfg.clan_count * cfg.persons_per_clan as expected_persons,
       cfg.branches_per_clan,
       cfg.children_per_parent
from _perf_config cfg;
