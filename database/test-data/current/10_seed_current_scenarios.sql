\set ON_ERROR_STOP on

begin;
select pg_advisory_xact_lock(hashtext('genealogy-current-scenario-seed'));

do $$
declare
    u_admin bigint;
    u_branch bigint;
    u_editor bigint;
    u_reviewer bigint;
    u_viewer bigint;
    role_admin bigint;
    role_branch bigint;
    role_editor bigint;
    role_reviewer bigint;
    role_viewer bigint;

    clan_a bigint;
    clan_b bigint;
    br_root bigint;
    br_long bigint;
    br_second bigint;
    br_overseas bigint;
    br_long_east bigint;
    br_adoption bigint;
    br_b_root bigint;
    br_b_child bigint;

    p_ancestor bigint;
    p_wife bigint;
    p_long bigint;
    p_long_wife bigint;
    p_second bigint;
    p_second_wife bigint;
    p_grandson bigint;
    p_first_wife bigint;
    p_second_wife2 bigint;
    p_bio_father bigint;
    p_adopted bigint;
    p_dual bigint;
    p_private bigint;
    p_unknown bigint;
    p_draft bigint;
    p_b_ancestor bigint;
    p_b_desc bigint;

    rel_blood bigint;
    rel_adoption bigint;
    scheme_id bigint;
    source_book bigint;
    source_chronicle bigint;
    source_oral bigint;
    source_photo bigint;
    revision_ok bigint;
    revision_pending bigint;
    revision_rejected bigint;
    import_id bigint;
    membership_id bigint;
    branch_membership_id bigint;
    branch_role_id bigint;
    culture_id bigint;
    migration_id bigint;
    site_id bigint;
