\set ON_ERROR_STOP on

-- Deterministic acceptance data for the database model currently implemented on main.
-- Run 00_reset_business_data.sql first. This file is intentionally not a Flyway migration.

begin;
select pg_advisory_xact_lock(hashtext('genealogy-current-business-data-reset'));

-- Keep the project-provided PBKDF2 hashes so the standard demo accounts remain login-capable.
insert into app_user (
    username, phone, email, password_hash, display_name, avatar_url,
    status, last_login_at, created_at, updated_at, deleted_at
)
values
    ('demo_admin', '13800000001', 'demo_admin@genealogy.local', convert_from(decode('50424b44463224313230303030245a3256755a574673623264354c57466b62576c754d513d3d2444783251365378653746776471636a7275625435356f5276355431496444522f364f446970566e647050303d', 'hex'), 'UTF8'), '演示宗族管理员', null, 'active', now() - interval '1 day', now(), now(), null),
    ('demo_branch_admin', '13800000002', 'demo_branch_admin@genealogy.local', convert_from(decode('50424b44463224313230303030245a3256755a574673623264354c574a79595752744d513d3d243433316737735976752f39674548667068376c2f79754844356a6278417867566f356c7a4a6a4e7a6e6a593d', 'hex'), 'UTF8'), '演示支派管理员', null, 'active', now() - interval '2 days', now(), now(), null),
    ('demo_editor', '13800000003', 'demo_editor@genealogy.local', convert_from(decode('50424b44463224313230303030245a3256755a574673623264354c57566b6158527663673d3d247855396846735a786c5a4e46756933575044325763416c36386a794f5059594c375a5738384f634f47696b3d', 'hex'), 'UTF8'), '演示修谱编辑', null, 'active', now() - interval '3 days', now(), now(), null),
    ('demo_reviewer', '13800000004', 'demo_reviewer@genealogy.local', convert_from(decode('50424b44463224313230303030245a3256755a574673623264354c584a6c646d6c6c64773d3d2458306347774a4574477363443741687138794549634b442f507876427933646674715136385439715772733d', 'hex'), 'UTF8'), '演示审核员', null, 'active', now() - interval '4 days', now(), now(), null),
    ('demo_viewer', '13800000005', 'demo_viewer@genealogy.local', convert_from(decode('50424b44463224313230303030245a3256755a574673623264354c585a705a58646c63673d3d2471445a6a53466d76645537755046735151624d415252576d32443746383731683742386b427a7050495a593d', 'hex'), 'UTF8'), '演示只读成员', null, 'active', now() - interval '5 days', now(), now(), null)
on conflict (username) do update set
    phone = excluded.phone,
    email = excluded.email,
    password_hash = excluded.password_hash,
    display_name = excluded.display_name,
    status = 'active',
    updated_at = now(),
    deleted_at = null;

delete from app_auth_session
where user_id in (
    select id from app_user
    where username in ('demo_admin', 'demo_branch_admin', 'demo_editor', 'demo_reviewer', 'demo_viewer')
);

insert into app_auth_session (
    user_id, token_hash, issued_at, expires_at, revoked_at, client_ip, user_agent
)
select id,
       md5('current-scenario-session-' || username),
       now() - interval '30 minutes',
       now() + interval '12 hours',
       case when username = 'demo_viewer' then now() - interval '5 minutes' else null end,
       '127.0.0.1',
       'Current schema scenario seed'
from app_user
where username in ('demo_admin', 'demo_branch_admin', 'demo_editor', 'demo_reviewer', 'demo_viewer');

create temporary table seed_actor (
    actor_code text primary key,
    user_id bigint not null
) on commit drop;
insert into seed_actor(actor_code, user_id)
select replace(username, 'demo_', ''), id
from app_user
where username in ('demo_admin', 'demo_branch_admin', 'demo_editor', 'demo_reviewer', 'demo_viewer');

do $$
begin
    if (select count(*) from seed_actor) <> 5 then
        raise exception 'Required demo accounts are incomplete';
    end if;
    if exists (select 1 from clan where clan_code like 'SCENARIO-%') then
        raise exception 'Scenario data already exists; run 00_reset_business_data.sql first';
    end if;
end $$;

