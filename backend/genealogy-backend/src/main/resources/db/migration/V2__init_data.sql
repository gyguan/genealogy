-- Consolidated Genealogy MVP1 seed data.
-- Keep initialization/demo data here. Schema lives in V1__init_schema.sql.

insert into role (role_code, role_name, description)
values
    ('clan_admin', '宗族管理员', '管理宗族空间、成员权限、主数据和审核配置'),
    ('editor', '修谱编辑', '维护人物、关系、来源和修谱资料'),
    ('reviewer', '审核员', '负责资料复核、变更审核和定稿确认')
on conflict do nothing;

insert into app_role (role_code, role_name, description, system_role, created_at, updated_at)
values
    ('clan_admin', '宗族管理员', '管理宗族空间、用户角色、主数据、审核和全部业务配置', true, now(), now()),
    ('branch_admin', '支派管理员', '管理授权支派范围内的人物、关系、来源和支派数据', true, now(), now()),
    ('editor', '修谱编辑', '维护人物档案、世系关系、来源证据和修谱资料', true, now(), now()),
    ('reviewer', '审核员', '复核人物、关系、来源和入谱变更', true, now(), now()),
    ('viewer', '查看者', '仅可查看宗族、人物档案、世系图谱和来源资料，不允许新增、修改、审核和删除', true, now(), now())
on conflict (role_code) do update
set role_name = excluded.role_name,
    description = excluded.description,
    system_role = excluded.system_role,
    updated_at = now();

insert into app_user (username, phone, email, password_hash, display_name, avatar_url, status, created_at, updated_at, deleted_at)
values
    ('demo_admin', null, 'demo_admin@genealogy.local', 'PBKDF2$120000$Z2VuZWFsb2d5LWFkbWluMQ==$b3LgXPJaGszu+eUFifk0u1gc01G+sy70jxCOlqBbazA=', '演示管理员', null, 'active', now(), now(), null),
    ('demo_editor', null, 'demo_editor@genealogy.local', 'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8tMQ==$JAo+pyqkFYJLFstlWyONhsMq/i+KEAeBiakqAieAjTU=', '演示编辑', null, 'active', now(), now(), null),
    ('demo_viewer', null, 'demo_viewer@genealogy.local', 'PBKDF2$120000$Z2VuZWFsb2d5LXZpZXdlcg==$WfS44R32Q6Ha47/vAG4ruSU9HDMug+eS0PUUHABE7co=', '演示查看者', null, 'active', now(), now(), null)
on conflict (username) do update
set password_hash = excluded.password_hash,
    email = excluded.email,
    display_name = excluded.display_name,
    status = 'active',
    updated_at = now(),
    deleted_at = null;

create or replace function seed_demo_clan(
    p_clan_code text,
    p_clan_name text,
    p_surname text,
    p_hall_name text,
    p_commandery text,
    p_origin_place text,
    p_branch_a_name text,
    p_branch_b_name text,
    p_branch_a_to text,
    p_branch_b_to text,
    p_words text[],
    p_line_a_names text[],
    p_line_b_names text[],
    p_spouse_a_names text[],
    p_spouse_b_names text[],
    p_base_year int
) returns void as $$
declare
    v_existing_clan_id bigint;
    v_clan_id bigint;
    v_branch_a_id bigint;
    v_branch_b_id bigint;
    v_scheme_id bigint;
    v_source_book_id bigint;
    v_source_oral_id bigint;
    v_person_id bigint;
    v_line_a_ids bigint[] := array[]::bigint[];
    v_line_b_ids bigint[] := array[]::bigint[];
    v_spouse_a_ids bigint[] := array[]::bigint[];
    v_spouse_b_ids bigint[] := array[]::bigint[];
    v_generation_count int := array_length(p_words, 1);
    v_family_generation_count int := least(array_length(p_spouse_a_names, 1), v_generation_count - 1);
    g int;
    v_birth_year int;
    v_is_living boolean;
    v_death_date date;