begin
    select id into u_admin from app_user where username = 'demo_admin' and deleted_at is null;
    select id into u_branch from app_user where username = 'demo_branch_admin' and deleted_at is null;
    select id into u_editor from app_user where username = 'demo_editor' and deleted_at is null;
    select id into u_reviewer from app_user where username = 'demo_reviewer' and deleted_at is null;
    select id into u_viewer from app_user where username = 'demo_viewer' and deleted_at is null;

    select id into role_admin from app_role where role_code = 'clan_admin';
    select id into role_branch from app_role where role_code = 'branch_admin';
    select id into role_editor from app_role where role_code = 'editor';
    select id into role_reviewer from app_role where role_code = 'reviewer';
    select id into role_viewer from app_role where role_code = 'viewer';

    if u_admin is null or u_branch is null or u_editor is null or u_reviewer is null or u_viewer is null then
        raise exception 'Required demo users are missing; run all Flyway migrations first';
    end if;
    if role_admin is null or role_branch is null or role_editor is null or role_reviewer is null or role_viewer is null then
        raise exception 'Required roles are missing; run all Flyway migrations first';
    end if;

    insert into clan (clan_code, clan_name, surname, hall_name, commandery, origin_place, current_places, description, status, created_by, created_at, updated_at)
    values ('SCN-ZHANG-CURRENT', '当前模型场景张氏宗族', '张', '百忍堂', '清河郡', '河南省周口市',
            '["河南省周口市","湖南省长沙市","广东省广州市","加拿大多伦多"]'::jsonb,
            '当前已实现代码的全场景测试宗族。', 'active', u_admin, now() - interval '300 days', now())
    returning id into clan_a;

    insert into clan (clan_code, clan_name, surname, hall_name, commandery, origin_place, current_places, description, status, created_by, created_at, updated_at)
    values ('SCN-LI-ISOLATION', '当前模型隔离李氏宗族', '李', '敦本堂', '陇西郡', '甘肃省陇西县',
            '["甘肃省陇西县","广东省佛山市"]'::jsonb,
            '用于跨宗族隔离和同名人物测试。', 'active', u_admin, now() - interval '240 days', now())
    returning id into clan_b;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_a, null, '中原总支', '/中原总支', 1, 10, '河南省周口市', '湖南省长沙市', '宗族主支。', 'active', now() - interval '280 days', now()) returning id into br_root;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_a, br_root, '长房', '/中原总支/长房', 2, 10, '湖南省长沙市', '湖南省长沙市开福区', '长房。', 'active', now() - interval '260 days', now()) returning id into br_long;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_a, br_root, '二房', '/中原总支/二房', 2, 20, '湖南省长沙市', '广东省广州市', '二房。', 'active', now() - interval '255 days', now()) returning id into br_second;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_a, null, '海外支', '/海外支', 1, 30, '广东省广州市', '加拿大多伦多', '直属宗族的海外支。', 'active', now() - interval '180 days', now()) returning id into br_overseas;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_a, br_long, '长房东分房', '/中原总支/长房/东分房', 3, 10, '湖南省长沙市', '湖南省长沙市开福区', '兄弟分房场景。', 'active', now() - interval '150 days', now()) returning id into br_long_east;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_a, br_second, '二房继嗣房', '/中原总支/二房/继嗣房', 3, 10, '广东省广州市', '广东省佛山市', '继嗣、承祧和兼祧场景。', 'active', now() - interval '120 days', now()) returning id into br_adoption;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_b, null, '岭南支', '/岭南支', 1, 10, '甘肃省陇西县', '广东省佛山市', '隔离宗族主支。', 'active', now() - interval '210 days', now()) returning id into br_b_root;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (clan_b, br_b_root, '广府房', '/岭南支/广府房', 2, 10, '广东省佛山市', '广东省广州市', '隔离宗族子房。', 'active', now() - interval '190 days', now()) returning id into br_b_child;

    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_root, 'SCN-Z-001', '张明远', '张明远', '字慎修', '中原始迁祖', 'male', 1, '明', '始祖', date '1880-03-12', 'day', date '1958-09-18', 'day', false, '河南省周口市', '湖南省长沙市', '商绅', '私塾', '始迁祖', '由中原迁居长沙。', '长沙祖茔', '敦亲睦族。', true, 'normal', 'public', 'official', u_admin, now() - interval '270 days', u_admin, now()) returning id into p_ancestor;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_root, 'SCN-Z-002', '王静贞', '王氏', 'female', 1, '明', '元配', date '1884-05-06', 'day', date '1961-02-03', 'day', false, '河南省周口市', '湖南省长沙市', '家庭经营', '始迁祖元配。', true, 'normal', 'clan_only', 'official', u_admin, now() - interval '269 days', u_admin, now()) returning id into p_wife;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long, 'SCN-Z-003', '张承德', '张承德', '字厚生', 'male', 2, '承', '长子', date '1908-01-16', 'day', date '1988-06-20', 'day', false, '湖南省长沙市', '湖南省长沙市', '教师', '长房开房人物。', true, 'normal', 'public', 'official', u_admin, now() - interval '250 days', u_admin, now()) returning id into p_long;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long, 'SCN-Z-004', '李淑兰', '李氏', 'female', 2, '承', '元配', date '1912-08-09', 'day', date '1994-04-01', 'day', false, '湖南省湘潭市', '湖南省长沙市', '医务人员', '长房家风记录人。', true, 'normal', 'clan_only', 'official', u_admin, now() - interval '249 days', u_admin, now()) returning id into p_long_wife;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_second, 'SCN-Z-005', '张承礼', '张承礼', '字敬之', 'male', 2, '承', '次子', date '1911-11-02', 'day', date '1990-01-10', 'day', false, '湖南省长沙市', '广东省广州市', '商人', '二房开房人物。', true, 'normal', 'public', 'official', u_admin, now() - interval '248 days', u_admin, now()) returning id into p_second;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_second, 'SCN-Z-006', '陈慧芳', '陈氏', 'female', 2, '承', '元配', date '1915-07-14', 'day', date '1997-10-08', 'day', false, '广东省韶关市', '广东省广州市', '家庭经营', '二房家庭资料整理人。', true, 'normal', 'clan_only', 'official', u_admin, now() - interval '247 days', u_admin, now()) returning id into p_second_wife;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long_east, 'SCN-Z-007', '张启文', '张启文', 'male', 3, '启', '长孙', date '1935-02-21', 'day', date '2011-03-18', 'day', false, '湖南省长沙市', '湖南省长沙市', '工程师', '长房东分房开创人物。', true, 'normal', 'public', 'official', u_admin, now() - interval '220 days', u_admin, now()) returning id into p_grandson;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long_east, 'SCN-Z-008', '赵雅兰', '赵氏', 'female', 3, '启', '元配', date '1938-06-11', 'day', date '1978-12-02', 'day', false, '湖南省长沙县', '湖南省长沙市', '教师', '元配。', true, 'normal', 'clan_only', 'official', u_admin, now() - interval '219 days', u_admin, now()) returning id into p_first_wife;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long_east, 'SCN-Z-009', '刘慧芳', '刘氏', 'female', 3, '启', '继配', date '1945-03-08', 'day', true, '湖南省宁乡市', '湖南省长沙市', '会计', '继配，在世人员。', true, 'normal', 'branch_only', 'official', u_admin, now() - interval '218 days', u_admin, now()) returning id into p_second_wife2;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_overseas, 'SCN-Z-010', '张启海', '张启海', 'male', 3, '启', '海外支三世', date '1942-04-07', 'day', true, '广东省广州市', '加拿大多伦多', '餐饮经营', '入继人物生父。', true, 'normal', 'branch_only', 'official', u_admin, now() - interval '210 days', u_admin, now()) returning id into p_bio_father;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_adoption, 'SCN-Z-011', '张俊安', '张俊安', 'male', 4, '俊', '入继子', date '1968-05-19', 'day', true, '加拿大多伦多', '广东省佛山市', '企业管理', '保留生物关系，同时建立入继和出嗣关系。', true, 'adopted', 'branch_only', 'official', u_admin, now() - interval '180 days', u_admin, now()) returning id into p_adopted;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long_east, 'SCN-Z-012', '张俊宁', '张俊宁', 'male', 4, '俊', '兼祧子', date '1972-10-23', 'day', true, '湖南省长沙市', '湖南省长沙市', '医生', '兼祧长房与二房继嗣房。', true, 'dual_successor', 'relatives_only', 'official', u_admin, now() - interval '175 days', u_admin, now()) returning id into p_dual;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long_east, 'SCN-Z-013', '张泽宇', '张泽宇', 'male', 5, '泽', '五世长子', date '2001-02-14', 'day', true, '湖南省长沙市', '湖南省长沙市', '软件工程师', '在世敏感人物。', false, 'normal', 'private', 'official', u_admin, now() - interval '120 days', u_admin, now()) returning id into p_private;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date_precision, is_living, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_overseas, 'SCN-Z-014', '张泽清', '张泽清', 'female', 5, '泽', '父母待考', 'unknown', true, '加拿大多伦多', '学生', '未知父母和未知出生日期。', false, 'unknown', 'sealed', 'official', u_admin, now() - interval '100 days', u_admin, now()) returning id into p_unknown;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, is_living, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_a, br_long, 'SCN-Z-015', '张泽新', '张泽新', 'male', 5, '泽', true, '湖南省长沙市', '学生', '人物草稿。', false, 'normal', 'branch_only', 'draft', u_editor, now() - interval '10 days', u_editor, now()) returning id into p_draft;

    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_b, br_b_root, 'SCN-L-001', '李敦本', '李敦本', 'male', 1, '敦', date '1900-01-01', 'year', date '1978-01-01', 'year', false, '甘肃省陇西县', '广东省佛山市', '商人', '隔离宗族始迁祖。', true, 'normal', 'public', 'official', u_admin, now() - interval '205 days', u_admin, now()) returning id into p_b_ancestor;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (clan_b, br_b_child, 'SCN-L-002', '李泽宇', '李泽宇', 'male', 2, '本', date '1930-01-01', 'year', true, '广东省佛山市', '广东省广州市', '教师', '跨宗族同名人物。', true, 'normal', 'clan_only', 'official', u_admin, now() - interval '190 days', u_admin, now()) returning id into p_b_desc;

    update clan set ancestor_person_id = p_ancestor where id = clan_a;
    update clan set ancestor_person_id = p_b_ancestor where id = clan_b;
    update branch set founder_person_id = p_ancestor where id = br_root;
    update branch set founder_person_id = p_long where id = br_long;
    update branch set founder_person_id = p_second where id = br_second;
    update branch set founder_person_id = p_bio_father where id = br_overseas;
    update branch set founder_person_id = p_grandson where id = br_long_east;
    update branch set founder_person_id = p_adopted where id = br_adoption;
    update branch set founder_person_id = p_b_ancestor where id = br_b_root;

    -- Spouse relationships are stored in both directions by the current service.
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values
      (clan_a, p_ancestor, p_wife, 'spouse', 'spouse', 'marriage', false, false, true, '元配。', 'high', 'official', u_admin, now() - interval '250 days', now()),
      (clan_a, p_wife, p_ancestor, 'spouse', 'spouse', 'marriage', false, false, false, '反向配偶。', 'high', 'official', u_admin, now() - interval '250 days', now()),
      (clan_a, p_long, p_long_wife, 'spouse', 'spouse', 'marriage', false, false, true, '元配。', 'high', 'official', u_admin, now() - interval '220 days', now()),
      (clan_a, p_long_wife, p_long, 'spouse', 'spouse', 'marriage', false, false, false, '反向配偶。', 'high', 'official', u_admin, now() - interval '220 days', now()),
      (clan_a, p_second, p_second_wife, 'spouse', 'spouse', 'marriage', false, false, true, '元配。', 'high', 'official', u_admin, now() - interval '218 days', now()),
      (clan_a, p_second_wife, p_second, 'spouse', 'spouse', 'marriage', false, false, false, '反向配偶。', 'high', 'official', u_admin, now() - interval '218 days', now()),
      (clan_a, p_grandson, p_first_wife, 'spouse', 'spouse', 'marriage', false, false, true, '元配。', 'high', 'official', u_admin, now() - interval '190 days', now()),
      (clan_a, p_first_wife, p_grandson, 'spouse', 'spouse', 'marriage', false, false, false, '反向配偶。', 'high', 'official', u_admin, now() - interval '190 days', now()),
      (clan_a, p_grandson, p_second_wife2, 'spouse', 'second_spouse', 'marriage', false, false, true, '继配。', 'medium', 'official', u_admin, now() - interval '160 days', now()),
      (clan_a, p_second_wife2, p_grandson, 'spouse', 'second_spouse', 'marriage', false, false, false, '继配反向关系。', 'medium', 'official', u_admin, now() - interval '160 days', now());

    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values (clan_a, p_ancestor, p_long, 'parent_child', 'biological_father', 'blood', true, true, true, '生父。', 'high', 'official', u_admin, now() - interval '230 days', now())
    returning id into rel_blood;
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values
      (clan_a, p_wife, p_long, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母。', 'high', 'official', u_admin, now() - interval '230 days', now()),
      (clan_a, p_ancestor, p_second, 'parent_child', 'biological_father', 'blood', true, true, true, '生父。', 'high', 'official', u_admin, now() - interval '228 days', now()),
      (clan_a, p_wife, p_second, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母。', 'high', 'official', u_admin, now() - interval '228 days', now()),
      (clan_a, p_long, p_grandson, 'parent_child', 'biological_father', 'blood', true, true, true, '生父。', 'high', 'official', u_admin, now() - interval '200 days', now()),
      (clan_a, p_long_wife, p_grandson, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母。', 'high', 'official', u_admin, now() - interval '200 days', now()),
      (clan_a, p_grandson, p_private, 'parent_child', 'biological_father', 'blood', true, true, true, '生父。', 'high', 'official', u_admin, now() - interval '110 days', now()),
      (clan_a, p_second_wife2, p_private, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母。', 'high', 'official', u_admin, now() - interval '110 days', now()),
      (clan_a, p_bio_father, p_adopted, 'parent_child', 'biological_father', 'blood', true, true, true, '保留生物亲子。', 'high', 'official', u_admin, now() - interval '170 days', now()),
      (clan_b, p_b_ancestor, p_b_desc, 'parent_child', 'biological_father', 'blood', true, true, true, '隔离宗族亲子。', 'high', 'official', u_admin, now() - interval '180 days', now());

    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, ritual_relation_type, succession_reason, successor_branch_id, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values (clan_a, p_second, p_adopted, 'in_adoption', 'legal_father', 'ritual', 'in_adoption', '二房无嗣，经族议入继。', br_adoption, true, false, true, '入继关系。', 'high', 'official', u_admin, now() - interval '150 days', now())
    returning id into rel_adoption;
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, ritual_relation_type, succession_reason, successor_branch_id, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values
      (clan_a, p_bio_father, p_adopted, 'out_adoption', 'out_adopted', 'ritual', 'out_adoption', '由海外支出嗣至二房。', br_adoption, false, false, false, '出嗣，不删除生物亲子。', 'high', 'official', u_admin, now() - interval '150 days', now()),
      (clan_a, p_second, p_adopted, 'successor', 'heir_successor', 'ritual', 'successor', '承祧二房。', br_adoption, true, false, true, '承祧关系。', 'high', 'official', u_admin, now() - interval '149 days', now()),
      (clan_a, p_grandson, p_dual, 'dual_successor', 'dual_successor', 'ritual', 'dual_successor', '兼祧长房与二房。', br_adoption, true, false, true, '兼祧关系。', 'medium', 'official', u_admin, now() - interval '140 days', now()),
      (clan_a, p_second, p_dual, 'heir_son', 'heir_son', 'ritual', 'heir_son', '以张俊宁为嗣子。', br_adoption, true, false, false, '嗣子关系。', 'medium', 'official', u_admin, now() - interval '139 days', now()),
      (clan_a, p_second, p_second_wife, 'no_descendant', 'no_descendant', 'status', 'no_descendant', '二房无亲生子女。', br_second, false, false, true, '无嗣状态。', 'high', 'official', u_admin, now() - interval '138 days', now());

    insert into generation_scheme (clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
    values (clan_a, null, '张氏默认字辈', '明承启俊泽 守正继家声', 1, true, true, false, 'active', now() - interval '230 days') returning id into scheme_id;
    insert into generation_word (scheme_id, generation_no, word, description, sort_order)
    values
      (scheme_id, 1, '明', '第一世', 1),
      (scheme_id, 2, '承', '第二世', 2),
      (scheme_id, 3, '启', '第三世', 3),
      (scheme_id, 4, '俊', '第四世', 4),
      (scheme_id, 5, '泽', '第五世', 5),
      (scheme_id, 6, '守', '第六世续派', 6);

    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (clan_a, '张氏老谱影印本', 'genealogy_book', '宗族理事会', '百忍堂张氏族谱', '卷一', '1-86', '民国二十六年', '始迁祖、支派、字辈和主要人物。', 'verified', '核心谱书来源。', 'high', 'clan_only', 'normal', u_admin, now() - interval '200 days', now()) returning id into source_book;
    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (clan_a, '长沙地方志迁徙条目', 'local_chronicle', '地方志办公室', '长沙地方志', '姓氏卷', '112-118', '1998', '周口迁入长沙。', 'verified', '迁徙路线来源。', 'high', 'public', 'normal', u_admin, now() - interval '180 days', now()) returning id into source_chronicle;
    insert into source (clan_id, source_name, source_type, provider_name, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (clan_a, '二房继嗣口述访谈', 'oral_record', '张氏族老', '2025-10-02', '张俊安入继、出嗣与承祧过程。', 'pending_review', '宗法敏感资料。', 'medium', 'private', 'highly_sensitive', u_editor, now() - interval '90 days', now()) returning id into source_oral;
    insert into source (clan_id, source_name, source_type, provider_name, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (clan_a, '百忍堂宗祠照片', 'photo', '数字化志愿者', '2026-01-18', '宗祠正门和匾额。', 'draft', '文化场所图片草稿。', 'medium', 'clan_only', 'normal', u_editor, now() - interval '60 days', now()) returning id into source_photo;

    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
    values
      (clan_a, source_book, 'person', p_ancestor, '谱书记载始迁祖', '卷一始祖条。', 'high', 'active', u_admin, now() - interval '150 days', now()),
      (clan_a, source_book, 'relationship', rel_blood, '谱书记载亲子关系', '长房世系条。', 'high', 'active', u_admin, now() - interval '150 days', now()),
      (clan_a, source_chronicle, 'branch', br_root, '地方志记载迁徙', '周口迁长沙。', 'high', 'active', u_admin, now() - interval '140 days', now()),
      (clan_a, source_oral, 'relationship', rel_adoption, '族老访谈确认入继', '入继与出嗣经族议确认。', 'medium', 'pending_review', u_editor, now() - interval '80 days', now());

    insert into source_attachment (source_id, clan_id, original_filename, stored_filename, content_type, file_size, storage_path, checksum, upload_status, privacy_level, sensitive_level, created_by, created_at)
    values
      (source_book, clan_a, '张氏老谱卷一.pdf', 'scn_zhang_book_v1.pdf', 'application/pdf', 5242880, 'data/uploads/scenario/scn_zhang_book_v1.pdf', md5('scn-book'), 'metadata_only', 'clan_only', 'normal', u_admin, now() - interval '150 days'),
      (source_photo, clan_a, '百忍堂宗祠.jpg', 'scn_zhang_hall.jpg', 'image/jpeg', 3145728, 'data/uploads/scenario/scn_zhang_hall.jpg', md5('scn-hall'), 'metadata_only', 'clan_only', 'normal', u_editor, now() - interval '50 days');

    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
    select clan_id, id, 'birth', '出生', birth_date, coalesce(birth_date_precision, 'unknown'), birth_place, name || '出生。', 'source', source_book, 10, data_status, u_admin, now() - interval '100 days', now()
    from person where clan_id = clan_a and birth_date is not null;
    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
    values
      (clan_a, p_ancestor, 'migration', '中原迁长沙', date '1905-01-01', 'year', '河南周口至湖南长沙', '举家迁居长沙。', 'source', source_chronicle, 30, 'official', u_admin, now() - interval '130 days', now()),
      (clan_a, p_adopted, 'adoption', '入继二房', date '1988-02-01', 'month', '广东省佛山市', '经族议入继二房。', 'relationship', rel_adoption, 40, 'official', u_editor, now() - interval '80 days', now());

    insert into revision (clan_id, trace_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, approved_at)
    values (clan_a, '11111111-1111-1111-1111-111111111111'::uuid, 'person', p_ancestor, 'modified', '{"dataStatus":"draft"}'::jsonb, '{"dataStatus":"official"}'::jsonb, '始迁祖正式入谱。', u_editor, now() - interval '30 days', 'approved', now() - interval '29 days') returning id into revision_ok;
    insert into review_task (clan_id, revision_id, trace_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (clan_a, revision_ok, '11111111-1111-1111-1111-111111111111'::uuid, 1, u_reviewer, 'reviewer', br_root, 'approved', '来源完整，同意入谱。', now() - interval '29 days', now() - interval '30 days');

    insert into revision (clan_id, trace_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status)
    values (clan_a, '22222222-2222-2222-2222-222222222222'::uuid, 'relationship', rel_adoption, 'modified', '{"confidenceLevel":"medium"}'::jsonb, '{"confidenceLevel":"high"}'::jsonb, '入继关系可信度调整。', u_editor, now() - interval '6 days', 'pending') returning id into revision_pending;
    insert into review_task (clan_id, revision_id, trace_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, created_at)
    values (clan_a, revision_pending, '22222222-2222-2222-2222-222222222222'::uuid, 1, u_reviewer, 'reviewer', br_adoption, 'pending', '等待补充族议记录。', now() - interval '6 days');

    insert into revision (clan_id, trace_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, rejected_reason)
    values (clan_a, '33333333-3333-3333-3333-333333333333'::uuid, 'source', source_oral, 'modified', '{"verificationStatus":"pending_review"}'::jsonb, '{"verificationStatus":"verified"}'::jsonb, '口述来源申请验证。', u_editor, now() - interval '8 days', 'rejected', '缺少受访人签名和授权。') returning id into revision_rejected;
    insert into review_task (clan_id, revision_id, trace_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (clan_a, revision_rejected, '33333333-3333-3333-3333-333333333333'::uuid, 1, u_reviewer, 'reviewer', br_second, 'rejected', '缺少签名和授权。', now() - interval '7 days', now() - interval '8 days');

    insert into import_job (clan_id, branch_id, import_type, file_format, original_filename, idempotency_key, total_count, success_count, failure_count, skipped_count, status, processing_status, review_status, review_round, error_summary, execution_mode, execution_status, execution_stage, cursor_row_no, processed_count, published_count, chunk_size, execution_retry_count, execution_max_retries, manual_intervention_required, created_by, created_at, updated_at, completed_at)
    values (clan_a, br_long, 'person', 'csv', 'SCN_长房人物导入.csv', 'scn-person-import-1', 20, 18, 2, 0, 'completed', 'correction_required', 'not_submitted', 0, '第8、13行失败。', 'sync', 'partial_failed', 'completed', 20, 20, 18, 200, 0, 3, false, u_editor, now() - interval '5 days', now(), now() - interval '5 days') returning id into import_id;
    insert into import_job_error (job_id, row_no, error_message, raw_data, created_at)
    values
      (import_id, 8, '姓名不能为空', 'SCN-Z-IMPORT-008,,male,5,泽', now() - interval '5 days'),
      (import_id, 13, '出生日期格式不合法', 'SCN-Z-IMPORT-013,张测试,male,5,泽,2026-99-99', now() - interval '5 days');

    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (clan_a, u_admin, p_grandson, 'joined', 'active', u_admin, now() - interval '100 days', u_admin, now() - interval '100 days', u_admin, now()) returning id into membership_id;
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    values (membership_id, role_admin, 'clan', clan_a, 'active', u_admin, now() - interval '100 days', u_admin, now() - interval '100 days', u_admin, now());

    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (clan_a, u_branch, p_adopted, 'joined', 'active', u_admin, now() - interval '90 days', u_admin, now() - interval '90 days', u_admin, now()) returning id into branch_membership_id;
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    values (branch_membership_id, role_branch, 'branch', br_second, 'active', u_admin, now() - interval '90 days', u_admin, now() - interval '90 days', u_admin, now()) returning id into branch_role_id;
    update branch set manager_member_id = branch_role_id where id = br_second;

    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values
      (clan_a, u_editor, p_dual, 'joined', 'active', u_admin, now() - interval '80 days', u_admin, now() - interval '80 days', u_admin, now()),
      (clan_a, u_reviewer, p_second, 'joined', 'active', u_admin, now() - interval '70 days', u_admin, now() - interval '70 days', u_admin, now()),
      (clan_a, u_viewer, p_private, 'joined', 'active', u_admin, now() - interval '60 days', u_admin, now() - interval '60 days', u_admin, now());
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    select id,
           case user_id when u_editor then role_editor when u_reviewer then role_reviewer else role_viewer end,
           case user_id when u_editor then 'branch' else 'clan' end,
           case user_id when u_editor then br_long else clan_a end,
           'active', u_admin, now() - interval '60 days', u_admin, now() - interval '60 days', u_admin, now()
    from clan_membership where clan_id = clan_a and user_id in (u_editor, u_reviewer, u_viewer);

    -- Admin is a member of clan B; viewer intentionally is not.
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (clan_b, u_admin, p_b_ancestor, 'joined', 'active', u_admin, now() - interval '50 days', u_admin, now() - interval '50 days', u_admin, now()) returning id into membership_id;
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    values (membership_id, role_admin, 'clan', clan_b, 'active', u_admin, now() - interval '50 days', u_admin, now() - interval '50 days', u_admin, now());

    if to_regclass(current_schema() || '.culture_item') is not null then
        insert into culture_item (clan_id, branch_id, category, title, summary, content, historical_period, location_text, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values (clan_a, null, 'surname_origin', '张氏姓源与清河郡望', '宗族姓源和郡望概述。', '根据谱书和地方志整理。', '先秦至明清', '清河郡、河南周口', 'high', 'public', 'normal', 'official', true, 10, u_admin, now() - interval '80 days', now(), 1) returning id into culture_id;
        insert into culture_item (clan_id, branch_id, category, title, summary, content, historical_period, location_text, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values
          (clan_a, br_long, 'family_instruction', '百忍堂家训', '敦亲睦族、敬祖修身。', '家训正文与现代释义。', '清末民初', '湖南长沙', 'high', 'clan_only', 'normal', 'official', true, 20, u_editor, now() - interval '70 days', now(), 1),
          (clan_a, br_second, 'person_story', '二房继嗣纪事', '入继、出嗣与承祧过程。', '包含宗法敏感细节。', '1980年代', '广东佛山', 'medium', 'private', 'highly_sensitive', 'pending_review', false, 30, u_editor, now() - interval '20 days', now(), 1),
          (clan_a, br_overseas, 'custom_tradition', '海外祭祖仪式', '海外支祭祖流程草案。', '待支派确认。', '当代', '加拿大多伦多', 'low', 'branch_only', 'normal', 'draft', false, 40, u_editor, now() - interval '10 days', now(), 1),
          (clan_a, br_long, 'other', '已归档旧版家规', '历史版本。', '旧版家规全文。', '民国', '湖南长沙', 'medium', 'clan_only', 'normal', 'archived', false, 90, u_admin, now() - interval '200 days', now(), 2);
        insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
        values (clan_a, source_book, 'culture_item', culture_id, '谱书卷首姓源记载', '姓源与郡望。', 'high', 'active', u_admin, now() - interval '60 days', now());
    end if;

    if to_regclass(current_schema() || '.migration_event') is not null then
        insert into migration_event (clan_id, branch_id, sequence_no, from_location, to_location, migration_time_text, founder_person_id, reason, description, confidence_level, privacy_level, sensitive_level, data_status, created_by, created_at, updated_at, version)
        values (clan_a, br_root, 1, '河南省周口市', '湖南省长沙市', '清末光绪年间', p_ancestor, '经商与避灾', '举家迁居长沙。', 'high', 'public', 'normal', 'official', u_admin, now() - interval '100 days', now(), 1) returning id into migration_id;
        insert into migration_event (clan_id, branch_id, sequence_no, from_location, to_location, migration_time_text, founder_person_id, reason, description, confidence_level, privacy_level, sensitive_level, data_status, created_by, created_at, updated_at, version)
        values
          (clan_a, br_second, 2, '湖南省长沙市', '广东省广州市', '民国二十七年前后', p_second, '经商迁居', '二房迁往广州。', 'high', 'clan_only', 'normal', 'official', u_admin, now() - interval '95 days', now(), 1),
          (clan_a, br_overseas, 3, '广东省广州市', '加拿大多伦多', '1980年代', p_bio_father, '家庭团聚', '海外支迁徙。', 'medium', 'branch_only', 'normal', 'official', u_editor, now() - interval '85 days', now(), 1),
          (clan_a, br_adoption, 4, '加拿大多伦多', '广东省佛山市', '1988年', p_adopted, '入继二房', '敏感迁徙。', 'medium', 'private', 'highly_sensitive', 'pending_review', u_editor, now() - interval '25 days', now(), 1),
          (clan_a, br_long, 5, '湖南省长沙市', '湖南省长沙市望城区', '时间待考', p_grandson, '分房迁居', '迁徙草稿。', 'low', 'branch_only', 'normal', 'draft', u_editor, now() - interval '12 days', now(), 1);
        insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
        values (clan_a, source_chronicle, 'migration_event', migration_id, '地方志迁徙条目', '周口迁长沙。', 'high', 'active', u_admin, now() - interval '70 days', now());
    end if;

    if to_regclass(current_schema() || '.culture_site') is not null then
        insert into culture_site (clan_id, branch_id, related_person_id, site_type, site_name, address_text, founded_period, current_status, summary, description, latitude, longitude, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values (clan_a, br_root, p_ancestor, 'ancestral_hall', '百忍堂张氏宗祠', '湖南省长沙市示例路1号', '民国初年', '修缮开放', '宗族祭祀与议事场所。', '包含正厅和族谱陈列室。', 28.228200, 112.938800, 'high', 'public', 'normal', 'official', true, 10, u_admin, now() - interval '75 days', now(), 1) returning id into site_id;
        insert into culture_site (clan_id, branch_id, related_person_id, site_type, site_name, address_text, founded_period, current_status, summary, description, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values
          (clan_a, br_long_east, p_ancestor, 'cemetery', '张明远祖茔', '湖南省长沙市郊示例山', '1958年', '族内维护', '始迁祖墓葬地。', '精确位置受限。', 'high', 'private', 'highly_sensitive', 'official', false, 20, u_editor, now() - interval '65 days', now(), 1),
          (clan_a, br_overseas, p_bio_father, 'memorial', '海外支纪念墙', '加拿大多伦多示例社区', '2020年', '建设中', '海外支纪念设施。', '文化场所草稿。', 'medium', 'branch_only', 'normal', 'draft', false, 30, u_editor, now() - interval '15 days', now(), 1);
        insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
        values (clan_a, source_photo, 'culture_site', site_id, '宗祠照片', '宗祠正门与匾额。', 'medium', 'active', u_editor, now() - interval '50 days', now());
    end if;

    insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, summary, detail, request_id, client_ip, created_at)
    values
      (clan_a, u_admin, 'scenario_seed', 'clan', clan_a, '生成当前模型场景数据', '人物、关系、来源、审核、权限、文化和迁徙。', 'scenario-seed-current', '127.0.0.1', now()),
      (clan_a, u_reviewer, 'review_approve', 'revision', revision_ok, '审核通过始迁祖入谱', '场景审核记录。', 'scenario-review-approved', '127.0.0.1', now() - interval '29 days'),
      (clan_a, u_editor, 'person_import', 'import_job', import_id, '人物导入部分成功', '成功18行，失败2行。', 'scenario-import-partial', '127.0.0.1', now() - interval '5 days');
end
$$ language plpgsql;

commit;
\echo 'Current-model scenario data seeded successfully.'
