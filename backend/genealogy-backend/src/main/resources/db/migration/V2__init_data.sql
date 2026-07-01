-- Clean Genealogy MVP1 seed data.
-- This script is intended for a fresh database created by V1__init_schema.sql.

-- 1. Baseline roles and demo users.
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

insert into app_user (username, phone, email, password_hash, display_name, avatar_url, status, last_login_at, created_at, updated_at, deleted_at)
values
    ('demo_admin', '13800000001', 'demo_admin@genealogy.local', md5('demo_admin_seed_password'), '演示管理员', null, 'active', now() - interval '1 day', now(), now(), null),
    ('demo_branch_admin', '13800000002', 'demo_branch_admin@genealogy.local', md5('demo_branch_admin_seed_password'), '演示支派管理员', null, 'active', now() - interval '2 days', now(), now(), null),
    ('demo_editor', '13800000003', 'demo_editor@genealogy.local', md5('demo_editor_seed_password'), '演示编辑', null, 'active', now() - interval '3 days', now(), now(), null),
    ('demo_reviewer', '13800000004', 'demo_reviewer@genealogy.local', md5('demo_reviewer_seed_password'), '演示审核员', null, 'active', now() - interval '4 days', now(), now(), null),
    ('demo_viewer', '13800000005', 'demo_viewer@genealogy.local', md5('demo_viewer_seed_password'), '演示查看者', null, 'active', now() - interval '5 days', now(), now(), null)
on conflict (username) do update
set phone = excluded.phone,
    email = excluded.email,
    password_hash = excluded.password_hash,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    status = 'active',
    last_login_at = excluded.last_login_at,
    updated_at = now(),
    deleted_at = null;

insert into app_auth_session (user_id, token_hash, issued_at, expires_at, revoked_at, client_ip, user_agent)
select id,
       md5('seed-session-' || username),
       now() - interval '2 hours',
       now() + interval '22 hours',
       case when username = 'demo_viewer' then now() - interval '30 minutes' else null end,
       '127.0.0.1',
       'Flyway seed initializer'
from app_user
where username in ('demo_admin', 'demo_branch_admin', 'demo_editor', 'demo_reviewer', 'demo_viewer');

-- 2. Realistic clan seed generator.
create or replace function seed_realistic_clan(
    p_clan_code text,
    p_clan_name text,
    p_surname text,
    p_hall_name text,
    p_commandery text,
    p_origin_place text,
    p_current_places text[],
    p_branch_names text[],
    p_branch_places text[],
    p_words text[],
    p_given_chars text[],
    p_spouse_surnames text[],
    p_base_year int
) returns void as $$
declare
    v_admin_user_id bigint;
    v_branch_admin_user_id bigint;
    v_editor_user_id bigint;
    v_reviewer_user_id bigint;
    v_viewer_user_id bigint;
    v_clan_id bigint;
    v_branch_id bigint;
    v_scheme_id bigint;
    v_book_source_id bigint;
    v_chronicle_source_id bigint;
    v_oral_source_id bigint;
    v_branch_ids bigint[] := array[]::bigint[];
    v_core_ids bigint[] := array[]::bigint[];
    v_spouse_ids bigint[] := array[]::bigint[];
    v_branch_count int := array_length(p_branch_names, 1);
    v_generation_count int := array_length(p_words, 1);
    v_given_count int := array_length(p_given_chars, 1);
    v_spouse_count int := array_length(p_spouse_surnames, 1);
    v_female_names text[] := array['雅兰','慧芳','婉清','秀英','淑珍','丽华','静文','素琴'];
    b int;
    g int;
    v_idx int;
    v_spouse_idx int;
    v_birth_year int;
    v_death_date date;
    v_is_living boolean;
    v_person_id bigint;
    v_spouse_id bigint;
    v_person_name text;
    v_spouse_name text;
    v_word text;
    v_admin_member_id bigint;
    v_branch_admin_member_id bigint;
    v_editor_member_id bigint;
    v_viewer_member_id bigint;
    v_reviewer_member_id bigint;
    v_revision_id bigint;
    v_review_task_id bigint;
    v_import_job_id bigint;