begin
    select id into v_existing_clan_id from clan where clan_code = p_clan_code;
    if v_existing_clan_id is not null then
        delete from import_job_error where job_id in (select id from import_job where clan_id = v_existing_clan_id);
        delete from import_job where clan_id = v_existing_clan_id;
        delete from source_attachment where clan_id = v_existing_clan_id;
        delete from attachment where clan_id = v_existing_clan_id;
        delete from source_binding where clan_id = v_existing_clan_id;
        delete from source where clan_id = v_existing_clan_id;
        delete from person_event where clan_id = v_existing_clan_id;
        delete from operation_log where clan_id = v_existing_clan_id;
        delete from review_task where clan_id = v_existing_clan_id;
        delete from revision where clan_id = v_existing_clan_id;
        delete from relationship where clan_id = v_existing_clan_id;
        delete from generation_word where scheme_id in (select id from generation_scheme where clan_id = v_existing_clan_id);
        delete from generation_scheme where clan_id = v_existing_clan_id;
        delete from clan_member where clan_id = v_existing_clan_id;
        delete from person where clan_id = v_existing_clan_id;
        delete from branch where clan_id = v_existing_clan_id;
        delete from clan where id = v_existing_clan_id;
    end if;

    insert into clan (clan_code, clan_name, surname, hall_name, commandery, origin_place, description, status, created_by, created_at, updated_at)
    values (p_clan_code, p_clan_name, p_surname, p_hall_name, p_commandery, p_origin_place,
            p_clan_name || '演示宗族，包含两条支派、八代字辈、人物、配偶、亲子关系和来源证据。',
            'active', 1, now(), now()) returning id into v_clan_id;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan_id, null, p_branch_a_name, '/' || p_branch_a_name, 1, 1, p_origin_place, p_branch_a_to, p_branch_a_name || '演示支派。', 'active', now(), now())
    returning id into v_branch_a_id;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan_id, null, p_branch_b_name, '/' || p_branch_b_name, 1, 2, p_origin_place, p_branch_b_to, p_branch_b_name || '演示支派。', 'active', now(), now())
    returning id into v_branch_b_id;

    insert into generation_scheme (clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
    values (v_clan_id, null, p_clan_name || '统一字辈方案', array_to_string(p_words, ''), 1, true, true, false, 'active', now()) returning id into v_scheme_id;

    for g in 1..v_generation_count loop
        insert into generation_word (scheme_id, generation_no, word, description, sort_order)
        values (v_scheme_id, g, p_words[g], p_clan_name || '第' || g || '代字辈：' || p_words[g], g);
    end loop;

    for g in 1..v_generation_count loop
        v_birth_year := p_base_year + (g - 1) * 24;
        v_is_living := g >= 5;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 76, 9, 18) end;
        insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
        values (v_clan_id, v_branch_a_id, p_clan_code || '-A-' || lpad(g::text, 2, '0'), p_line_a_names[g], p_line_a_names[g], p_words[g] || '字' || right(p_line_a_names[g], 1), p_branch_a_name || p_words[g] || '辈代表人物', 'male', g, p_words[g], p_branch_a_name || '第' || g || '世', make_date(v_birth_year, 3, 12), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living, p_origin_place, p_branch_a_to, case when g <= 2 then '族务管事' when g = 3 then '乡校教师' when g = 4 then '工程技术人员' when g = 5 then '企业管理人员' else '学生 / 青年族人' end, case when g <= 2 then '私塾' when g = 3 then '师范' when g = 4 then '本科' else '本科在读' end, case when g <= 3 then '修谱有功' else '支派资料维护人' end, p_line_a_names[g] || '，' || p_clan_name || p_branch_a_name || '第' || g || '世，字辈为“' || p_words[g] || '”。', case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_a_to || '祖茔' end, case when v_is_living then '在世人员，暂未立墓志。' else p_line_a_names[g] || '墓志记载其敦亲睦族。' end, g < v_generation_count, 'normal', case when g >= 5 then 'branch_only' else 'clan_only' end, 'official', 1, now(), 1, now()) returning id into v_person_id;
        v_line_a_ids := array_append(v_line_a_ids, v_person_id);

        v_birth_year := p_base_year + (g - 1) * 24 + 1;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 74, 10, 21) end;
        insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
        values (v_clan_id, v_branch_b_id, p_clan_code || '-B-' || lpad(g::text, 2, '0'), p_line_b_names[g], p_line_b_names[g], p_words[g] || '字' || right(p_line_b_names[g], 1), p_branch_b_name || p_words[g] || '辈代表人物', 'male', g, p_words[g], p_branch_b_name || '第' || g || '世', make_date(v_birth_year, 6, 16), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living, p_origin_place, p_branch_b_to, case when g <= 2 then '族田经营' when g = 3 then '乡村医生' when g = 4 then '教师' when g = 5 then '软件工程师' else '学生 / 青年族人' end, case when g <= 2 then '私塾' when g = 3 then '中专' when g = 4 then '本科' else '本科在读' end, case when g <= 3 then '支派贤达' else '宗族数字化志愿者' end, p_line_b_names[g] || '，' || p_clan_name || p_branch_b_name || '第' || g || '世，字辈为“' || p_words[g] || '”。', case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_b_to || '祖茔' end, case when v_is_living then '在世人员，暂未立墓志。' else p_line_b_names[g] || '墓志记载其勤俭持家。' end, g < v_generation_count, 'normal', case when g >= 5 then 'branch_only' else 'clan_only' end, 'official', 1, now(), 1, now()) returning id into v_person_id;
        v_line_b_ids := array_append(v_line_b_ids, v_person_id);
    end loop;

    for g in 1..v_family_generation_count loop
        v_birth_year := p_base_year + (g - 1) * 24 + 2;
        v_is_living := g >= 5;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 73, 11, 8) end;
        insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
        values (v_clan_id, v_branch_a_id, p_clan_code || '-A-S' || lpad(g::text, 2, '0'), p_spouse_a_names[g], p_spouse_a_names[g], p_words[g] || '配', p_branch_a_name || '第' || g || '世配偶', 'female', g, p_words[g], '配偶', make_date(v_birth_year, 4, 9), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living, p_origin_place, p_branch_a_to, '家风传承', '家学', '家风传承记录人', p_spouse_a_names[g] || '，' || p_clan_name || p_branch_a_name || '第' || g || '世配偶。', case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_a_to || '合葬墓区' end, case when v_is_living then '在世人员，已记录家庭关系。' else p_spouse_a_names[g] || '墓志记载其持家有方。' end, true, 'normal', case when g >= 5 then 'branch_only' else 'clan_only' end, 'official', 1, now(), 1, now()) returning id into v_person_id;
        v_spouse_a_ids := array_append(v_spouse_a_ids, v_person_id);

        v_birth_year := p_base_year + (g - 1) * 24 + 3;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 72, 12, 6) end;
        insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
        values (v_clan_id, v_branch_b_id, p_clan_code || '-B-S' || lpad(g::text, 2, '0'), p_spouse_b_names[g], p_spouse_b_names[g], p_words[g] || '配', p_branch_b_name || '第' || g || '世配偶', 'female', g, p_words[g], '配偶', make_date(v_birth_year, 7, 11), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living, p_origin_place, p_branch_b_to, '家风传承', '家学', '家风传承记录人', p_spouse_b_names[g] || '，' || p_clan_name || p_branch_b_name || '第' || g || '世配偶。', case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_b_to || '合葬墓区' end, case when v_is_living then '在世人员，已记录家庭关系。' else p_spouse_b_names[g] || '墓志记载其和睦宗亲。' end, true, 'normal', case when g >= 5 then 'branch_only' else 'clan_only' end, 'official', 1, now(), 1, now()) returning id into v_person_id;
        v_spouse_b_ids := array_append(v_spouse_b_ids, v_person_id);
    end loop;

    for g in 1..v_family_generation_count loop
        insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at) values
            (v_clan_id, v_line_a_ids[g], v_spouse_a_ids[g], 'spouse', 'spouse', false, false, true, p_line_a_names[g] || '与' || p_spouse_a_names[g] || '婚配关系。', 'high', 'official', 1, now(), now()),
            (v_clan_id, v_line_b_ids[g], v_spouse_b_ids[g], 'spouse', 'spouse', false, false, true, p_line_b_names[g] || '与' || p_spouse_b_names[g] || '婚配关系。', 'high', 'official', 1, now(), now()),
            (v_clan_id, v_line_a_ids[g], v_line_a_ids[g + 1], 'parent_child', 'father', true, true, true, p_line_a_names[g] || '为' || p_line_a_names[g + 1] || '之父。', 'high', 'official', 1, now(), now()),
            (v_clan_id, v_spouse_a_ids[g], v_line_a_ids[g + 1], 'parent_child', 'mother', true, true, true, p_spouse_a_names[g] || '为' || p_line_a_names[g + 1] || '之母。', 'high', 'official', 1, now(), now()),
            (v_clan_id, v_line_b_ids[g], v_line_b_ids[g + 1], 'parent_child', 'father', true, true, true, p_line_b_names[g] || '为' || p_line_b_names[g + 1] || '之父。', 'high', 'official', 1, now(), now()),
            (v_clan_id, v_spouse_b_ids[g], v_line_b_ids[g + 1], 'parent_child', 'mother', true, true, true, p_spouse_b_names[g] || '为' || p_line_b_names[g + 1] || '之母。', 'high', 'official', 1, now(), now());
    end loop;

    update branch set founder_person_id = v_line_a_ids[1], updated_at = now() where id = v_branch_a_id;
    update branch set founder_person_id = v_line_b_ids[1], updated_at = now() where id = v_branch_b_id;
    update clan set ancestor_person_id = v_line_a_ids[1], updated_at = now() where id = v_clan_id;

    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
    values (v_clan_id, p_clan_name || '演示族谱原文', 'genealogy_book', '修谱委员会', p_clan_name || '八代世系演示谱', '卷一', '1-42', p_clan_name || '两支八代人物、配偶、亲子关系均据演示族谱原文录入。', 'verified', '用于人物档案、来源资料库、世系图谱和审核演示。', 1, now()) returning id into v_source_book_id;
    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
    values (v_clan_id, p_clan_name || '支派口述访谈', 'oral_record', '支派负责人', p_clan_name || '口述资料汇编', '访谈记录', '1-18', p_clan_name || '支派负责人补充迁徙、职业、教育和家庭成员信息。', 'verified', '用于补充人物和家庭关系说明。', 1, now()) returning id into v_source_oral_id;

    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_source_book_id, 'person', p.id, '演示族谱原文记录人物基础信息', p.name || '的姓名、字辈、世次、支派和生卒信息据族谱原文录入。', 1, now()
    from person p where p.clan_id = v_clan_id;
    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_source_oral_id, 'relationship', r.id, '支派口述访谈确认家庭关系', '关系由支派负责人访谈确认，并与族谱原文互相印证。', 1, now()
    from relationship r where r.clan_id = v_clan_id;

    insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
    values (v_clan_id, 1, 'DEMO_SEED_CLAN', 'clan', v_clan_id, '预置演示宗族：' || p_clan_name, 'Flyway 预置演示宗族主数据。', 'flyway-demo-seed', '127.0.0.1', now());
