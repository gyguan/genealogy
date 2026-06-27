-- Optional MVP demo data seed.
-- This script is NOT under db/migration and will not be executed automatically by Flyway.
-- Run manually for local demo after Flyway migrations have completed.
-- Demo account: demo_admin / Demo@123456

insert into app_user(username, phone, email, password_hash, display_name, status, created_at, updated_at)
values (
    'demo_admin',
    '13800000000',
    'demo_admin@example.com',
    'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8hIQ==$Wr6lQoXoTqMAv1sPuNLzq6rFoIfYEpMwSpo50kTd06o=',
    '演示管理员',
    'active',
    now(),
    now()
)
on conflict (username) do update set
    display_name = excluded.display_name,
    status = excluded.status,
    updated_at = now();

insert into clan(clan_code, clan_name, surname, hall_name, origin_place, description, status, created_by, created_at, updated_at)
select 'DEMO-ZHANG', '演示张氏宗族', '张', '百忍堂', '湖南长沙', 'MVP 演示宗族', 'draft', u.id, now(), now()
from app_user u
where u.username = 'demo_admin'
on conflict (clan_code) do update set
    clan_name = excluded.clan_name,
    surname = excluded.surname,
    updated_at = now();

insert into branch(clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
select c.id, null, '长沙支派', '1', 1, 1, '江西吉安', '湖南长沙', 'MVP 演示支派', 'active', now(), now()
from clan c
where c.clan_code = 'DEMO-ZHANG'
  and not exists (select 1 from branch b where b.clan_id = c.id and b.branch_name = '长沙支派');

insert into clan_member(clan_id, user_id, branch_id, role_id, member_name, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
select c.id, u.id, null, r.id, '演示管理员', 'active', 'clan', c.id, now(), now(), now()
from clan c
join app_user u on u.username = 'demo_admin'
join app_role r on r.role_code = 'clan_admin'
where c.clan_code = 'DEMO-ZHANG'
on conflict (clan_id, user_id) do update set
    role_id = excluded.role_id,
    member_status = 'active',
    scope_type = 'clan',
    scope_id = excluded.scope_id,
    updated_at = now();

insert into generation_scheme(clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
select c.id, null, '演示字辈方案', '德承家声远，仁义世泽长', 1, true, true, false, 'active', now()
from clan c
where c.clan_code = 'DEMO-ZHANG'
  and not exists (select 1 from generation_scheme s where s.clan_id = c.id and s.scheme_name = '演示字辈方案');

insert into generation_word(scheme_id, generation_no, word, description, sort_order)
select s.id, item.generation_no, item.word, item.description, item.generation_no
from generation_scheme s
join clan c on c.id = s.clan_id
cross join (values
    (1, '德', '第一代'),
    (2, '承', '第二代'),
    (3, '家', '第三代'),
    (4, '声', '第四代'),
    (5, '远', '第五代')
) as item(generation_no, word, description)
where c.clan_code = 'DEMO-ZHANG'
  and s.scheme_name = '演示字辈方案'
on conflict (scheme_id, generation_no) do update set
    word = excluded.word,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into person(clan_id, branch_id, person_code, name, gender, generation_no, generation_word, rank_in_family, birth_date, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_at)
select c.id, b.id, item.person_code, item.name, item.gender, item.generation_no, item.generation_word, item.rank_in_family, item.birth_date::date, item.is_living, item.birth_place, item.residence_place, item.occupation, item.biography, item.has_descendant, 'normal', 'clan_only', 'official', u.id, now(), now()
from clan c
join branch b on b.clan_id = c.id and b.branch_name = '长沙支派'
join app_user u on u.username = 'demo_admin'
cross join (values
    ('DEMO-P001', '张德明', 'male', 1, '德', '长子', '1945-01-01', false, '湖南长沙', '湖南长沙', '退休教师', '演示一世祖', true),
    ('DEMO-P002', '张承志', 'male', 2, '承', '长子', '1970-02-02', true, '湖南长沙', '湖南长沙', '工程师', '演示二世', true),
    ('DEMO-P003', '张家宁', 'female', 3, '家', '长女', '1995-03-03', true, '湖南长沙', '湖南长沙', '设计师', '演示三世', false)
) as item(person_code, name, gender, generation_no, generation_word, rank_in_family, birth_date, is_living, birth_place, residence_place, occupation, biography, has_descendant)
where c.clan_code = 'DEMO-ZHANG'
  and not exists (select 1 from person p where p.clan_id = c.id and p.person_code = item.person_code and p.deleted_at is null);

insert into relationship(clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
select c.id, parent.id, child.id, 'parent_child', 'father', true, true, true, '演示父子/父女关系', 'high', 'official', u.id, now(), now()
from clan c
join app_user u on u.username = 'demo_admin'
join person parent on parent.clan_id = c.id and parent.person_code in ('DEMO-P001', 'DEMO-P002')
join person child on child.clan_id = c.id and (
    (parent.person_code = 'DEMO-P001' and child.person_code = 'DEMO-P002') or
    (parent.person_code = 'DEMO-P002' and child.person_code = 'DEMO-P003')
)
where c.clan_code = 'DEMO-ZHANG'
  and not exists (
      select 1 from relationship r
      where r.clan_id = c.id and r.from_person_id = parent.id and r.to_person_id = child.id and r.relation_type = 'parent_child' and r.deleted_at is null
  );

insert into source(clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
select c.id, '演示族谱摘录', 'genealogy_book', '演示资料库', '张氏族谱', '卷一', '第1页', '德明公，长沙支派一世。', 'verified', 'MVP 演示资料来源', u.id, now()
from clan c
join app_user u on u.username = 'demo_admin'
where c.clan_code = 'DEMO-ZHANG'
  and not exists (select 1 from source s where s.clan_id = c.id and s.source_name = '演示族谱摘录');

insert into source_binding(clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
select c.id, s.id, 'person', p.id, '演示来源绑定', s.excerpt, u.id, now()
from clan c
join app_user u on u.username = 'demo_admin'
join source s on s.clan_id = c.id and s.source_name = '演示族谱摘录'
join person p on p.clan_id = c.id and p.person_code = 'DEMO-P001'
where c.clan_code = 'DEMO-ZHANG'
  and not exists (select 1 from source_binding b where b.source_id = s.id and b.target_type = 'person' and b.target_id = p.id);
