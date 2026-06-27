-- Optional demo data seed for local/MVP demonstration.
-- Usage after Flyway migration:
--   psql -h localhost -U genealogy -d genealogy -f backend/genealogy-backend/src/main/resources/db/seed/demo_data.sql
-- Demo account:
--   username: demo_admin
--   password: Genealogy@123

begin;

do $$
declare
    v_user_id bigint;
    v_clan_id bigint;
    v_admin_role_id bigint;
    v_branch_main_id bigint;
    v_branch_sub_id bigint;
    v_scheme_id bigint;
    v_p1 bigint;
    v_p2 bigint;
    v_p3 bigint;
    v_p4 bigint;
    v_source_id bigint;
begin
    insert into app_user(username, password_hash, display_name, status, created_at, updated_at)
    values (
        'demo_admin',
        'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8hIQ==$7AEmc1pivZ3tasKfQXaOwMIICvHilIX4z3MFg6QKW7A=',
        '演示管理员',
        'active',
        now(),
        now()
    )
    on conflict (username) do update set
        display_name = excluded.display_name,
        status = excluded.status,
        updated_at = now();

    select id into v_user_id from app_user where username = 'demo_admin';
    select id into v_admin_role_id from app_role where role_code = 'clan_admin';

    insert into clan(clan_code, clan_name, surname, hall_name, commandery, origin_place, description, status, created_by, created_at, updated_at)
    values ('DEMO-ZHANG', '长沙张氏示例宗族', '张', '百忍堂', '清河郡', '湖南长沙', 'MVP 演示宗族数据', 'active', v_user_id, now(), now())
    on conflict (clan_code) do update set
        clan_name = excluded.clan_name,
        surname = excluded.surname,
        hall_name = excluded.hall_name,
        commandery = excluded.commandery,
        origin_place = excluded.origin_place,
        description = excluded.description,
        status = excluded.status,
        updated_at = now();

    select id into v_clan_id from clan where clan_code = 'DEMO-ZHANG';

    insert into clan_member(clan_id, user_id, role_id, member_name, member_status, scope_type, joined_at, created_at, updated_at)
    select v_clan_id, v_user_id, v_admin_role_id, '演示管理员', 'active', 'clan', now(), now(), now()
    where not exists (select 1 from clan_member where clan_id = v_clan_id and user_id = v_user_id);

    insert into branch(clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_to, description, status, created_at, updated_at)
    select v_clan_id, null, '长沙本支', null, 1, 1, '湖南长沙', '演示主支派', 'active', now(), now()
    where not exists (select 1 from branch where clan_id = v_clan_id and branch_name = '长沙本支');

    select id into v_branch_main_id from branch where clan_id = v_clan_id and branch_name = '长沙本支';
    update branch set branch_path = cast(v_branch_main_id as varchar), updated_at = now() where id = v_branch_main_id;

    insert into branch(clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_to, description, status, created_at, updated_at)
    select v_clan_id, v_branch_main_id, '湘潭分支', null, 2, 2, '湖南湘潭', '演示分支派', 'active', now(), now()
    where not exists (select 1 from branch where clan_id = v_clan_id and branch_name = '湘潭分支');

    select id into v_branch_sub_id from branch where clan_id = v_clan_id and branch_name = '湘潭分支';
    update branch set branch_path = v_branch_main_id || '/' || v_branch_sub_id, updated_at = now() where id = v_branch_sub_id;

    insert into generation_scheme(clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
    select v_clan_id, null, '张氏示例字辈', '德承家声远，诗礼世泽长', 1, true, true, false, 'active', now()
    where not exists (select 1 from generation_scheme where clan_id = v_clan_id and scheme_name = '张氏示例字辈');

    select id into v_scheme_id from generation_scheme where clan_id = v_clan_id and scheme_name = '张氏示例字辈';

    insert into generation_word(scheme_id, generation_no, word, description, sort_order)
    select v_scheme_id, data.generation_no, data.word, data.description, data.generation_no
    from (values
        (1, '德', '一世字辈'),
        (2, '承', '二世字辈'),
        (3, '家', '三世字辈'),
        (4, '声', '四世字辈'),
        (5, '远', '五世字辈')
    ) as data(generation_no, word, description)
    on conflict (scheme_id, generation_no) do update set
        word = excluded.word,
        description = excluded.description,
        sort_order = excluded.sort_order;

    insert into person(clan_id, branch_id, person_code, name, gender, generation_no, generation_word, birth_date, is_living, birth_place, residence_place, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_branch_main_id, 'DEMO-P001', '张德明', 'male', 1, '德', date '1948-02-10', true, '湖南长沙', '湖南长沙', '演示一世人物', true, 'normal', 'clan_only', 'official', v_user_id, now(), now()
    where not exists (select 1 from person where clan_id = v_clan_id and person_code = 'DEMO-P001');

    insert into person(clan_id, branch_id, person_code, name, gender, generation_no, generation_word, birth_date, is_living, birth_place, residence_place, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_branch_main_id, 'DEMO-P002', '张承志', 'male', 2, '承', date '1975-05-08', true, '湖南长沙', '湖南长沙', '演示二世人物', true, 'normal', 'clan_only', 'official', v_user_id, now(), now()
    where not exists (select 1 from person where clan_id = v_clan_id and person_code = 'DEMO-P002');

    insert into person(clan_id, branch_id, person_code, name, gender, generation_no, generation_word, birth_date, is_living, birth_place, residence_place, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_branch_sub_id, 'DEMO-P003', '张家伟', 'male', 3, '家', date '2002-09-18', true, '湖南湘潭', '湖南湘潭', '演示三世人物', false, 'normal', 'clan_only', 'official', v_user_id, now(), now()
    where not exists (select 1 from person where clan_id = v_clan_id and person_code = 'DEMO-P003');

    insert into person(clan_id, branch_id, person_code, name, gender, birth_date, is_living, birth_place, residence_place, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_branch_main_id, 'DEMO-P004', '李淑芳', 'female', date '1978-03-12', true, '湖南长沙', '湖南长沙', '演示配偶人物', true, 'normal', 'clan_only', 'official', v_user_id, now(), now()
    where not exists (select 1 from person where clan_id = v_clan_id and person_code = 'DEMO-P004');

    select id into v_p1 from person where clan_id = v_clan_id and person_code = 'DEMO-P001';
    select id into v_p2 from person where clan_id = v_clan_id and person_code = 'DEMO-P002';
    select id into v_p3 from person where clan_id = v_clan_id and person_code = 'DEMO-P003';
    select id into v_p4 from person where clan_id = v_clan_id and person_code = 'DEMO-P004';

    insert into relationship(clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_p1, v_p2, 'parent_child', 'father', true, true, true, '父子关系', 'high', 'official', v_user_id, now(), now()
    where not exists (select 1 from relationship where clan_id = v_clan_id and from_person_id = v_p1 and to_person_id = v_p2 and relation_type = 'parent_child' and deleted_at is null);

    insert into relationship(clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_p2, v_p3, 'parent_child', 'father', true, true, true, '父子关系', 'high', 'official', v_user_id, now(), now()
    where not exists (select 1 from relationship where clan_id = v_clan_id and from_person_id = v_p2 and to_person_id = v_p3 and relation_type = 'parent_child' and deleted_at is null);

    insert into relationship(clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_p2, v_p4, 'spouse', 'spouse', false, false, true, '配偶关系', 'medium', 'official', v_user_id, now(), now()
    where not exists (select 1 from relationship where clan_id = v_clan_id and from_person_id = v_p2 and to_person_id = v_p4 and relation_type = 'spouse' and deleted_at is null);

    insert into relationship(clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    select v_clan_id, v_p4, v_p2, 'spouse', 'spouse', false, false, false, '反向配偶关系', 'medium', 'official', v_user_id, now(), now()
    where not exists (select 1 from relationship where clan_id = v_clan_id and from_person_id = v_p4 and to_person_id = v_p2 and relation_type = 'spouse' and deleted_at is null);

    insert into source(clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
    select v_clan_id, '长沙张氏族谱示例卷', 'genealogy_book', '演示数据', '长沙张氏族谱', '卷一', '第1页', '德承家声远，诗礼世泽长。', 'verified', 'MVP 演示来源', v_user_id, now()
    where not exists (select 1 from source where clan_id = v_clan_id and source_name = '长沙张氏族谱示例卷');

    select id into v_source_id from source where clan_id = v_clan_id and source_name = '长沙张氏族谱示例卷';

    insert into source_binding(clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_source_id, 'person', v_p1, '演示人物来源', '族谱首页记载', v_user_id, now()
    where not exists (select 1 from source_binding where clan_id = v_clan_id and source_id = v_source_id and target_type = 'person' and target_id = v_p1);

    insert into operation_log(clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
    values (v_clan_id, v_user_id, 'demo_seed', 'clan', v_clan_id, '初始化演示数据', 'demo_data.sql', 'demo-seed', '127.0.0.1', now());
end $$;

commit;