end;
$$ language plpgsql;

select seed_demo_clan('DEMO-ZHANG-HUAIYANG','淮阳张氏宗族','张','百忍堂','清河郡','河南省周口市淮阳区','长房东支','二房西支','安徽省合肥市肥西县','江苏省苏州市吴中区',array['明','承','德','宏','家','业','昌','盛'],array['张明远','张承志','张德安','张宏毅','张家瑞','张业宁','张昌泰','张盛泽'],array['张明德','张承礼','张德华','张宏文','张家诚','张业航','张昌泽','张盛宇'],array['王雅兰','李淑芳','陈慧敏','周婉清','郑思雨','黄若琳','郭诗涵'],array['刘素琴','赵秀梅','孙丽君','吴静怡','林晓月','何雨欣','唐雨桐'],1865);
select seed_demo_clan('DEMO-LI-LONGXI','陇西李氏宗族','李','陇西堂','陇西郡','甘肃省定西市陇西县','南迁长支','北望二支','湖北省武汉市黄陂区','陕西省西安市长安区',array['世','泽','长','荣','启','瑞','祥','和'],array['李世安','李泽民','李长青','李荣轩','李启明','李瑞霖','李祥宇','李和宁'],array['李世昌','李泽华','李长林','李荣泽','李启航','李瑞峰','李祥宁','李和远'],array['周秀英','郑芳华','王静雯','赵婉婷','陈诗涵','许梦瑶','沈若溪'],array['马桂兰','罗春梅','刘慧娟','孙雅琪','林雨婷','高欣怡','梁诗雨'],1870);

