-- Rich demo data for genealogy MVP1.
-- This migration intentionally seeds complete, realistic data for local demo and UI validation.

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
    created_by bigint,
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
    created_by bigint,
    created_at timestamp not null default now()
);

create table if not exists operation_log (
    id bigserial primary key,
    clan_id bigint,
    operator_id bigint,
    operation_type varchar(100) not null,
    target_type varchar(50),
    target_id bigint,
    operation_summary varchar(500),
    request_ip varchar(64),
    user_agent varchar(500),
    created_at timestamp not null default now()
);

create index if not exists idx_generation_scheme_clan on generation_scheme(clan_id);
create index if not exists idx_generation_word_scheme on generation_word(scheme_id);
create index if not exists idx_source_clan on source(clan_id);
create index if not exists idx_source_binding_target on source_binding(target_type, target_id);
create index if not exists idx_operation_log_clan on operation_log(clan_id);

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
    v_clan_id bigint;
    v_branch_a_id bigint;
    v_branch_b_id bigint;
    v_scheme_id bigint;
    v_source_book_id bigint;
    v_source_oral_id bigint;
    v_person_id bigint;
    v_rel_id bigint;
    v_line_a_ids bigint[] := array[]::bigint[];
    v_line_b_ids bigint[] := array[]::bigint[];
    v_spouse_a_ids bigint[] := array[]::bigint[];
    v_spouse_b_ids bigint[] := array[]::bigint[];
    v_generation_count int := array_length(p_words, 1);
    v_family_generation_count int := array_length(p_spouse_a_names, 1);
    g int;
    v_birth_year int;
    v_is_living boolean;
    v_death_date date;
    v_tomb_place text;
    v_epitaph text;
    v_person_code text;
    v_branch_label text;
    v_branch_to text;