-- Two clans: one rich acceptance clan and one isolated clan for cross-clan tests.
create temporary table seed_clan (
    clan_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_clan(clan_code, id)
values
    ('SCENARIO-ZHANG-HUAIYANG', nextval(pg_get_serial_sequence('clan', 'id'))),
    ('SCENARIO-LI-LONGXI', nextval(pg_get_serial_sequence('clan', 'id')));

insert into clan (
    id, clan_code, clan_name, surname, hall_name, commandery, ancestor_person_id,
    origin_place, current_places, description, status, created_by, created_at, updated_at
)
select c.id,
       c.clan_code,
       case c.clan_code
           when 'SCENARIO-ZHANG-HUAIYANG' then '淮阳张氏全场景测试宗族'
           else '陇西李氏隔离测试宗族'
       end,
       case c.clan_code when 'SCENARIO-ZHANG-HUAIYANG' then '张' else '李' end,
       case c.clan_code when 'SCENARIO-ZHANG-HUAIYANG' then '百忍堂' else '敦本堂' end,
       case c.clan_code when 'SCENARIO-ZHANG-HUAIYANG' then '清河郡' else '陇西郡' end,
       null,
       case c.clan_code when 'SCENARIO-ZHANG-HUAIYANG' then '河南省周口市淮阳区' else '甘肃省定西市陇西县' end,
       case c.clan_code
           when 'SCENARIO-ZHANG-HUAIYANG' then '["河南省周口市淮阳区","安徽省合肥市","江苏省苏州市","浙江省嘉兴市"]'::jsonb
           else '["甘肃省定西市陇西县","陕西省西安市"]'::jsonb
       end,
       case c.clan_code
           when 'SCENARIO-ZHANG-HUAIYANG' then '覆盖当前已实现的支派、人物、关系、来源、审核、导入、文化、迁徙、权限和隐私场景。'
           else '用于跨宗族引用、同名人物和授权隔离测试。'
       end,
       'active',
       (select user_id from seed_actor where actor_code = 'admin'),
       now() - interval '365 days',
       now()
from seed_clan c;

-- Stable branch IDs allow all later inserts to be set-based and deterministic.
create temporary table seed_branch (
    branch_code text primary key,
    id bigint not null unique,
    clan_code text not null,
    parent_code text,
    branch_name text not null,
    level_no integer not null,
    sort_no integer not null,
    migration_from text,
    migration_to text,
    status text not null
) on commit drop;
insert into seed_branch(
    branch_code, id, clan_code, parent_code, branch_name,
    level_no, sort_no, migration_from, migration_to, status
)
values
    ('Z-ROOT', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', null, '始迁总支', 1, 10, '河南淮阳', '安徽合肥', 'active'),
    ('Z-LONG', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-ROOT', '长房', 2, 10, '安徽合肥', '江苏苏州', 'active'),
    ('Z-SECOND', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-ROOT', '二房', 2, 20, '安徽合肥', '浙江嘉兴', 'active'),
    ('Z-THIRD', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-ROOT', '三房', 2, 30, '安徽合肥', '上海松江', 'active'),
    ('Z-EAST', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-LONG', '长房东支', 3, 10, '江苏苏州', '江苏昆山', 'active'),
    ('Z-WEST', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-LONG', '长房西支', 3, 20, '江苏苏州', '江苏无锡', 'active'),
    ('Z-SUCCESSOR', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-SECOND', '继嗣房', 3, 10, '浙江嘉兴', '浙江海宁', 'inactive'),
    ('L-ROOT', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-LI-LONGXI', null, '陇西祖支', 1, 10, '甘肃陇西', '陕西西安', 'active'),
    ('L-NORTH', nextval(pg_get_serial_sequence('branch', 'id')), 'SCENARIO-LI-LONGXI', 'L-ROOT', '关中北支', 2, 10, '陕西西安', '陕西咸阳', 'active');

insert into branch (
    id, clan_id, parent_id, branch_name, branch_path, level, sort_order,
    founder_person_id, migration_from, migration_to, manager_member_id,
    description, status, created_at, updated_at
)
select b.id,
       c.id,
       parent.id,
       b.branch_name,
       '/' || replace(b.clan_code, 'SCENARIO-', '') || '/' || b.branch_code,
       b.level_no,
       b.sort_no,
       null,
       b.migration_from,
       b.migration_to,
       null,
       b.branch_name || '确定性测试数据。',
       b.status,
       now() - interval '300 days',
       now()
from seed_branch b
join seed_clan c on c.clan_code = b.clan_code
left join seed_branch parent on parent.branch_code = b.parent_code;

-- Person rows include living/deceased, exact/fuzzy/unknown dates, same-name people,
-- multiple privacy levels, a draft row and succession-related lineage states.
create temporary table seed_person (
    person_code text primary key,
    id bigint not null unique,
    clan_code text not null,
    branch_code text not null,
    person_name text not null,
    gender text not null,
    generation_no integer,
    generation_word text,
    birth_date date,
    birth_precision text,
    death_date date,
    death_precision text,
    is_living boolean,
    privacy_level text not null,
    data_status text not null,
    lineage_status text not null,
    alias_name text
) on commit drop;
insert into seed_person(
    person_code, id, clan_code, branch_code, person_name, gender,
    generation_no, generation_word, birth_date, birth_precision,
    death_date, death_precision, is_living, privacy_level,
    data_status, lineage_status, alias_name
)
values
    ('SCN-Z-0001', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-ROOT', '张明远', 'male', 1, '明', date '1840-03-12', 'day', date '1912-09-02', 'day', false, 'public', 'official', 'normal', '明远公'),
    ('SCN-Z-0002', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-ROOT', '王淑兰', 'female', 1, '明', date '1844-07-01', 'month', date '1918-01-01', 'year', false, 'clan_only', 'official', 'normal', '王氏'),
    ('SCN-Z-0101', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-LONG', '张承德', 'male', 2, '承', date '1868-01-01', 'year', date '1941-06-01', 'month', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-0102', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-LONG', '李静文', 'female', 2, '承', date '1872-04-01', 'month', date '1950-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-0201', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-SECOND', '张承礼', 'male', 2, '承', date '1871-01-01', 'year', date '1945-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-0202', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-SECOND', '陈慧芳', 'female', 2, '承', date '1875-01-01', 'year', date '1953-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-0301', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-THIRD', '张承信', 'male', 2, '承', date '1876-01-01', 'year', date '1950-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-1101', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-EAST', '张启文', 'male', 3, '启', date '1895-05-10', 'day', date '1974-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-1102', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-EAST', '刘雅兰', 'female', 3, '启', date '1898-01-01', 'year', date '1980-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-1201', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-WEST', '张启武', 'male', 3, '启', date '1900-01-01', 'year', date '1981-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-2101', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-SECOND', '张启安', 'male', 3, '启', date '1902-01-01', 'year', date '1988-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-2102', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-SUCCESSOR', '张启和', 'male', 3, '启', date '1904-01-01', 'year', date '1986-01-01', 'year', false, 'clan_only', 'official', 'adopted', '原名张启成'),
    ('SCN-Z-1111', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-EAST', '张俊杰', 'male', 4, '俊', date '1928-01-01', 'year', date '2001-01-01', 'year', false, 'clan_only', 'official', 'normal', null),
    ('SCN-Z-1211', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-WEST', '张俊杰', 'male', 4, '俊', date '1930-01-01', 'year', null, 'unknown', true, 'branch_only', 'official', 'normal', null),
    ('SCN-Z-3101', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-THIRD', '张俊宁', 'male', 4, '俊', date '1932-01-01', 'year', null, 'unknown', true, 'branch_only', 'official', 'adopted', '兼祧人'),
    ('SCN-Z-1112', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-EAST', '张泽宇', 'male', 5, '泽', date '1998-06-18', 'day', null, 'unknown', true, 'private', 'official', 'normal', null),
    ('SCN-Z-2201', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-SECOND', '张俊杰', 'male', 4, '俊', null, 'unknown', null, 'unknown', null, 'private', 'draft', 'unknown', '同名第三人'),
    ('SCN-Z-3201', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'Z-THIRD', '张俊清', 'male', 4, '俊', date '1935-01-01', 'year', date '2010-01-01', 'year', false, 'clan_only', 'official', 'normal', '无嗣人物'),
    ('SCN-L-0001', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-LI-LONGXI', 'L-ROOT', '李明远', 'male', 1, '明', date '1850-01-01', 'year', date '1925-01-01', 'year', false, 'public', 'official', 'normal', null),
    ('SCN-L-0101', nextval(pg_get_serial_sequence('person', 'id')), 'SCENARIO-LI-LONGXI', 'L-NORTH', '李承安', 'male', 2, '承', date '1880-01-01', 'year', date '1960-01-01', 'year', false, 'clan_only', 'official', 'normal', null);

insert into person (
    id, clan_id, branch_id, person_code, name, genealogy_name,
    courtesy_name, alias_name, gender, generation_no, generation_word,
    rank_in_family, birth_date, birth_date_precision, death_date,
    death_date_precision, is_living, birth_place, residence_place,
    occupation, education, title_or_honor, biography, tomb_place,
    epitaph, has_descendant, lineage_status, privacy_level, data_status,
    created_by, created_at, updated_by, updated_at, deleted_at
)
select p.id,
       c.id,
       b.id,
       p.person_code,
       p.person_name,
       p.person_name,
       case when p.gender = 'male' then '字' || coalesce(p.generation_word, '未详') || '修' else null end,
       p.alias_name,
       p.gender,
       p.generation_no,
       p.generation_word,
       '第' || coalesce(p.generation_no::text, '未知') || '代测试人物',
       p.birth_date,
       p.birth_precision,
       p.death_date,
       p.death_precision,
       p.is_living,
       case when p.clan_code = 'SCENARIO-ZHANG-HUAIYANG' then '虚构出生地' else '虚构陇西出生地' end,
       case when p.is_living is null then null else '虚构居住地' end,
       case when p.is_living = true then '现代职业' else '历史职业' end,
       case when p.generation_no is not null and p.generation_no >= 4 then '现代教育' else '家学' end,
       case when p.person_code in ('SCN-Z-0001', 'SCN-L-0001') then '始迁祖' else null end,
       p.person_name || '为全场景测试使用的虚构人物，不对应真实个人。',
       case when p.is_living = false then '虚构祖茔' else null end,
       case when p.is_living = false and p.generation_no = 1 then '虚构墓志摘要。' else null end,
       p.person_code not in ('SCN-Z-2201', 'SCN-Z-3201'),
       p.lineage_status,
       p.privacy_level,
       p.data_status,
       (select user_id from seed_actor where actor_code = case when p.clan_code = 'SCENARIO-ZHANG-HUAIYANG' then 'editor' else 'admin' end),
       now() - interval '250 days',
       (select user_id from seed_actor where actor_code = case when p.clan_code = 'SCENARIO-ZHANG-HUAIYANG' then 'editor' else 'admin' end),
       now(),
       null
from seed_person p
join seed_clan c on c.clan_code = p.clan_code
join seed_branch b on b.branch_code = p.branch_code;

update clan c
set ancestor_person_id = p.id,
    updated_at = now()
from seed_clan sc
join seed_person p on p.person_code = case sc.clan_code
    when 'SCENARIO-ZHANG-HUAIYANG' then 'SCN-Z-0001'
    else 'SCN-L-0001'
end
where c.id = sc.id;

update branch b
set founder_person_id = p.id,
    updated_at = now()
from seed_branch sb
join seed_person p on p.person_code = case sb.branch_code
    when 'Z-ROOT' then 'SCN-Z-0001'
    when 'Z-LONG' then 'SCN-Z-0101'
    when 'Z-SECOND' then 'SCN-Z-0201'
    when 'Z-THIRD' then 'SCN-Z-0301'
    when 'Z-EAST' then 'SCN-Z-1101'
    when 'Z-WEST' then 'SCN-Z-1201'
    when 'Z-SUCCESSOR' then 'SCN-Z-2102'
    when 'L-ROOT' then 'SCN-L-0001'
    when 'L-NORTH' then 'SCN-L-0101'
end
where b.id = sb.id;

-- Current relationship model: every supported type and all canonical categories.
create temporary table seed_relationship (
    relation_code text primary key,
    id bigint not null unique,
    clan_code text not null,
    from_code text not null,
    to_code text not null,
    relation_type text not null,
    relation_label text not null,
    relation_category text not null,
    ritual_relation_type text,
    successor_branch_code text,
    succession_reason text,
    is_lineage_relation boolean not null,
    is_biological boolean not null,
    is_primary boolean not null,
    data_status text not null
) on commit drop;
insert into seed_relationship(
    relation_code, id, clan_code, from_code, to_code, relation_type,
    relation_label, relation_category, ritual_relation_type,
    successor_branch_code, succession_reason, is_lineage_relation,
    is_biological, is_primary, data_status
)
values
    ('R-PARENT-1', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0001', 'SCN-Z-0101', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-2', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0001', 'SCN-Z-0201', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-3', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0001', 'SCN-Z-0301', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-4', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0101', 'SCN-Z-1101', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-5', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0101', 'SCN-Z-1201', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-6', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0201', 'SCN-Z-2101', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-7', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-1101', 'SCN-Z-1111', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-8', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-1201', 'SCN-Z-1211', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-9', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0301', 'SCN-Z-3101', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-10', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-1111', 'SCN-Z-1112', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-PARENT-LI', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-LI-LONGXI', 'SCN-L-0001', 'SCN-L-0101', 'parent_child', 'father', 'blood', null, null, null, true, true, true, 'official'),
    ('R-SPOUSE-1A', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0001', 'SCN-Z-0002', 'spouse', 'spouse', 'marriage', null, null, null, false, false, true, 'official'),
    ('R-SPOUSE-1B', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0002', 'SCN-Z-0001', 'spouse', 'spouse', 'marriage', null, null, null, false, false, false, 'official'),
    ('R-SPOUSE-2A', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0101', 'SCN-Z-0102', 'spouse', 'spouse', 'marriage', null, null, null, false, false, true, 'official'),
    ('R-SPOUSE-2B', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0102', 'SCN-Z-0101', 'spouse', 'spouse', 'marriage', null, null, null, false, false, false, 'official'),
    ('R-SPOUSE-3A', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0201', 'SCN-Z-0202', 'spouse', 'second_spouse', 'marriage', null, null, null, false, false, true, 'official'),
    ('R-SPOUSE-3B', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0202', 'SCN-Z-0201', 'spouse', 'second_spouse', 'marriage', null, null, null, false, false, false, 'official'),
    ('R-ADOPTIVE', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0201', 'SCN-Z-2102', 'adoptive', 'adoptive_father', 'ritual', 'adoptive', 'Z-SECOND', '家庭收养关系', false, false, true, 'official'),
    ('R-SUCCESSOR', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0201', 'SCN-Z-2102', 'successor', 'heir_successor', 'ritual', 'successor', 'Z-SECOND', '二房延续香火', true, false, true, 'official'),
    ('R-OUT', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0101', 'SCN-Z-2102', 'out_adoption', 'out_adopted', 'ritual', 'out_adoption', 'Z-SECOND', '由长房出嗣至二房', false, false, true, 'official'),
    ('R-IN', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-0201', 'SCN-Z-2102', 'in_adoption', 'in_adopted', 'ritual', 'in_adoption', 'Z-SECOND', '由长房入继二房', true, false, true, 'official'),
    ('R-DUAL', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-1201', 'SCN-Z-3101', 'dual_successor', 'dual_successor', 'ritual', 'dual_successor', 'Z-WEST', '兼承三房与长房西支', true, false, true, 'official'),
    ('R-HEIR', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-3201', 'SCN-Z-3101', 'heir_son', 'heir_son', 'ritual', 'heir_son', 'Z-THIRD', '无嗣立嗣', true, false, false, 'pending_review'),
    ('R-NO-DESC', nextval(pg_get_serial_sequence('relationship', 'id')), 'SCENARIO-ZHANG-HUAIYANG', 'SCN-Z-3201', 'SCN-Z-0301', 'no_descendant', 'no_descendant', 'status', 'no_descendant', null, '谱载无嗣', false, false, true, 'official');

insert into relationship (
    id, clan_id, from_person_id, to_person_id, relation_type, relation_label,
    relation_category, ritual_relation_type, succession_reason,
    successor_branch_id, is_lineage_relation, is_biological, is_primary,
    description, confidence_level, data_status, created_by, created_at,
    updated_at, deleted_at
)
select r.id,
       c.id,
       from_person.id,
       to_person.id,
       r.relation_type,
       r.relation_label,
       r.relation_category,
       r.ritual_relation_type,
       r.succession_reason,
       successor_branch.id,
       r.is_lineage_relation,
       r.is_biological,
       r.is_primary,
       '当前关系模型全场景测试。',
       case when r.data_status = 'pending_review' then 'medium' else 'high' end,
       r.data_status,
       (select user_id from seed_actor where actor_code = 'editor'),
       now() - interval '150 days',
       now(),
       null
from seed_relationship r
join seed_clan c on c.clan_code = r.clan_code
join seed_person from_person on from_person.person_code = r.from_code
join seed_person to_person on to_person.person_code = r.to_code
left join seed_branch successor_branch on successor_branch.branch_code = r.successor_branch_code;

-- Clan-level generation scheme plus branch-specific continuation.
create temporary table seed_scheme (
    scheme_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_scheme(scheme_code, id)
values
    ('Z-CLAN-SCHEME', nextval(pg_get_serial_sequence('generation_scheme', 'id'))),
    ('Z-EAST-SCHEME', nextval(pg_get_serial_sequence('generation_scheme', 'id')));

insert into generation_scheme (
    id, clan_id, branch_id, scheme_name, poem_text, start_generation,
    is_default, validation_enabled, strict_mode, status, created_at
)
values
    ((select id from seed_scheme where scheme_code = 'Z-CLAN-SCHEME'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     null, '宗族通用十代字辈', '明承启俊泽 仁义礼智信', 1, true, true, false, 'active', now() - interval '200 days'),
    ((select id from seed_scheme where scheme_code = 'Z-EAST-SCHEME'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-EAST'),
     '长房东支续派', '泽衍昌盛永', 5, true, true, true, 'active', now() - interval '100 days');

insert into generation_word(scheme_id, generation_no, word, description, sort_order)
select (select id from seed_scheme where scheme_code = 'Z-CLAN-SCHEME'),
       n::integer,
       word,
       '宗族通用字辈第' || n || '代',
       n::integer
from unnest(array['明','承','启','俊','泽','仁','义','礼','智','信']) with ordinality as t(word, n);
insert into generation_word(scheme_id, generation_no, word, description, sort_order)
select (select id from seed_scheme where scheme_code = 'Z-EAST-SCHEME'),
       (n + 4)::integer,
       word,
       '东支续派第' || (n + 4) || '代',
       n::integer
from unnest(array['泽','衍','昌','盛','永']) with ordinality as t(word, n);

-- Current source model uses official/pending_review statuses and oral_history type.
create temporary table seed_source (
    source_code text primary key,
    id bigint not null unique,
    source_name text not null,
    source_type text not null,
    verification_status text not null,
    confidence_level text not null,
    privacy_level text not null,
    sensitive_level text not null
) on commit drop;
insert into seed_source(
    source_code, id, source_name, source_type, verification_status,
    confidence_level, privacy_level, sensitive_level
)
values
    ('SRC-BOOK', nextval(pg_get_serial_sequence('source', 'id')), '《淮阳张氏宗谱》影印本', 'genealogy_book', 'official', 'high', 'clan_only', 'normal'),
    ('SRC-CHRONICLE', nextval(pg_get_serial_sequence('source', 'id')), '《嘉兴府志》迁徙条目', 'local_chronicle', 'official', 'medium', 'public', 'normal'),
    ('SRC-ORAL', nextval(pg_get_serial_sequence('source', 'id')), '长房口述访谈 2026-01', 'oral_history', 'pending_review', 'low', 'branch_only', 'normal'),
    ('SRC-TOMB', nextval(pg_get_serial_sequence('source', 'id')), '张明远墓碑拓片', 'tombstone', 'official', 'high', 'clan_only', 'sensitive'),
    ('SRC-PRIVATE', nextval(pg_get_serial_sequence('source', 'id')), '在世人员隐私材料底稿', 'archive', 'official', 'unknown', 'private', 'highly_sensitive');

insert into source (
    id, clan_id, source_name, source_type, provider_name, book_title,
    volume_no, page_no, source_date, excerpt, verification_status,
    description, confidence_level, privacy_level, sensitive_level,
    created_by, created_at, updated_at
)
select s.id,
       (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
       s.source_name,
       s.source_type,
       '虚构测试资料提供方',
       case when s.source_type in ('genealogy_book', 'local_chronicle') then s.source_name else null end,
       case when s.source_code = 'SRC-BOOK' then '卷一' else null end,
       case when s.source_code = 'SRC-BOOK' then '12-48' else null end,
       case s.source_code when 'SRC-BOOK' then '民国二十四年' when 'SRC-TOMB' then '1912' else '2026-01' end,
       '不含真实资料内容的测试摘录。',
       s.verification_status,
       '当前来源模型的状态、隐私和敏感等级测试。',
       s.confidence_level,
       s.privacy_level,
       s.sensitive_level,
       (select user_id from seed_actor where actor_code = case when s.source_code = 'SRC-ORAL' then 'editor' else 'admin' end),
       now() - interval '120 days',
       now()
from seed_source s;

insert into source_attachment (
    source_id, clan_id, original_filename, stored_filename, content_type,
    file_size, storage_path, checksum, upload_status, privacy_level,
    sensitive_level, created_by, created_at, deleted_at
)
values
    ((select id from seed_source where source_code = 'SRC-BOOK'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     '淮阳张氏宗谱_卷一_样例.pdf', 'scenario_zhang_book_v1.pdf',
     'application/pdf', 1048576, 'data/uploads/scenario/scenario_zhang_book_v1.pdf',
     md5('scenario-book'), 'metadata_only', 'clan_only', 'normal',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '100 days', null),
    ((select id from seed_source where source_code = 'SRC-PRIVATE'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     '隐私材料_样例.txt', 'scenario_private.txt', 'text/plain', 2048,
     'data/uploads/scenario/scenario_private.txt', md5('scenario-private'),
     'metadata_only', 'private', 'highly_sensitive',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '20 days', null);

insert into source_binding (
    clan_id, source_id, target_type, target_id, binding_reason, excerpt,
    confidence_level, binding_status, created_by, created_at, updated_at
)
values
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-BOOK'), 'person',
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     '谱书人物记载', '卷一载始迁祖姓名、生卒与迁徙。', 'high', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '90 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-BOOK'), 'relationship',
     (select id from seed_relationship where relation_code = 'R-PARENT-1'),
     '谱书父子记载', '卷一世系表。', 'high', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '90 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-CHRONICLE'), 'branch',
     (select id from seed_branch where branch_code = 'Z-SECOND'),
     '地方志迁徙旁证', '二房迁嘉兴条目。', 'medium', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '80 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-ORAL'), 'relationship',
     (select id from seed_relationship where relation_code = 'R-DUAL'),
     '兼祧口述资料', '访谈中说明兼承两房。', 'low', 'pending_review',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '30 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-TOMB'), 'person',
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     '墓碑生卒旁证', '拓片载卒年。', 'high', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '70 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-PRIVATE'), 'person',
     (select id from seed_person where person_code = 'SCN-Z-1112'),
     '在世人员隐私材料', '仅验证受限可见性。', 'unknown', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '10 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-BOOK'), 'generation_word',
     (select id from generation_word where scheme_id = (select id from seed_scheme where scheme_code = 'Z-CLAN-SCHEME') and generation_no = 1),
     '字辈来源', '谱首字派。', 'high', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '85 days', now());

-- Timeline covers exact/fuzzy dates, migration, death, succession and living-person privacy.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date,
    event_date_precision, event_place, event_description, source_type,
    source_id, sort_order, data_status, created_by, created_at,
    updated_at, deleted_at
)
values
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     'birth', '出生', date '1840-03-12', 'day', '河南淮阳', '始迁祖出生。',
     'source', (select id from seed_source where source_code = 'SRC-BOOK'), 10, 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '80 days', now(), null),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     'migration', '迁居合肥', date '1860-01-01', 'year', '安徽合肥', '由淮阳迁居合肥。',
     'source', (select id from seed_source where source_code = 'SRC-CHRONICLE'), 30, 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '75 days', now(), null),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     'death', '逝世', date '1912-09-02', 'day', '安徽合肥', '葬于虚构祖茔。',
     'source', (select id from seed_source where source_code = 'SRC-TOMB'), 90, 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '70 days', now(), null),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_person where person_code = 'SCN-Z-2102'),
     'adoption', '入继二房', date '1918-01-01', 'year', '浙江嘉兴', '由长房出嗣并入继二房。',
     'relationship', (select id from seed_relationship where relation_code = 'R-IN'), 50, 'official',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '60 days', now(), null),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_person where person_code = 'SCN-Z-3101'),
     'succession', '兼祧两房', date '1955-01-01', 'year', '上海松江', '兼承三房与长房西支。',
     'relationship', (select id from seed_relationship where relation_code = 'R-DUAL'), 55, 'official',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '50 days', now(), null),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_person where person_code = 'SCN-Z-1112'),
     'education', '大学毕业', date '2020-06-01', 'month', '上海', '在世人员脱敏事件。',
     'source', (select id from seed_source where source_code = 'SRC-PRIVATE'), 60, 'official',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '5 days', now(), null);

-- Current culture tables are already implemented on main, so seed them directly.
create temporary table seed_culture_item (
    item_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_culture_item(item_code, id)
values
    ('CUL-ORIGIN', nextval(pg_get_serial_sequence('culture_item', 'id'))),
    ('CUL-RULE', nextval(pg_get_serial_sequence('culture_item', 'id'))),
    ('CUL-PENDING', nextval(pg_get_serial_sequence('culture_item', 'id'))),
    ('CUL-REJECTED', nextval(pg_get_serial_sequence('culture_item', 'id')));

insert into culture_item (
    id, clan_id, branch_id, category, title, summary, content,
    historical_period, location_text, confidence_level, privacy_level,
    sensitive_level, data_status, featured_on_home, sort_order,
    created_by, created_at, updated_at, deleted_at, version
)
values
    ((select id from seed_culture_item where item_code = 'CUL-ORIGIN'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'), null,
     'surname_origin', '张氏得姓源流', '宗族首页展示的姓氏源流。', '虚构测试正文。',
     '先秦至明清', '河南淮阳', 'high', 'public', 'normal', 'official', true, 10,
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '100 days', now(), null, 0),
    ((select id from seed_culture_item where item_code = 'CUL-RULE'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-ROOT'),
     'clan_rule', '百忍堂家规十则', '宗族级家规。', '虚构测试内容。',
     '民国修订', '安徽合肥', 'medium', 'clan_only', 'normal', 'official', true, 20,
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '90 days', now(), null, 0),
    ((select id from seed_culture_item where item_code = 'CUL-PENDING'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-EAST'),
     'person_story', '张启文执教故事', '待审核文化资料。', '口述整理稿。',
     '二十世纪中叶', '江苏昆山', 'low', 'branch_only', 'normal', 'pending_review', false, 30,
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '20 days', now(), null, 0),
    ((select id from seed_culture_item where item_code = 'CUL-REJECTED'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-SECOND'),
     'custom_tradition', '二房祭祖习俗旧稿', '已驳回文化资料。', '缺少来源。',
     '不详', '浙江嘉兴', 'unknown', 'private', 'sensitive', 'rejected', false, 40,
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '15 days', now(), null, 1);

insert into source_binding (
    clan_id, source_id, target_type, target_id, binding_reason, excerpt,
    confidence_level, binding_status, created_by, created_at, updated_at
)
values
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-BOOK'), 'culture_item',
     (select id from seed_culture_item where item_code = 'CUL-ORIGIN'),
     '谱书序言来源', '谱序记载姓氏源流。', 'high', 'official',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '50 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-ORAL'), 'culture_item',
     (select id from seed_culture_item where item_code = 'CUL-PENDING'),
     '口述来源', '待审核访谈摘要。', 'low', 'pending_review',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '10 days', now());

create temporary table seed_migration_event (
    event_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_migration_event(event_code, id)
values
    ('MIG-OFFICIAL', nextval(pg_get_serial_sequence('migration_event', 'id'))),
    ('MIG-PENDING', nextval(pg_get_serial_sequence('migration_event', 'id')));

insert into migration_event (
    id, clan_id, branch_id, sequence_no, from_location, to_location,
    migration_time_text, founder_person_id, reason, description,
    confidence_level, privacy_level, sensitive_level, data_status,
    created_by, created_at, updated_at, deleted_at, version
)
values
    ((select id from seed_migration_event where event_code = 'MIG-OFFICIAL'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-ROOT'), 1,
     '河南省周口市淮阳区', '安徽省合肥市', '清咸丰十年（约1860年）',
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     '避乱与经商', '始迁祖携家迁居合肥。', 'medium', 'public', 'normal', 'official',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '80 days', now(), null, 0),
    ((select id from seed_migration_event where event_code = 'MIG-PENDING'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-SECOND'), 2,
     '安徽省合肥市', '浙江省嘉兴市', '清末民初',
     (select id from seed_person where person_code = 'SCN-Z-0201'),
     '经商定居', '等待地方志复核。', 'low', 'branch_only', 'normal', 'pending_review',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '25 days', now(), null, 0);

insert into source_binding (
    clan_id, source_id, target_type, target_id, binding_reason, excerpt,
    confidence_level, binding_status, created_by, created_at, updated_at
)
values
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-CHRONICLE'), 'migration_event',
     (select id from seed_migration_event where event_code = 'MIG-OFFICIAL'),
     '迁徙地点旁证', '地方志迁徙条目。', 'medium', 'official',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '40 days', now()),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-ORAL'), 'migration_event',
     (select id from seed_migration_event where event_code = 'MIG-PENDING'),
     '迁徙口述资料', '待审核访谈。', 'low', 'pending_review',
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '10 days', now());

create temporary table seed_culture_site (
    site_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_culture_site(site_code, id)
values
    ('SITE-HALL', nextval(pg_get_serial_sequence('culture_site', 'id'))),
    ('SITE-CEMETERY', nextval(pg_get_serial_sequence('culture_site', 'id')));

insert into culture_site (
    id, clan_id, branch_id, related_person_id, site_type, site_name,
    address_text, founded_period, current_status, summary, description,
    latitude, longitude, confidence_level, privacy_level, sensitive_level,
    data_status, featured_on_home, sort_order, created_by, created_at,
    updated_at, deleted_at, version
)
values
    ((select id from seed_culture_site where site_code = 'SITE-HALL'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-ROOT'),
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     'ancestral_hall', '百忍堂张氏宗祠', '安徽省合肥市虚构地址',
     '民国初年', '修缮开放', '宗族首页文化场所。', '虚构测试宗祠。',
     31.820000, 117.220000, 'high', 'public', 'normal', 'official', true, 10,
     (select user_id from seed_actor where actor_code = 'editor'), now() - interval '70 days', now(), null, 0),
    ((select id from seed_culture_site where site_code = 'SITE-CEMETERY'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-ROOT'),
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     'cemetery', '合肥张氏祖茔', '安徽省合肥市虚构祖茔',
     '清末', '受保护', '敏感文化场所。', '不含真实坐标。',
     31.810000, 117.210000, 'medium', 'private', 'highly_sensitive', 'official', false, 20,
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '65 days', now(), null, 0);

insert into source_binding (
    clan_id, source_id, target_type, target_id, binding_reason, excerpt,
    confidence_level, binding_status, created_by, created_at, updated_at
)
values
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_source where source_code = 'SRC-TOMB'), 'culture_site',
     (select id from seed_culture_site where site_code = 'SITE-CEMETERY'),
     '墓碑与祖茔关联', '墓碑拓片拍摄于虚构祖茔。', 'medium', 'official',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '35 days', now());

-- Approved, pending and rejected review chains with stable trace IDs.
create temporary table seed_revision (
    revision_code text primary key,
    id bigint not null unique,
    trace_id uuid not null,
    status text not null
) on commit drop;
insert into seed_revision(revision_code, id, trace_id, status)
values
    ('REV-APPROVED', nextval(pg_get_serial_sequence('revision', 'id')), '11111111-1111-1111-1111-111111111111', 'approved'),
    ('REV-PENDING', nextval(pg_get_serial_sequence('revision', 'id')), '22222222-2222-2222-2222-222222222222', 'pending'),
    ('REV-REJECTED', nextval(pg_get_serial_sequence('revision', 'id')), '33333333-3333-3333-3333-333333333333', 'rejected');

insert into revision (
    id, clan_id, trace_id, target_type, target_id, change_type,
    before_data, after_data, diff_summary, submitter_id, submit_time,
    status, approved_at, rejected_reason
)
values
    ((select id from seed_revision where revision_code = 'REV-APPROVED'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     '11111111-1111-1111-1111-111111111111', 'person',
     (select id from seed_person where person_code = 'SCN-Z-0001'), 'modified',
     jsonb_build_object('dataStatus', 'draft'), jsonb_build_object('dataStatus', 'official'),
     '始迁祖资料正式入谱。', (select user_id from seed_actor where actor_code = 'editor'),
     now() - interval '60 days', 'approved', now() - interval '59 days', null),
    ((select id from seed_revision where revision_code = 'REV-PENDING'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     '22222222-2222-2222-2222-222222222222', 'relationship',
     (select id from seed_relationship where relation_code = 'R-HEIR'), 'created',
     null, jsonb_build_object('relationType', 'heir_son'),
     '无嗣立嗣关系等待审核。', (select user_id from seed_actor where actor_code = 'editor'),
     now() - interval '5 days', 'pending', null, null),
    ((select id from seed_revision where revision_code = 'REV-REJECTED'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     '33333333-3333-3333-3333-333333333333', 'source',
     (select id from seed_source where source_code = 'SRC-ORAL'), 'modified',
     jsonb_build_object('verificationStatus', 'pending_review'), jsonb_build_object('verificationStatus', 'official'),
     '口述资料证据不足。', (select user_id from seed_actor where actor_code = 'editor'),
     now() - interval '10 days', 'rejected', null, '缺少受访人确认与原始录音。');

create temporary table seed_review_task (
    task_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_review_task(task_code, id)
values
    ('TASK-APPROVED', nextval(pg_get_serial_sequence('review_task', 'id'))),
    ('TASK-PENDING', nextval(pg_get_serial_sequence('review_task', 'id'))),
    ('TASK-REJECTED', nextval(pg_get_serial_sequence('review_task', 'id')));

insert into review_task (
    id, clan_id, revision_id, trace_id, review_level, reviewer_id,
    reviewer_role, branch_id, status, review_comment, reviewed_at, created_at
)
values
    ((select id from seed_review_task where task_code = 'TASK-APPROVED'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_revision where revision_code = 'REV-APPROVED'),
     '11111111-1111-1111-1111-111111111111', 1,
     (select user_id from seed_actor where actor_code = 'reviewer'), 'reviewer',
     (select id from seed_branch where branch_code = 'Z-ROOT'), 'approved',
     '谱书与墓碑证据一致。', now() - interval '59 days', now() - interval '60 days'),
    ((select id from seed_review_task where task_code = 'TASK-PENDING'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_revision where revision_code = 'REV-PENDING'),
     '22222222-2222-2222-2222-222222222222', 1,
     (select user_id from seed_actor where actor_code = 'reviewer'), 'reviewer',
     (select id from seed_branch where branch_code = 'Z-THIRD'), 'pending',
     '等待补充谱书页码。', null, now() - interval '5 days'),
    ((select id from seed_review_task where task_code = 'TASK-REJECTED'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_revision where revision_code = 'REV-REJECTED'),
     '33333333-3333-3333-3333-333333333333', 1,
     (select user_id from seed_actor where actor_code = 'reviewer'), 'reviewer',
     (select id from seed_branch where branch_code = 'Z-LONG'), 'rejected',
     '补齐原始材料后重新提交。', now() - interval '9 days', now() - interval '10 days');

-- Import lifecycle: synchronous success and asynchronous partial failure with row errors.
create temporary table seed_import_job (
    job_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_import_job(job_code, id)
values
    ('IMPORT-SUCCESS', nextval(pg_get_serial_sequence('import_job', 'id'))),
    ('IMPORT-PARTIAL', nextval(pg_get_serial_sequence('import_job', 'id')));

insert into import_job (
    id, clan_id, branch_id, import_type, file_format, original_filename,
    idempotency_key, total_count, success_count, failure_count, skipped_count,
    status, processing_status, review_status, review_round, error_summary,
    execution_mode, execution_status, execution_stage, cursor_row_no,
    processed_count, published_count, chunk_size, execution_retry_count,
    execution_max_retries, manual_intervention_required, created_by,
    created_at, updated_at, completed_at
)
values
    ((select id from seed_import_job where job_code = 'IMPORT-SUCCESS'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-EAST'),
     'person', 'csv', '东支人物成功导入.csv', 'scenario-person-success',
     20, 20, 0, 0, 'completed', 'ready_for_review', 'approved', 1, null,
     'sync', 'completed', 'completed', 20, 20, 20, 200, 0, 3, false,
     (select user_id from seed_actor where actor_code = 'editor'),
     now() - interval '12 days', now() - interval '12 days', now() - interval '12 days'),
    ((select id from seed_import_job where job_code = 'IMPORT-PARTIAL'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select id from seed_branch where branch_code = 'Z-SECOND'),
     'relationship', 'xlsx', '二房关系部分失败.xlsx', 'scenario-relation-partial',
     12, 9, 2, 1, 'partial_failed', 'correction_required', 'not_submitted', 0,
     '第5、8行人物编码或关系类型无效。', 'async', 'partial_failed', 'failed',
     12, 12, 9, 200, 1, 3, true,
     (select user_id from seed_actor where actor_code = 'editor'),
     now() - interval '3 days', now() - interval '2 days', now() - interval '2 days');

insert into import_job_error(job_id, row_no, error_message, raw_data, created_at)
values
    ((select id from seed_import_job where job_code = 'IMPORT-PARTIAL'), 5,
     '父人物编码不存在', 'SCN-Z-NOT-FOUND,SCN-Z-2101,parent_child', now() - interval '2 days'),
    ((select id from seed_import_job where job_code = 'IMPORT-PARTIAL'), 8,
     '关系类型不受支持', 'SCN-Z-0201,SCN-Z-2102,unknown_relation', now() - interval '2 days');

-- Current RBAC model: clan, branch and self scopes. No writes to legacy clan_member view.
create temporary table seed_membership (
    membership_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_membership(membership_code, id)
values
    ('MEM-Z-ADMIN', nextval(pg_get_serial_sequence('clan_membership', 'id'))),
    ('MEM-Z-BRANCH', nextval(pg_get_serial_sequence('clan_membership', 'id'))),
    ('MEM-Z-EDITOR', nextval(pg_get_serial_sequence('clan_membership', 'id'))),
    ('MEM-Z-REVIEWER', nextval(pg_get_serial_sequence('clan_membership', 'id'))),
    ('MEM-Z-VIEWER', nextval(pg_get_serial_sequence('clan_membership', 'id'))),
    ('MEM-L-ADMIN', nextval(pg_get_serial_sequence('clan_membership', 'id')));

insert into clan_membership (
    id, clan_id, user_id, person_id, join_status, member_status,
    invited_by, joined_at, created_by, created_at, updated_by, updated_at
)
values
    ((select id from seed_membership where membership_code = 'MEM-Z-ADMIN'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'admin'),
     (select id from seed_person where person_code = 'SCN-Z-0001'),
     'joined', 'active', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '100 days', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '100 days', (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_membership where membership_code = 'MEM-Z-BRANCH'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'branch_admin'),
     (select id from seed_person where person_code = 'SCN-Z-1211'),
     'joined', 'active', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '90 days', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '90 days', (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_membership where membership_code = 'MEM-Z-EDITOR'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'editor'),
     (select id from seed_person where person_code = 'SCN-Z-1111'),
     'joined', 'active', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '80 days', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '80 days', (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_membership where membership_code = 'MEM-Z-REVIEWER'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'reviewer'),
     (select id from seed_person where person_code = 'SCN-Z-3101'),
     'joined', 'active', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '70 days', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '70 days', (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_membership where membership_code = 'MEM-Z-VIEWER'),
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'viewer'),
     (select id from seed_person where person_code = 'SCN-Z-1112'),
     'joined', 'active', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '60 days', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '60 days', (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_membership where membership_code = 'MEM-L-ADMIN'),
     (select id from seed_clan where clan_code = 'SCENARIO-LI-LONGXI'),
     (select user_id from seed_actor where actor_code = 'admin'),
     (select id from seed_person where person_code = 'SCN-L-0001'),
     'joined', 'active', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '50 days', (select user_id from seed_actor where actor_code = 'admin'),
     now() - interval '50 days', (select user_id from seed_actor where actor_code = 'admin'), now());

create temporary table seed_member_role (
    role_code text primary key,
    id bigint not null unique
) on commit drop;
insert into seed_member_role(role_code, id)
values
    ('ROLE-Z-ADMIN', nextval(pg_get_serial_sequence('member_role', 'id'))),
    ('ROLE-Z-BRANCH', nextval(pg_get_serial_sequence('member_role', 'id'))),
    ('ROLE-Z-EDITOR', nextval(pg_get_serial_sequence('member_role', 'id'))),
    ('ROLE-Z-REVIEWER', nextval(pg_get_serial_sequence('member_role', 'id'))),
    ('ROLE-Z-VIEWER', nextval(pg_get_serial_sequence('member_role', 'id'))),
    ('ROLE-L-ADMIN', nextval(pg_get_serial_sequence('member_role', 'id')));

insert into member_role (
    id, membership_id, role_id, scope_type, scope_id, status,
    granted_by, granted_at, created_by, created_at, updated_by, updated_at
)
values
    ((select id from seed_member_role where role_code = 'ROLE-Z-ADMIN'),
     (select id from seed_membership where membership_code = 'MEM-Z-ADMIN'),
     (select id from app_role where role_code = 'clan_admin'), 'clan',
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'), 'active',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '100 days',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '100 days',
     (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_member_role where role_code = 'ROLE-Z-BRANCH'),
     (select id from seed_membership where membership_code = 'MEM-Z-BRANCH'),
     (select id from app_role where role_code = 'branch_admin'), 'branch',
     (select id from seed_branch where branch_code = 'Z-LONG'), 'active',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '90 days',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '90 days',
     (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_member_role where role_code = 'ROLE-Z-EDITOR'),
     (select id from seed_membership where membership_code = 'MEM-Z-EDITOR'),
     (select id from app_role where role_code = 'editor'), 'branch',
     (select id from seed_branch where branch_code = 'Z-EAST'), 'active',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '80 days',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '80 days',
     (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_member_role where role_code = 'ROLE-Z-REVIEWER'),
     (select id from seed_membership where membership_code = 'MEM-Z-REVIEWER'),
     (select id from app_role where role_code = 'reviewer'), 'clan',
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'), 'active',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '70 days',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '70 days',
     (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_member_role where role_code = 'ROLE-Z-VIEWER'),
     (select id from seed_membership where membership_code = 'MEM-Z-VIEWER'),
     (select id from app_role where role_code = 'viewer'), 'self',
     (select id from seed_person where person_code = 'SCN-Z-1112'), 'active',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '60 days',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '60 days',
     (select user_id from seed_actor where actor_code = 'admin'), now()),
    ((select id from seed_member_role where role_code = 'ROLE-L-ADMIN'),
     (select id from seed_membership where membership_code = 'MEM-L-ADMIN'),
     (select id from app_role where role_code = 'clan_admin'), 'clan',
     (select id from seed_clan where clan_code = 'SCENARIO-LI-LONGXI'), 'active',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '50 days',
     (select user_id from seed_actor where actor_code = 'admin'), now() - interval '50 days',
     (select user_id from seed_actor where actor_code = 'admin'), now());

update branch
set manager_member_id = (select id from seed_member_role where role_code = 'ROLE-Z-BRANCH'),
    updated_at = now()
where id in (
    select id from seed_branch where branch_code in ('Z-LONG', 'Z-EAST', 'Z-WEST')
);

-- Operational audit includes normal, rejected, partial-failure and high-risk denied events.
insert into operation_log (
    clan_id, actor_id, action_type, target_type, target_id, trace_id,
    revision_id, review_task_id, business_target_type, business_target_id,
    event_result, risk_level, risk_event_type, disposition_status,
    branch_id, summary, detail, request_id, client_ip, created_at
)
values
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'admin'), 'seed_current_scenarios',
     'clan', (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     null, null, null, 'clan',
     (select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     'success', 'low', null, 'closed', null,
     '创建当前模型全场景测试数据', '支派、人物、关系、来源、审核、导入、文化、迁徙与权限。',
     'scenario-seed-zhang', '127.0.0.1', now() - interval '1 day'),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'reviewer'), 'review_approve',
     'review_task', (select id from seed_review_task where task_code = 'TASK-APPROVED'),
     '11111111-1111-1111-1111-111111111111',
     (select id from seed_revision where revision_code = 'REV-APPROVED'),
     (select id from seed_review_task where task_code = 'TASK-APPROVED'),
     'person', (select id from seed_person where person_code = 'SCN-Z-0001'),
     'success', 'medium', 'formal_data_change', 'closed',
     (select id from seed_branch where branch_code = 'Z-ROOT'),
     '始迁祖资料审核通过', '证据完整。', 'scenario-review-approved', '127.0.0.1', now() - interval '59 days'),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'reviewer'), 'review_reject',
     'review_task', (select id from seed_review_task where task_code = 'TASK-REJECTED'),
     '33333333-3333-3333-3333-333333333333',
     (select id from seed_revision where revision_code = 'REV-REJECTED'),
     (select id from seed_review_task where task_code = 'TASK-REJECTED'),
     'source', (select id from seed_source where source_code = 'SRC-ORAL'),
     'rejected', 'medium', 'review_exception', 'closed',
     (select id from seed_branch where branch_code = 'Z-LONG'),
     '口述来源审核驳回', '缺少原始录音和签名。', 'scenario-review-rejected', '127.0.0.1', now() - interval '9 days'),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'viewer'), 'source_attachment_download_denied',
     'source_attachment', (select id from source_attachment where source_id = (select id from seed_source where source_code = 'SRC-PRIVATE') limit 1),
     null, null, null, 'source', (select id from seed_source where source_code = 'SRC-PRIVATE'),
     'denied', 'high', 'sensitive_attachment_access', 'open',
     (select id from seed_branch where branch_code = 'Z-EAST'),
     '受限附件下载被拒绝', null, 'scenario-risk-denied', '127.0.0.1', now() - interval '1 hour'),
    ((select id from seed_clan where clan_code = 'SCENARIO-ZHANG-HUAIYANG'),
     (select user_id from seed_actor where actor_code = 'editor'), 'import_partial_failed',
     'import_job', (select id from seed_import_job where job_code = 'IMPORT-PARTIAL'),
     null, null, null, 'import_job', (select id from seed_import_job where job_code = 'IMPORT-PARTIAL'),
     'partial_failed', 'medium', 'bulk_import_failure', 'investigating',
     (select id from seed_branch where branch_code = 'Z-SECOND'),
     '关系导入部分失败', '2行失败。', 'scenario-import-partial', '127.0.0.1', now() - interval '2 days');

commit;

\echo 'Current-schema acceptance scenarios created.'