drop function seed_demo_clan(text, text, text, text, text, text, text, text, text, text, text[], text[], text[], text[], text[], int);

insert into clan_member (clan_id, user_id, branch_id, role_id, member_name, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
select c.id, u.id, null, r.id, u.display_name, 'active', 'clan', c.id, now(), now(), now()
from clan c join app_user u on u.username = 'demo_admin' and u.deleted_at is null join app_role r on r.role_code = 'clan_admin'
where c.clan_code in ('DEMO-ZHANG-HUAIYANG', 'DEMO-LI-LONGXI') and not exists (select 1 from clan_member m where m.clan_id = c.id and m.user_id = u.id);
insert into clan_member (clan_id, user_id, branch_id, role_id, member_name, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
select c.id, u.id, null, r.id, u.display_name, 'active', 'clan', c.id, now(), now(), now()
from clan c join app_user u on u.username = 'demo_editor' and u.deleted_at is null join app_role r on r.role_code = 'editor'
where c.clan_code in ('DEMO-ZHANG-HUAIYANG', 'DEMO-LI-LONGXI') and not exists (select 1 from clan_member m where m.clan_id = c.id and m.user_id = u.id);
insert into clan_member (clan_id, user_id, branch_id, role_id, member_name, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
select c.id, u.id, null, r.id, u.display_name, 'active', 'clan', c.id, now(), now(), now()
from clan c join app_user u on u.username = 'demo_viewer' and u.deleted_at is null join app_role r on r.role_code = 'viewer'
where c.clan_code in ('DEMO-ZHANG-HUAIYANG', 'DEMO-LI-LONGXI') and not exists (select 1 from clan_member m where m.clan_id = c.id and m.user_id = u.id);

insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
select p.clan_id, p.id, 'birth', '出生', p.birth_date, coalesce(nullif(p.birth_date_precision, ''), 'day'), p.birth_place, p.name || '出生于' || coalesce(p.birth_place, '未详地点') || '。', 'person', p.id, 10, coalesce(p.data_status, 'official'), coalesce(p.created_by, 1), now(), now()
from person p where p.deleted_at is null and p.birth_date is not null;
insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
select r.clan_id, p.id, 'marriage', '婚配', (coalesce(p.birth_date, other.birth_date) + interval '24 years')::date, 'year', coalesce(p.residence_place, other.residence_place), p.name || '与' || other.name || '结为配偶。', 'relationship', r.id, 50, coalesce(r.data_status, 'official'), coalesce(r.created_by, 1), now(), now()
from relationship r join person p on p.id in (r.from_person_id, r.to_person_id) join person other on other.id = case when p.id = r.from_person_id then r.to_person_id else r.from_person_id end
where r.deleted_at is null and p.deleted_at is null and other.deleted_at is null and r.relation_type = 'spouse' and coalesce(p.birth_date, other.birth_date) is not null;
insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
select r.clan_id, parent.id, 'child_birth', '子女出生', child.birth_date, coalesce(nullif(child.birth_date_precision, ''), 'day'), child.birth_place, parent.name || '之子女' || child.name || '出生。', 'relationship', r.id, 60, coalesce(r.data_status, 'official'), coalesce(r.created_by, 1), now(), now()
from relationship r join person parent on parent.id = r.from_person_id join person child on child.id = r.to_person_id
where r.deleted_at is null and parent.deleted_at is null and child.deleted_at is null and r.relation_type = 'parent_child' and child.birth_date is not null;
insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
select p.clan_id, p.id, 'death', '逝世', p.death_date, coalesce(nullif(p.death_date_precision, ''), 'day'), p.residence_place, p.name || '逝世。', 'person', p.id, 90, coalesce(p.data_status, 'official'), coalesce(p.created_by, 1), now(), now()
from person p where p.deleted_at is null and p.death_date is not null;