begin
    if exists (select 1 from clan where clan_code = p_clan_code) then
        return;
    end if;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        description, status, created_by, created_at, updated_at
    ) values (
        p_clan_code, p_clan_name, p_surname, p_hall_name, p_commandery, p_origin_place,
        p_clan_name || '演示宗族，包含两条支派、七代字辈、十二个三人以上家庭，数据用于首页统计、人物档案、建谱向导和世系图谱联调。',
        'active', 1, now(), now()
    ) returning id into v_clan_id;

    insert into branch (
        clan_id, parent_id, branch_name, branch_path, level, sort_order,
        migration_from, migration_to, description, status, created_at, updated_at
    ) values (
        v_clan_id, null, p_branch_a_name, '/' || p_branch_a_name, 1, 1,
        p_origin_place, p_branch_a_to,
        p_branch_a_name || '为' || p_clan_name || '演示长支，连续维护七代人物与配偶资料。',
        'active', now(), now()
    ) returning id into v_branch_a_id;

    insert into branch (
        clan_id, parent_id, branch_name, branch_path, level, sort_order,
        migration_from, migration_to, description, status, created_at, updated_at
    ) values (
        v_clan_id, null, p_branch_b_name, '/' || p_branch_b_name, 1, 2,
        p_origin_place, p_branch_b_to,
        p_branch_b_name || '为' || p_clan_name || '演示二支，连续维护七代人物与配偶资料。',
        'active', now(), now()
    ) returning id into v_branch_b_id;

    insert into generation_scheme (
        clan_id, branch_id, scheme_name, poem_text, start_generation,
        is_default, validation_enabled, strict_mode, status, created_at
    ) values (
        v_clan_id, null, p_clan_name || '统一字辈方案', array_to_string(p_words, ''),
        1, true, true, false, 'active', now()
    ) returning id into v_scheme_id;

    for g in 1..v_generation_count loop
        insert into generation_word (
            scheme_id, generation_no, word, description, sort_order
        ) values (
            v_scheme_id, g, p_words[g], p_clan_name || '第' || g || '代字辈：' || p_words[g], g
        );
    end loop;

    for g in 1..v_generation_count loop
        v_birth_year := p_base_year + (g - 1) * 24;
        v_is_living := g >= 4;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 76, 9, 18) end;
        v_tomb_place := case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_a_to || '祖茔' end;
        v_epitaph := case when v_is_living then '在世人员，暂未立墓志；已完成生平、职业、居住地和来源记录。' else p_line_a_names[g] || '墓志记载其修身齐家、敦亲睦族，支派后裔绵延。' end;
        v_person_code := p_clan_code || '-A-' || lpad(g::text, 2, '0');

        insert into person (
            clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name,
            gender, generation_no, generation_word, rank_in_family,
            birth_date, birth_date_precision, death_date, death_date_precision, is_living,
            birth_place, residence_place, occupation, education, title_or_honor,
            biography, tomb_place, epitaph, has_descendant, lineage_status,
            privacy_level, data_status, created_by, created_at, updated_by, updated_at
        ) values (
            v_clan_id, v_branch_a_id, v_person_code, p_line_a_names[g], p_line_a_names[g],
            p_words[g] || '字' || right(p_line_a_names[g], 1), p_branch_a_name || p_words[g] || '辈代表人物',
            'male', g, p_words[g], p_branch_a_name || '第' || g || '世',
            make_date(v_birth_year, 3, 12), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living,
            p_origin_place, p_branch_a_to,
            case when g <= 2 then '族务管事' when g = 3 then '乡校教师' when g = 4 then '工程技术人员' when g = 5 then '企业管理人员' else '学生 / 青年族人' end,
            case when g <= 2 then '私塾' when g = 3 then '师范' when g = 4 then '本科' else '本科在读' end,
            case when g <= 3 then '修谱有功' else '支派资料维护人' end,
            p_line_a_names[g] || '，' || p_clan_name || p_branch_a_name || '第' || g || '世，字辈为“' || p_words[g] || '”。资料记录了出生地、居住地、教育、职业、来源与世系状态，可用于人物档案完整度演示。',
            v_tomb_place, v_epitaph, g < v_generation_count, 'normal',
            case when g >= 5 then 'branch_only' else 'clan_only' end,
            'official', 1, now(), 1, now()
        ) returning id into v_person_id;
        v_line_a_ids := array_append(v_line_a_ids, v_person_id);

        v_birth_year := p_base_year + (g - 1) * 24 + 1;
        v_is_living := g >= 4;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 74, 10, 21) end;
        v_tomb_place := case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_b_to || '祖茔' end;
        v_epitaph := case when v_is_living then '在世人员，暂未立墓志；已完成生平、职业、居住地和来源记录。' else p_line_b_names[g] || '墓志记载其勤俭持家、重视宗族教育。' end;
        v_person_code := p_clan_code || '-B-' || lpad(g::text, 2, '0');

        insert into person (
            clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name,
            gender, generation_no, generation_word, rank_in_family,
            birth_date, birth_date_precision, death_date, death_date_precision, is_living,
            birth_place, residence_place, occupation, education, title_or_honor,
            biography, tomb_place, epitaph, has_descendant, lineage_status,
            privacy_level, data_status, created_by, created_at, updated_by, updated_at
        ) values (
            v_clan_id, v_branch_b_id, v_person_code, p_line_b_names[g], p_line_b_names[g],
            p_words[g] || '字' || right(p_line_b_names[g], 1), p_branch_b_name || p_words[g] || '辈代表人物',
            'male', g, p_words[g], p_branch_b_name || '第' || g || '世',
            make_date(v_birth_year, 6, 16), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living,
            p_origin_place, p_branch_b_to,
            case when g <= 2 then '族田经营' when g = 3 then '乡村医生' when g = 4 then '教师' when g = 5 then '软件工程师' else '学生 / 青年族人' end,
            case when g <= 2 then '私塾' when g = 3 then '中专' when g = 4 then '本科' else '本科在读' end,
            case when g <= 3 then '支派贤达' else '宗族数字化志愿者' end,
            p_line_b_names[g] || '，' || p_clan_name || p_branch_b_name || '第' || g || '世，字辈为“' || p_words[g] || '”。资料记录了出生地、居住地、教育、职业、来源与世系状态，可用于人物档案完整度演示。',
            v_tomb_place, v_epitaph, g < v_generation_count, 'normal',
            case when g >= 5 then 'branch_only' else 'clan_only' end,
            'official', 1, now(), 1, now()
        ) returning id into v_person_id;
        v_line_b_ids := array_append(v_line_b_ids, v_person_id);
    end loop;

    for g in 1..v_family_generation_count loop
        v_birth_year := p_base_year + (g - 1) * 24 + 2;
        v_is_living := g >= 4;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 73, 11, 8) end;
        v_tomb_place := case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_a_to || '合葬墓区' end;
        v_epitaph := case when v_is_living then '在世人员，已记录家庭关系、居住地和来源信息。' else p_spouse_a_names[g] || '墓志记载其持家有方、教子有成。' end;
        v_person_code := p_clan_code || '-A-S' || lpad(g::text, 2, '0');

        insert into person (
            clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name,
            gender, generation_no, generation_word, rank_in_family,
            birth_date, birth_date_precision, death_date, death_date_precision, is_living,
            birth_place, residence_place, occupation, education, title_or_honor,
            biography, tomb_place, epitaph, has_descendant, lineage_status,
            privacy_level, data_status, created_by, created_at, updated_by, updated_at
        ) values (
            v_clan_id, v_branch_a_id, v_person_code, p_spouse_a_names[g], p_spouse_a_names[g],
            p_words[g] || '配', p_branch_a_name || '第' || g || '世配偶',
            'female', g, p_words[g], '配偶',
            make_date(v_birth_year, 4, 9), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living,
            p_origin_place, p_branch_a_to,
            case when g <= 2 then '持家治业' when g = 3 then '乡村教师' when g = 4 then '医护人员' when g = 5 then '财务管理' else '青年族人' end,
            case when g <= 2 then '家学' when g = 3 then '中专' else '本科' end,
            '家风传承记录人',
            p_spouse_a_names[g] || '，' || p_clan_name || p_branch_a_name || '第' || g || '世配偶，资料包含婚配、子嗣、来源和居住地信息。',
            v_tomb_place, v_epitaph, true, 'normal',
            case when g >= 5 then 'branch_only' else 'clan_only' end,
            'official', 1, now(), 1, now()
        ) returning id into v_person_id;
        v_spouse_a_ids := array_append(v_spouse_a_ids, v_person_id);

        v_birth_year := p_base_year + (g - 1) * 24 + 3;
        v_is_living := g >= 4;
        v_death_date := case when v_is_living then null else make_date(v_birth_year + 72, 12, 6) end;
        v_tomb_place := case when v_is_living then '在世人员暂未维护墓葬地' else p_branch_b_to || '合葬墓区' end;
        v_epitaph := case when v_is_living then '在世人员，已记录家庭关系、居住地和来源信息。' else p_spouse_b_names[g] || '墓志记载其和睦宗亲、抚育后人。' end;
        v_person_code := p_clan_code || '-B-S' || lpad(g::text, 2, '0');

        insert into person (
            clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name,
            gender, generation_no, generation_word, rank_in_family,
            birth_date, birth_date_precision, death_date, death_date_precision, is_living,
            birth_place, residence_place, occupation, education, title_or_honor,
            biography, tomb_place, epitaph, has_descendant, lineage_status,
            privacy_level, data_status, created_by, created_at, updated_by, updated_at
        ) values (
            v_clan_id, v_branch_b_id, v_person_code, p_spouse_b_names[g], p_spouse_b_names[g],
            p_words[g] || '配', p_branch_b_name || '第' || g || '世配偶',
            'female', g, p_words[g], '配偶',
            make_date(v_birth_year, 7, 11), 'day', v_death_date, case when v_death_date is null then 'unknown' else 'day' end, v_is_living,
            p_origin_place, p_branch_b_to,
            case when g <= 2 then '持家治业' when g = 3 then '医护人员' when g = 4 then '教师' when g = 5 then '行政管理' else '青年族人' end,
            case when g <= 2 then '家学' when g = 3 then '中专' else '本科' end,
            '家风传承记录人',
            p_spouse_b_names[g] || '，' || p_clan_name || p_branch_b_name || '第' || g || '世配偶，资料包含婚配、子嗣、来源和居住地信息。',
            v_tomb_place, v_epitaph, true, 'normal',
            case when g >= 5 then 'branch_only' else 'clan_only' end,
            'official', 1, now(), 1, now()
        ) returning id into v_person_id;
        v_spouse_b_ids := array_append(v_spouse_b_ids, v_person_id);
    end loop;

    for g in 1..v_family_generation_count loop
        insert into relationship (
            clan_id, from_person_id, to_person_id, relation_type, relation_label,
            is_lineage_relation, is_biological, is_primary, description,
            confidence_level, data_status, created_by, created_at, updated_at
        ) values (
            v_clan_id, v_line_a_ids[g], v_spouse_a_ids[g], 'spouse', 'spouse',
            false, false, true, p_line_a_names[g] || '与' || p_spouse_a_names[g] || '婚配关系。',
            'high', 'official', 1, now(), now()
        ) returning id into v_rel_id;

        insert into relationship (
            clan_id, from_person_id, to_person_id, relation_type, relation_label,
            is_lineage_relation, is_biological, is_primary, description,
            confidence_level, data_status, created_by, created_at, updated_at
        ) values (
            v_clan_id, v_line_b_ids[g], v_spouse_b_ids[g], 'spouse', 'spouse',
            false, false, true, p_line_b_names[g] || '与' || p_spouse_b_names[g] || '婚配关系。',
            'high', 'official', 1, now(), now()
        );

        insert into relationship (
            clan_id, from_person_id, to_person_id, relation_type, relation_label,
            is_lineage_relation, is_biological, is_primary, description,
            confidence_level, data_status, created_by, created_at, updated_at
        ) values (
            v_clan_id, v_line_a_ids[g], v_line_a_ids[g + 1], 'parent_child', 'father',
            true, true, true, p_line_a_names[g] || '为' || p_line_a_names[g + 1] || '之父。',
            'high', 'official', 1, now(), now()
        );

        insert into relationship (
            clan_id, from_person_id, to_person_id, relation_type, relation_label,
            is_lineage_relation, is_biological, is_primary, description,
            confidence_level, data_status, created_by, created_at, updated_at
        ) values (
            v_clan_id, v_spouse_a_ids[g], v_line_a_ids[g + 1], 'parent_child', 'mother',
            true, true, true, p_spouse_a_names[g] || '为' || p_line_a_names[g + 1] || '之母。',
            'high', 'official', 1, now(), now()
        );

        insert into relationship (
            clan_id, from_person_id, to_person_id, relation_type, relation_label,
            is_lineage_relation, is_biological, is_primary, description,
            confidence_level, data_status, created_by, created_at, updated_at
        ) values (
            v_clan_id, v_line_b_ids[g], v_line_b_ids[g + 1], 'parent_child', 'father',
            true, true, true, p_line_b_names[g] || '为' || p_line_b_names[g + 1] || '之父。',
            'high', 'official', 1, now(), now()
        );

        insert into relationship (
            clan_id, from_person_id, to_person_id, relation_type, relation_label,
            is_lineage_relation, is_biological, is_primary, description,
            confidence_level, data_status, created_by, created_at, updated_at
        ) values (
            v_clan_id, v_spouse_b_ids[g], v_line_b_ids[g + 1], 'parent_child', 'mother',
            true, true, true, p_spouse_b_names[g] || '为' || p_line_b_names[g + 1] || '之母。',
            'high', 'official', 1, now(), now()
        );
    end loop;

    update branch set founder_person_id = v_line_a_ids[1], updated_at = now() where id = v_branch_a_id;
    update branch set founder_person_id = v_line_b_ids[1], updated_at = now() where id = v_branch_b_id;
    update clan set ancestor_person_id = v_line_a_ids[1], updated_at = now() where id = v_clan_id;

    insert into source (
        clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no,
        excerpt, verification_status, description, created_by, created_at
    ) values (
        v_clan_id, p_clan_name || '演示族谱原文', 'genealogy_book', '修谱委员会',
        p_clan_name || '七代世系演示谱', '卷一', '1-36',
        p_clan_name || '两支七代人物、配偶、亲子关系均据演示族谱原文录入。',
        'verified', '用于人物档案、来源资料库、世系图谱和审核演示的族谱原文来源。', 1, now()
    ) returning id into v_source_book_id;

    insert into source (
        clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no,
        excerpt, verification_status, description, created_by, created_at
    ) values (
        v_clan_id, p_clan_name || '支派口述访谈', 'oral_record', '支派负责人',
        p_clan_name || '口述资料汇编', '访谈记录', '1-18',
        p_clan_name || '支派负责人补充迁徙、居住地、职业、教育和家庭成员信息。',
        'verified', '用于补充人物完整信息和家庭关系说明。', 1, now()
    ) returning id into v_source_oral_id;

    insert into source_binding (
        clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at
    )
    select v_clan_id, v_source_book_id, 'person', p.id,
           '演示族谱原文记录人物基础信息',
           p.name || '的姓名、字辈、世次、支派和生卒信息据族谱原文录入。',
           1, now()
    from person p
    where p.clan_id = v_clan_id;

    insert into source_binding (
        clan_id, source_id, target_type, target_id, binding_reason, excerpt, created_by, created_at
    )
    select v_clan_id, v_source_oral_id, 'relationship', r.id,
           '支派口述访谈确认家庭关系',
           '关系由支派负责人访谈确认，并与族谱原文互相印证。',
           1, now()
    from relationship r
    where r.clan_id = v_clan_id;

    insert into operation_log (
        clan_id, operator_id, operation_type, target_type, target_id,
        operation_summary, request_ip, user_agent, created_at
    ) values
        (v_clan_id, 1, 'DEMO_SEED_CLAN', 'clan', v_clan_id, '预置演示宗族：' || p_clan_name, '127.0.0.1', 'flyway-demo-seed', now()),
        (v_clan_id, 1, 'DEMO_SEED_BRANCH', 'branch', v_branch_a_id, '预置演示支派：' || p_branch_a_name, '127.0.0.1', 'flyway-demo-seed', now()),
        (v_clan_id, 1, 'DEMO_SEED_BRANCH', 'branch', v_branch_b_id, '预置演示支派：' || p_branch_b_name, '127.0.0.1', 'flyway-demo-seed', now()),
        (v_clan_id, 1, 'DEMO_SEED_PERSON', 'person', v_line_a_ids[1], '预置七代人物与家庭关系数据', '127.0.0.1', 'flyway-demo-seed', now()),
        (v_clan_id, 1, 'DEMO_SEED_SOURCE', 'source', v_source_book_id, '预置族谱来源与人物绑定', '127.0.0.1', 'flyway-demo-seed', now());