begin
    select id into v_admin_user_id from app_user where username = 'demo_admin';
    select id into v_branch_admin_user_id from app_user where username = 'demo_branch_admin';
    select id into v_editor_user_id from app_user where username = 'demo_editor';
    select id into v_reviewer_user_id from app_user where username = 'demo_reviewer';
    select id into v_viewer_user_id from app_user where username = 'demo_viewer';

    insert into clan (clan_code, clan_name, surname, hall_name, commandery, ancestor_person_id, origin_place, current_places, description, status, created_by, created_at, updated_at)
    values (p_clan_code, p_clan_name, p_surname, p_hall_name, p_commandery, null, p_origin_place, to_jsonb(p_current_places), p_clan_name || '初始化样例，收录三条支派、五代世系、来源证据、审核记录、附件元数据和操作日志；家训：敦亲睦族、敬祖修身、诗书传家。', 'active', v_admin_user_id, now() - interval '120 days', now())
    returning id into v_clan_id;

    for b in 1..v_branch_count loop
        insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, founder_person_id, migration_from, migration_to, manager_member_id, description, status, created_at, updated_at)
        values (v_clan_id, null, p_branch_names[b], '/' || p_branch_names[b], 1, b, null, p_origin_place, p_branch_places[b], null, p_branch_names[b] || '由' || p_origin_place || '迁居至' || p_branch_places[b] || '，现存五代人物资料、婚配关系、迁徙说明和来源证据。', 'active', now() - interval '110 days', now())
        returning id into v_branch_id;
        v_branch_ids := array_append(v_branch_ids, v_branch_id);
    end loop;

    insert into generation_scheme (clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
    values (v_clan_id, null, p_clan_name || '五代字辈方案', array_to_string(p_words, ' '), 1, true, true, false, 'active', now() - interval '105 days')
    returning id into v_scheme_id;

    for g in 1..v_generation_count loop
        insert into generation_word (scheme_id, generation_no, word, description, sort_order)
        values (v_scheme_id, g, p_words[g], p_clan_name || '第' || g || '代统一字辈“' || p_words[g] || '”，适用于全部支派。', g);
    end loop;

    for b in 1..v_branch_count loop
        for g in 1..v_generation_count loop
            v_word := p_words[g];
            v_person_name := p_surname || v_word || p_given_chars[((b + g - 2) % v_given_count) + 1];
            v_birth_year := p_base_year + (g - 1) * 27 + (b - 1) * 2;
            v_is_living := g >= 3;
            v_death_date := case when v_is_living then null else make_date(v_birth_year + 78, ((b + g) % 12) + 1, ((b * g) % 20) + 1) end;

            insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at, deleted_at)
            values (v_clan_id, v_branch_ids[b], p_clan_code || '-B' || b || '-G' || g || '-M', v_person_name, v_person_name, v_word || '字' || right(v_person_name, 1), p_branch_names[b] || '第' || g || '世代表', 'male', g, v_word, p_branch_names[b] || '第' || g || '世', make_date(v_birth_year, ((b + g) % 12) + 1, ((b + g * 2) % 20) + 1), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living, p_origin_place, p_branch_places[b], case when g = 1 then '族务管事' when g = 2 then '乡绅商户' when g = 3 then '教师 / 医师' when g = 4 then '工程技术人员' else '学生 / 青年族人' end, case when g <= 2 then '私塾 / 家学' when g = 3 then '中专 / 师范' when g = 4 then '本科' else '高中 / 本科在读' end, case when g <= 2 then '修谱有功' when g = 3 then '支派贤达' else '宗族数字化志愿者' end, v_person_name || '，' || p_clan_name || p_branch_names[b] || '第' || g || '世，字辈为“' || v_word || '”，人物资料由族谱原文、地方志和支派访谈互证。', case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_places[b] || '祖茔' end, case when v_is_living then '在世人员，暂未立墓志。' else v_person_name || '墓志记载其敦亲睦族、勤俭持家。' end, g < v_generation_count, 'normal', case when g >= 4 then 'branch_only' else 'clan_only' end, 'official', v_admin_user_id, now() - interval '90 days' + (g || ' days')::interval, v_admin_user_id, now(), null)
            returning id into v_person_id;
            v_core_ids := array_append(v_core_ids, v_person_id);

            if g < v_generation_count then
                v_spouse_name := p_spouse_surnames[((b + g - 2) % v_spouse_count) + 1] || v_female_names[((b + g - 2) % array_length(v_female_names, 1)) + 1];
                insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at, deleted_at)
                values (v_clan_id, v_branch_ids[b], p_clan_code || '-B' || b || '-G' || g || '-S', v_spouse_name, v_spouse_name, v_word || '配', p_branch_names[b] || '第' || g || '世配偶', 'female', g, v_word, '配偶', make_date(v_birth_year + 2, ((b + g + 1) % 12) + 1, ((b * g + 7) % 20) + 1), 'day', case when v_is_living then null else make_date(v_birth_year + 75, ((b + g + 2) % 12) + 1, ((b * g + 9) % 20) + 1) end, case when v_is_living then 'unknown' else 'day' end, v_is_living, p_branch_places[b], p_branch_places[b], '家风传承 / 家庭经营', case when g <= 2 then '家学' when g = 3 then '中专' else '大专 / 本科' end, '家风传承记录人', v_spouse_name || '，' || p_clan_name || p_branch_names[b] || '第' || g || '世配偶，参与家庭口述资料整理。', case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_places[b] || '合葬墓区' end, case when v_is_living then '在世人员，已记录家庭关系。' else v_spouse_name || '墓志记载其持家有方、和睦宗亲。' end, true, 'normal', case when g >= 4 then 'branch_only' else 'clan_only' end, 'official', v_admin_user_id, now() - interval '89 days' + (g || ' days')::interval, v_admin_user_id, now(), null)
                returning id into v_spouse_id;
                v_spouse_ids := array_append(v_spouse_ids, v_spouse_id);
            end if;
        end loop;
    end loop;

    for b in 1..v_branch_count loop
        update branch set founder_person_id = v_core_ids[(b - 1) * v_generation_count + 1], updated_at = now() where id = v_branch_ids[b];
        for g in 1..(v_generation_count - 1) loop
            v_idx := (b - 1) * v_generation_count + g;
            v_spouse_idx := (b - 1) * (v_generation_count - 1) + g;
            insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at, deleted_at)
            values
                (v_clan_id, v_core_ids[v_idx], v_spouse_ids[v_spouse_idx], 'spouse', 'spouse', false, false, true, '据族谱和口述资料确认的婚配关系。', 'high', 'official', v_admin_user_id, now() - interval '80 days', now(), null),
                (v_clan_id, v_core_ids[v_idx], v_core_ids[v_idx + 1], 'parent_child', 'father', true, true, true, '父子世系关系，来源为族谱原文。', 'high', 'official', v_admin_user_id, now() - interval '80 days', now(), null),
                (v_clan_id, v_spouse_ids[v_spouse_idx], v_core_ids[v_idx + 1], 'parent_child', 'mother', true, true, true, '母子家庭关系，来源为族谱原文和口述访谈。', 'high', 'official', v_admin_user_id, now() - interval '80 days', now(), null);
        end loop;
    end loop;

    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at, deleted_at)
    values (v_clan_id, v_core_ids[(least(2, v_branch_count) - 1) * v_generation_count + 3], v_core_ids[(least(3, v_branch_count) - 1) * v_generation_count + 4], 'successor', 'heir_successor', true, false, false, '继嗣/承嗣关系样例，用于验证中国式复杂世系关系。', 'medium', 'official', v_admin_user_id, now() - interval '70 days', now(), null);

    update clan set ancestor_person_id = v_core_ids[1], updated_at = now() where id = v_clan_id;

    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
    values (v_clan_id, p_clan_name || '老谱影印本', 'genealogy_book', '修谱委员会', p_clan_name || '五代支派世系谱', '卷一', '1-86', p_clan_name || '记载三支五代人物、婚配、迁徙和字辈信息。', 'verified', '用于人物档案、世系关系、成册导出和审核演示。', v_admin_user_id, now() - interval '60 days') returning id into v_book_source_id;
    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
    values (v_clan_id, p_clan_name || '地方志摘录', 'local_chronicle', '地方志办公室', p_commandery || '姓氏与迁徙资料', '志书摘录', '23-31', p_surname || '氏自' || p_origin_place || '迁居多地，形成若干房支。', 'verified', '用于宗族源流、支派迁徙、堂号郡望和文化首页展示。', v_admin_user_id, now() - interval '59 days') returning id into v_chronicle_source_id;
    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, excerpt, verification_status, description, created_by, created_at)
    values (v_clan_id, p_clan_name || '支派口述访谈', 'oral_record', '支派负责人', p_clan_name || '口述资料汇编', '访谈一', '1-20', '各支派负责人补充近现代居住地、职业、教育、墓葬和家庭关系信息。', 'verified', '用于补充人物档案完整度、关系可信度和迁徙说明。', v_editor_user_id, now() - interval '58 days') returning id into v_oral_source_id;

    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    values (v_clan_id, v_chronicle_source_id, 'clan', v_clan_id, '地方志记录宗族源流', p_surname || '氏郡望、堂号与迁徙线索据地方志补充。', v_admin_user_id, now() - interval '57 days');
    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_chronicle_source_id, 'branch', br.id, '支派迁徙说明来源', br.branch_name || '迁徙路线据地方志和口述资料整理。', v_admin_user_id, now() - interval '57 days' from branch br where br.clan_id = v_clan_id;
    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_book_source_id, 'person', p.id, '族谱原文记录人物基础信息', p.name || '的姓名、世次、支派、生卒和字辈据老谱影印本录入。', v_admin_user_id, now() - interval '56 days' from person p where p.clan_id = v_clan_id and p.deleted_at is null;
    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_oral_source_id, 'relationship', r.id, '支派口述访谈确认家庭关系', '该关系由支派负责人访谈确认，并与族谱原文互相印证。', v_editor_user_id, now() - interval '56 days' from relationship r where r.clan_id = v_clan_id and r.deleted_at is null;
    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at)
    select v_clan_id, v_book_source_id, 'generation_word', gw.id, '字辈方案来源', '第' || gw.generation_no || '代字辈“' || gw.word || '”据老谱卷首字派录入。', v_admin_user_id, now() - interval '55 days' from generation_word gw where gw.scheme_id = v_scheme_id;

    insert into source_attachment (source_id, clan_id, original_filename, stored_filename, content_type, file_size, storage_path, checksum, upload_status, created_by, created_at, deleted_at)
    values (v_book_source_id, v_clan_id, p_clan_code || '_老谱影印样例.pdf', lower(p_clan_code) || '_old_book_seed.pdf', 'application/pdf', 524288, 'data/uploads/sources/seed/' || lower(p_clan_code) || '_old_book_seed.pdf', md5(p_clan_code || '-source-attachment'), 'metadata_only', v_admin_user_id, now() - interval '54 days', null);

    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at, deleted_at)
    select p.clan_id, p.id, 'birth', '出生', p.birth_date, coalesce(nullif(p.birth_date_precision, ''), 'day'), p.birth_place, p.name || '出生于' || coalesce(p.birth_place, '未详地点') || '。', 'source', v_book_source_id, 10, coalesce(p.data_status, 'official'), coalesce(p.created_by, v_admin_user_id), now() - interval '52 days', now(), null from person p where p.clan_id = v_clan_id and p.deleted_at is null and p.birth_date is not null;
    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at, deleted_at)
    select p.clan_id, p.id, 'death', '逝世', p.death_date, coalesce(nullif(p.death_date_precision, ''), 'day'), p.residence_place, p.name || '逝世，葬于' || coalesce(p.tomb_place, p.residence_place, '未详') || '。', 'source', v_book_source_id, 90, coalesce(p.data_status, 'official'), coalesce(p.created_by, v_admin_user_id), now() - interval '49 days', now(), null from person p where p.clan_id = v_clan_id and p.deleted_at is null and p.death_date is not null;
    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at, deleted_at)
    select r.clan_id, r.from_person_id, 'marriage', '婚配', (p.birth_date + interval '24 years')::date, 'year', p.residence_place, p.name || '与' || s.name || '结为配偶。', 'relationship', r.id, 50, r.data_status, r.created_by, now() - interval '51 days', now(), null
    from relationship r join person p on p.id = r.from_person_id join person s on s.id = r.to_person_id
    where r.clan_id = v_clan_id and r.relation_type = 'spouse' and r.deleted_at is null;
    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at, deleted_at)
    select r.clan_id, r.from_person_id, 'child_birth', '子女出生', child.birth_date, coalesce(nullif(child.birth_date_precision, ''), 'day'), child.birth_place, p.name || '之子' || child.name || '出生。', 'relationship', r.id, 60, r.data_status, r.created_by, now() - interval '50 days', now(), null
    from relationship r join person p on p.id = r.from_person_id join person child on child.id = r.to_person_id
    where r.clan_id = v_clan_id and r.relation_type = 'parent_child' and r.relation_label = 'father' and r.deleted_at is null;

    insert into revision (clan_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, approved_at, rejected_reason)
    values (v_clan_id, 'person', v_core_ids[1], 'modified', jsonb_build_object('dataStatus','draft','name',(select name from person where id = v_core_ids[1])), jsonb_build_object('dataStatus','official','name',(select name from person where id = v_core_ids[1])), '初始化样例：始祖人物由草稿转为正式入谱。', v_editor_user_id, now() - interval '45 days', 'approved', now() - interval '44 days', null)
    returning id into v_revision_id;
    insert into review_task (clan_id, revision_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (v_clan_id, v_revision_id, 1, v_reviewer_user_id, 'reviewer', v_branch_ids[1], 'approved', '资料来源完整，同意正式入谱。', now() - interval '44 days', now() - interval '45 days') returning id into v_review_task_id;

    insert into revision (clan_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, approved_at, rejected_reason)
    values (v_clan_id, 'relationship', (select id from relationship where clan_id = v_clan_id limit 1), 'modified', jsonb_build_object('confidenceLevel','medium'), jsonb_build_object('confidenceLevel','high'), '初始化样例：关系可信度由中调整为高，等待审核。', v_editor_user_id, now() - interval '20 days', 'pending', null, null)
    returning id into v_revision_id;
    insert into review_task (clan_id, revision_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (v_clan_id, v_revision_id, 1, v_reviewer_user_id, 'reviewer', v_branch_ids[2], 'pending', '等待支派负责人复核关系来源。', null, now() - interval '20 days');

    insert into revision (clan_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, approved_at, rejected_reason)
    values (v_clan_id, 'source', v_oral_source_id, 'modified', jsonb_build_object('verificationStatus','unverified'), jsonb_build_object('verificationStatus','verified'), '初始化样例：口述资料复核信息不足，审核驳回。', v_editor_user_id, now() - interval '18 days', 'rejected', null, '缺少访谈人签名和日期，需补充后重新提交。')
    returning id into v_revision_id;
    insert into review_task (clan_id, revision_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (v_clan_id, v_revision_id, 1, v_reviewer_user_id, 'reviewer', v_branch_ids[3], 'rejected', '缺少访谈人签名和日期。', now() - interval '17 days', now() - interval '18 days') returning id into v_review_task_id;

    insert into import_job (clan_id, branch_id, import_type, original_filename, total_count, success_count, failure_count, status, error_summary, created_by, created_at)
    values (v_clan_id, v_branch_ids[1], 'person_csv', p_clan_code || '_支派人物补录.csv', 12, 11, 1, 'completed', '第 8 行姓名缺失，已跳过。', v_editor_user_id, now() - interval '15 days') returning id into v_import_job_id;
    insert into import_job_error (job_id, row_no, error_message, raw_data, created_at)
    values (v_import_job_id, 8, '姓名不能为空', '男,5,' || p_words[5] || ',' || p_branch_names[1] || ',2012-01-01,是', now() - interval '15 days');

    insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
    values
        (v_clan_id, v_admin_user_id, 'seed_clan_init', 'clan', v_clan_id, '初始化宗族：' || p_clan_name, 'Flyway 初始化预置宗族、支派、五代人物、关系、来源、审核和日志。', 'seed-' || lower(p_clan_code), '127.0.0.1', now() - interval '120 days'),
        (v_clan_id, v_editor_user_id, 'person_import', 'import_job', v_import_job_id, '导入支派人物补录文件', '成功 11 行，失败 1 行。', 'seed-import-' || lower(p_clan_code), '127.0.0.1', now() - interval '15 days'),
        (v_clan_id, v_reviewer_user_id, 'review_reject', 'review_task', v_review_task_id, '审核驳回', '资料缺少访谈人签名和日期。', 'seed-review-reject-' || lower(p_clan_code), '127.0.0.1', now() - interval '17 days');

    insert into clan_member (clan_id, user_id, person_id, branch_id, role_id, member_name, join_status, invited_by, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
    select v_clan_id, u.id, v_core_ids[3], null, r.id, u.display_name, 'joined', v_admin_user_id, 'active', 'clan', v_clan_id, now() - interval '40 days', now() - interval '40 days', now()
    from app_user u join app_role r on r.role_code = 'clan_admin' where u.username = 'demo_admin' returning id into v_admin_member_id;
    insert into clan_member (clan_id, user_id, person_id, branch_id, role_id, member_name, join_status, invited_by, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
    select v_clan_id, u.id, v_core_ids[8], v_branch_ids[2], r.id, u.display_name, 'joined', v_admin_user_id, 'active', 'clan', v_clan_id, now() - interval '38 days', now() - interval '38 days', now()
    from app_user u join app_role r on r.role_code = 'viewer' where u.username = 'demo_viewer' returning id into v_viewer_member_id;
    insert into clan_member (clan_id, user_id, person_id, branch_id, role_id, member_name, join_status, invited_by, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
    select v_clan_id, u.id, v_core_ids[13], v_branch_ids[3], r.id, u.display_name, 'joined', v_admin_user_id, 'active', 'clan', v_clan_id, now() - interval '37 days', now() - interval '37 days', now()
    from app_user u join app_role r on r.role_code = 'reviewer' where u.username = 'demo_reviewer' returning id into v_reviewer_member_id;

    for b in 1..v_branch_count loop
        insert into clan_member (clan_id, user_id, person_id, branch_id, role_id, member_name, join_status, invited_by, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
        select v_clan_id, u.id, v_core_ids[(b - 1) * v_generation_count + 3], v_branch_ids[b], r.id, u.display_name || ' - ' || p_branch_names[b], 'joined', v_admin_user_id, 'active', 'branch', v_branch_ids[b], now() - interval '36 days', now() - interval '36 days', now()
        from app_user u join app_role r on r.role_code = 'branch_admin' where u.username = 'demo_branch_admin' returning id into v_branch_admin_member_id;
        update branch set manager_member_id = v_branch_admin_member_id, updated_at = now() where id = v_branch_ids[b];

        insert into clan_member (clan_id, user_id, person_id, branch_id, role_id, member_name, join_status, invited_by, member_status, scope_type, scope_id, joined_at, created_at, updated_at)
        select v_clan_id, u.id, v_core_ids[(b - 1) * v_generation_count + 4], v_branch_ids[b], r.id, u.display_name || ' - ' || p_branch_names[b], 'joined', v_admin_user_id, 'active', 'branch', v_branch_ids[b], now() - interval '35 days', now() - interval '35 days', now()
        from app_user u join app_role r on r.role_code = 'editor' where u.username = 'demo_editor' returning id into v_editor_member_id;
    end loop;
end;
$$ language plpgsql;

-- 3. Six realistic clans. Each clan has 3 branches and 5 generations across all branches.
select seed_realistic_clan('INIT-ZHANG-HUAIYANG','淮阳张氏宗族','张','百忍堂','清河郡','河南省周口市淮阳区',array['河南省周口市淮阳区','安徽省合肥市肥西县','江苏省苏州市吴中区','浙江省嘉兴市海宁市'],array['长房东支','二房南支','三房海宁支'],array['安徽省合肥市肥西县','江苏省苏州市吴中区','浙江省嘉兴市海宁市'],array['明','承','启','俊','泽'],array['德','礼','远','良','安','宁'],array['王','李','陈','赵','刘'],1908);
select seed_realistic_clan('INIT-LI-LONGXI','陇西李氏宗族','李','敦本堂','陇西郡','甘肃省定西市陇西县',array['甘肃省定西市陇西县','陕西省西安市蓝田县','四川省成都市郫都区','重庆市江津区'],array['关中支','蜀中支','巴渝支'],array['陕西省西安市蓝田县','四川省成都市郫都区','重庆市江津区'],array['宗','维','世','家','庆'],array['厚','文','仁','义','和','昌'],array['周','何','黄','郭','孙'],1910);
select seed_realistic_clan('INIT-WANG-TAIYUAN','太原王氏宗族','王','三槐堂','太原郡','山西省太原市晋源区',array['山西省太原市晋源区','河北省石家庄市正定县','山东省济南市章丘区','北京市通州区'],array['晋源老支','正定分支','章丘分支'],array['河北省石家庄市正定县','山东省济南市章丘区','北京市通州区'],array['国','正','天','心','顺'],array['成','志','怀','景','康','泰'],array['赵','张','马','吴','许'],1912);
select seed_realistic_clan('INIT-CHEN-YINGCHUAN','颍川陈氏宗族','陈','德星堂','颍川郡','河南省许昌市长葛市',array['河南省许昌市长葛市','福建省泉州市晋江市','广东省揭阳市普宁市','广西壮族自治区玉林市'],array['颍川本支','闽南支','岭南支'],array['福建省泉州市晋江市','广东省揭阳市普宁市','广西壮族自治区玉林市'],array['克','绍','家','声','远'],array['贤','达','文','瑞','祥','和'],array['林','蔡','郑','许','黄'],1914);
select seed_realistic_clan('INIT-LIU-PENGCHENG','彭城刘氏宗族','刘','藜照堂','彭城郡','江苏省徐州市沛县',array['江苏省徐州市沛县','安徽省宿州市萧县','河南省商丘市永城市','湖北省武汉市新洲区'],array['沛县本支','萧县支','新洲支'],array['安徽省宿州市萧县','河南省商丘市永城市','湖北省武汉市新洲区'],array['永','传','忠','孝','本'],array['立','诚','守','正','新','民'],array['朱','杨','韩','曹','沈'],1916);
select seed_realistic_clan('INIT-ZHAO-TIANSUI','天水赵氏宗族','赵','琴鹤堂','天水郡','甘肃省天水市秦州区',array['甘肃省天水市秦州区','河南省开封市祥符区','浙江省杭州市临平区','上海市浦东新区'],array['秦州祖支','汴梁支','江南支'],array['河南省开封市祥符区','浙江省杭州市临平区','上海市浦东新区'],array['守','先','培','厚','德'],array['光','裕','荣','华','昌','盛'],array['钱','宋','方','唐','顾'],1918);

drop function seed_realistic_clan(text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],int);