end;
$$ language plpgsql;

select seed_demo_clan(
    'DEMO-ZHANG-HUAIYANG',
    '淮阳张氏宗族',
    '张',
    '百忍堂',
    '清河郡',
    '河南省周口市淮阳区',
    '长房东支',
    '二房西支',
    '安徽省合肥市肥西县',
    '江苏省苏州市吴中区',
    array['明','承','德','宏','家','业','昌'],
    array['张明远','张承志','张德安','张宏毅','张家瑞','张业宁','张昌泰'],
    array['张明德','张承礼','张德华','张宏文','张家诚','张业航','张昌泽'],
    array['王雅兰','李淑芳','陈慧敏','周婉清','郑思雨','黄若琳'],
    array['刘素琴','赵秀梅','孙丽君','吴静怡','林晓月','何雨欣'],
    1865
);

select seed_demo_clan(
    'DEMO-LI-LONGXI',
    '陇西李氏宗族',
    '李',
    '陇西堂',
    '陇西郡',
    '甘肃省定西市陇西县',
    '南迁长支',
    '北望二支',
    '湖北省武汉市黄陂区',
    '陕西省西安市长安区',
    array['世','泽','长','荣','启','瑞','祥'],
    array['李世安','李泽民','李长青','李荣轩','李启明','李瑞霖','李祥宇'],
    array['李世昌','李泽华','李长林','李荣泽','李启航','李瑞峰','李祥宁'],
    array['周秀英','郑芳华','王静雯','赵婉婷','陈诗涵','许梦瑶'],
    array['马桂兰','罗春梅','刘慧娟','孙雅琪','林雨婷','高欣怡'],
    1870
);

drop function seed_demo_clan(
    text, text, text, text, text, text,
    text, text, text, text,
    text[], text[], text[], text[], text[], int
);
