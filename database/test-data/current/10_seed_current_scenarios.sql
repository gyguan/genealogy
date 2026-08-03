\set ON_ERROR_STOP on

begin;
select pg_advisory_xact_lock(hashtext('genealogy-current-scenario-seed'));

do $$
declare
    v_admin bigint;
    v_branch_admin bigint;
    v_editor bigint;
    v_reviewer bigint;
    v_viewer bigint;

    v_role_clan_admin bigint;
    v_role_branch_admin bigint;
    v_role_editor bigint;
    v_role_reviewer bigint;
    v_role_viewer bigint;

    v_clan1 bigint;
    v_clan2 bigint;
    v_root bigint;
    v_long bigint;
    v_second bigint;
    v_overseas bigint;
    v_long_east bigint;
    v_long_west bigint;
    v_adopted_branch bigint;
    v_lingnan bigint;
    v_guangfu bigint;
    v_li_overseas bigint;

    p_ancestor bigint;
    p_ancestor_spouse bigint;
    p_long2 bigint;
    p_long2_spouse bigint;
    p_second2 bigint;
    p_second2_spouse bigint;
    p_long3 bigint;
    p_long3_spouse bigint;
    p_long3_second_spouse bigint;
    p_longwest3 bigint;
    p_biofather3 bigint;
    p_adopted4 bigint;
    p_dual4 bigint;
    p_no_descendant3 bigint;
    p_private5 bigint;
    p_same_name5 bigint;
    p_unknown5 bigint;
    p_draft bigint;
    p_pending bigint;
    p_rejected bigint;
    p_li_ancestor bigint;
    p_li_descendant bigint;

    r_parent bigint;
    r_adoption bigint;
    r_dual bigint;
    r_spouse bigint;

    v_scheme bigint;
    v_branch_scheme bigint;
    v_source_book bigint;
    v_source_chronicle bigint;
    v_source_tomb bigint;
    v_source_oral bigint;
    v_source_photo bigint;
    v_revision_approved bigint;
    v_revision_pending bigint;
    v_revision_rejected bigint;
    v_import_job bigint;

    v_membership_admin bigint;
    v_membership_branch bigint;
    v_membership_editor bigint;
    v_membership_reviewer bigint;
    v_membership_viewer bigint;
    v_branch_manager_role bigint;

    v_culture_official bigint;
    v_migration_official bigint;
    v_site_official bigint;
begin
    select id into v_admin from app_user where username = 'demo_admin' and deleted_at is null;
    select id into v_branch_admin from app_user where username = 'demo_branch_admin' and deleted_at is null;
    select id into v_editor from app_user where username = 'demo_editor' and deleted_at is null;
    select id into v_reviewer from app_user where username = 'demo_reviewer' and deleted_at is null;
    select id into v_viewer from app_user where username = 'demo_viewer' and deleted_at is null;

    if v_admin is null or v_branch_admin is null or v_editor is null or v_reviewer is null or v_viewer is null then
        raise exception 'Required demo users are missing. Run Flyway initialization before scenario seeding.';
    end if;

    select id into v_role_clan_admin from app_role where role_code = 'clan_admin';
    select id into v_role_branch_admin from app_role where role_code = 'branch_admin';
    select id into v_role_editor from app_role where role_code = 'editor';
    select id into v_role_reviewer from app_role where role_code = 'reviewer';
    select id into v_role_viewer from app_role where role_code = 'viewer';

    if v_role_clan_admin is null or v_role_branch_admin is null or v_role_editor is null
       or v_role_reviewer is null or v_role_viewer is null then
        raise exception 'Required roles are missing. Run Flyway initialization before scenario seeding.';
    end if;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        current_places, description, status, created_by, created_at, updated_at
    ) values (
        'SCN-ZHANG-CURRENT', '当前模型场景张氏宗族', '张', '百忍堂', '清河郡', '河南省周口市',
        '["河南省周口市","湖南省长沙市","广东省广州市","加拿大多伦多"]'::jsonb,
        '用于当前已实现功能的全场景验收数据：多层支派、人物、宗法关系、来源、审核、权限、文化和迁徙。',
        'active', v_admin, now() - interval '300 days', now()
    ) returning id into v_clan1;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        current_places, description, status, created_by, created_at, updated_at
    ) values (
        'SCN-LI-ISOLATION', '当前模型隔离李氏宗族', '李', '敦本堂', '陇西郡', '甘肃省陇西县',
        '["甘肃省陇西县","广东省佛山市"]'::jsonb,
        '用于跨宗族访问隔离、同名人物和独立支派树测试。',
        'active', v_admin, now() - interval '240 days', now()
    ) returning id into v_clan2;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, null, '中原总支', '/中原总支', 1, 10, '河南省周口市', '湖南省长沙市', '宗族主支，承载长房、二房和多个分房。', 'active', now() - interval '280 days', now())
    returning id into v_root;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, v_root, '长房', '/中原总支/长房', 2, 10, '湖南省长沙市', '湖南省长沙市岳麓区', '长房，下设东西两个分房。', 'active', now() - interval '260 days', now())
    returning id into v_long;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, v_root, '二房', '/中原总支/二房', 2, 20, '湖南省长沙市', '广东省广州市', '二房，包含继嗣与承祧测试场景。', 'active', now() - interval '255 days', now())
    returning id into v_second;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, null, '海外支', '/海外支', 1, 30, '广东省广州市', '加拿大多伦多', '直属宗族的海外支，用于迁徙和权限隔离测试。', 'active', now() - interval '180 days', now())
    returning id into v_overseas;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, v_long, '长房东分房', '/中原总支/长房/东分房', 3, 10, '湖南省长沙市岳麓区', '湖南省长沙市开福区', '兄弟分房形成的东分房。', 'active', now() - interval '150 days', now())
    returning id into v_long_east;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, v_long, '长房西分房', '/中原总支/长房/西分房', 3, 20, '湖南省长沙市岳麓区', '湖南省长沙市望城区', '兄弟分房形成的西分房。', 'active', now() - interval '145 days', now())
    returning id into v_long_west;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan1, v_second, '二房继嗣房', '/中原总支/二房/继嗣房', 3, 10, '广东省广州市', '广东省佛山市', '用于入继、出嗣、承祧、兼祧和嗣子场景。', 'active', now() - interval '120 days', now())
    returning id into v_adopted_branch;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan2, null, '岭南支', '/岭南支', 1, 10, '甘肃省陇西县', '广东省佛山市', '隔离宗族主支。', 'active', now() - interval '210 days', now())
    returning id into v_lingnan;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan2, v_lingnan, '广府房', '/岭南支/广府房', 2, 10, '广东省佛山市', '广东省广州市', '隔离宗族广府房。', 'active', now() - interval '190 days', now())
    returning id into v_guangfu;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status, created_at, updated_at)
    values (v_clan2, v_lingnan, '海外房', '/岭南支/海外房', 2, 20, '广东省佛山市', '加拿大温哥华', '隔离宗族海外房。', 'active', now() - interval '170 days', now())
    returning id into v_li_overseas;

    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, alias_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, title_or_honor, biography, tomb_place, epitaph, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_root, 'SCN-Z-001', '张明远', '张明远', '字慎修', '中原始迁祖', 'male', 1, '明', '始祖', date '1880-03-12', 'day', date '1958-09-18', 'day', false, '河南省周口市', '湖南省长沙市', '商绅', '私塾', '始迁祖', '由中原迁居长沙，主持修建宗祠。', '长沙祖茔', '敦亲睦族，诗书传家。', true, 'normal', 'public', 'official', v_admin, now() - interval '270 days', v_admin, now()) returning id into p_ancestor;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_root, 'SCN-Z-002', '王静贞', '王氏', 'female', 1, '明', '元配', date '1884-05-06', 'day', date '1961-02-03', 'day', false, '河南省周口市', '湖南省长沙市', '家庭经营', '张明远元配，参与宗族迁居与家业经营。', true, 'normal', 'clan_only', 'official', v_admin, now() - interval '269 days', v_admin, now()) returning id into p_ancestor_spouse;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long, 'SCN-Z-003', '张承德', '张承德', '字厚生', 'male', 2, '承', '长子', date '1908-01-16', 'day', date '1988-06-20', 'day', false, '湖南省长沙市', '湖南省长沙市岳麓区', '教师', '师范', '长房开房人物。', true, 'normal', 'public', 'official', v_admin, now() - interval '250 days', v_admin, now()) returning id into p_long2;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long, 'SCN-Z-004', '李淑兰', '李氏', 'female', 2, '承', '元配', date '1912-08-09', 'day', date '1994-04-01', 'day', false, '湖南省湘潭市', '湖南省长沙市岳麓区', '医务人员', '长房家风记录人。', true, 'normal', 'clan_only', 'official', v_admin, now() - interval '249 days', v_admin, now()) returning id into p_long2_spouse;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_second, 'SCN-Z-005', '张承礼', '张承礼', '字敬之', 'male', 2, '承', '次子', date '1911-11-02', 'day', date '1990-01-10', 'day', false, '湖南省长沙市', '广东省广州市', '商人', '二房开房人物。', true, 'normal', 'public', 'official', v_admin, now() - interval '248 days', v_admin, now()) returning id into p_second2;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_second, 'SCN-Z-006', '陈慧芳', '陈氏', 'female', 2, '承', '元配', date '1915-07-14', 'day', date '1997-10-08', 'day', false, '广东省韶关市', '广东省广州市', '家庭经营', '二房家庭资料整理人。', true, 'normal', 'clan_only', 'official', v_admin, now() - interval '247 days', v_admin, now()) returning id into p_second2_spouse;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, education, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_east, 'SCN-Z-007', '张启文', '张启文', '字允中', 'male', 3, '启', '长孙', date '1935-02-21', 'day', date '2011-03-18', 'day', false, '湖南省长沙市', '湖南省长沙市开福区', '工程师', '本科', '长房东分房开创人物，有元配与继配。', true, 'normal', 'public', 'official', v_admin, now() - interval '220 days', v_admin, now()) returning id into p_long3;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_east, 'SCN-Z-008', '赵雅兰', '赵氏', 'female', 3, '启', '元配', date '1938-06-11', 'day', date '1978-12-02', 'day', false, '湖南省长沙县', '湖南省长沙市开福区', '教师', '张启文元配。', true, 'normal', 'clan_only', 'official', v_admin, now() - interval '219 days', v_admin, now()) returning id into p_long3_spouse;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_east, 'SCN-Z-009', '刘慧芳', '刘氏', 'female', 3, '启', '继配', date '1945-03-08', 'day', true, '湖南省宁乡市', '湖南省长沙市开福区', '会计', '张启文继配，在世人员。', true, 'normal', 'branch_only', 'official', v_admin, now() - interval '218 days', v_admin, now()) returning id into p_long3_second_spouse;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_west, 'SCN-Z-010', '张启武', '张启武', 'male', 3, '启', '次孙', date '1939-09-13', 'day', true, '湖南省长沙市', '湖南省长沙市望城区', '技术员', '长房西分房开创人物。', true, 'normal', 'clan_only', 'official', v_admin, now() - interval '215 days', v_admin, now()) returning id into p_longwest3;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_overseas, 'SCN-Z-011', '张启海', '张启海', 'male', 3, '启', '海外支三世', date '1942-04-07', 'day', true, '广东省广州市', '加拿大多伦多', '餐饮经营', '张俊安生父，后同意其入继二房。', true, 'normal', 'branch_only', 'official', v_admin, now() - interval '210 days', v_admin, now()) returning id into p_biofather3;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, courtesy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_adopted_branch, 'SCN-Z-012', '张俊安', '张俊安', '字继和', 'male', 4, '俊', '入继子', date '1968-05-19', 'day', true, '加拿大多伦多', '广东省佛山市', '企业管理', '保留生物亲子关系，同时建立入继和出嗣关系。', true, 'adopted', 'branch_only', 'official', v_admin, now() - interval '180 days', v_admin, now()) returning id into p_adopted4;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_east, 'SCN-Z-013', '张俊宁', '张俊宁', 'male', 4, '俊', '兼祧子', date '1972-10-23', 'day', true, '湖南省长沙市', '湖南省长沙市', '医生', '兼祧长房东分房与二房继嗣房。', true, 'dual_successor', 'relatives_only', 'official', v_admin, now() - interval '175 days', v_admin, now()) returning id into p_dual4;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_second, 'SCN-Z-014', '张启泽', '张启泽', 'male', 3, '启', '二房三世', date '1946-12-01', 'year', true, '广东省广州市', '广东省广州市', '教师', '无亲生子女，后以嗣子承祧。', false, 'normal', 'clan_only', 'official', v_admin, now() - interval '170 days', v_admin, now()) returning id into p_no_descendant3;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_east, 'SCN-Z-015', '张泽宇', '张泽宇', 'male', 5, '泽', '五世长子', date '2001-02-14', 'day', true, '湖南省长沙市', '湖南省长沙市', '软件工程师', '在世敏感人物，用于隐私最小披露测试。', false, 'normal', 'private', 'official', v_admin, now() - interval '120 days', v_admin, now()) returning id into p_private5;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_second, 'SCN-Z-016', '张泽宇', '张泽宇', 'male', 5, '泽', '五世次子', date '2003-07-01', 'month', true, '广东省广州市', '广东省广州市', '学生', '同名不同人测试。', false, 'normal', 'branch_only', 'official', v_admin, now() - interval '118 days', v_admin, now()) returning id into p_same_name5;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, rank_in_family, birth_date_precision, is_living, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_overseas, 'SCN-Z-017', '张泽清', '张泽清', 'female', 5, '泽', '父母待考', 'unknown', true, '加拿大多伦多', '学生', '父母未知、出生日期未知的边界人物。', false, 'unknown', 'sealed', 'official', v_admin, now() - interval '100 days', v_admin, now()) returning id into p_unknown5;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, is_living, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_west, 'SCN-Z-018', '张泽新', '张泽新', 'male', 5, '泽', true, '湖南省长沙市', '学生', '人物草稿。', false, 'normal', 'branch_only', 'draft', v_editor, now() - interval '12 days', v_editor, now()) returning id into p_draft;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, is_living, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_long_west, 'SCN-Z-019', '张泽审', '张泽审', 'female', 5, '泽', true, '湖南省长沙市', '学生', '人物待审核。', false, 'normal', 'branch_only', 'pending', v_editor, now() - interval '10 days', v_editor, now()) returning id into p_pending;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, is_living, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_second, 'SCN-Z-020', '张泽驳', '张泽驳', 'male', 5, '泽', true, '广东省广州市', '学生', '人物审核驳回。', false, 'normal', 'branch_only', 'rejected', v_editor, now() - interval '9 days', v_editor, now()) returning id into p_rejected;

    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, birth_date, birth_date_precision, death_date, death_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan2, v_lingnan, 'SCN-L-001', '李敦本', '李敦本', 'male', 1, '敦', date '1900-01-01', 'year', date '1978-01-01', 'year', false, '甘肃省陇西县', '广东省佛山市', '商人', '隔离宗族始迁祖。', true, 'normal', 'public', 'official', v_admin, now() - interval '205 days', v_admin, now()) returning id into p_li_ancestor;
    insert into person (clan_id, branch_id, person_code, name, genealogy_name, gender, generation_no, generation_word, birth_date, birth_date_precision, is_living, birth_place, residence_place, occupation, biography, has_descendant, lineage_status, privacy_level, data_status, created_by, created_at, updated_by, updated_at)
    values (v_clan2, v_guangfu, 'SCN-L-002', '李泽宇', '李泽宇', 'male', 2, '本', date '1930-01-01', 'year', true, '广东省佛山市', '广东省广州市', '教师', '跨宗族同名人物。', true, 'normal', 'clan_only', 'official', v_admin, now() - interval '190 days', v_admin, now()) returning id into p_li_descendant;

    update clan set ancestor_person_id = p_ancestor, updated_at = now() where id = v_clan1;
    update clan set ancestor_person_id = p_li_ancestor, updated_at = now() where id = v_clan2;
    update branch set founder_person_id = p_ancestor where id = v_root;
    update branch set founder_person_id = p_long2 where id = v_long;
    update branch set founder_person_id = p_second2 where id = v_second;
    update branch set founder_person_id = p_biofather3 where id = v_overseas;
    update branch set founder_person_id = p_long3 where id = v_long_east;
    update branch set founder_person_id = p_longwest3 where id = v_long_west;
    update branch set founder_person_id = p_adopted4 where id = v_adopted_branch;
    update branch set founder_person_id = p_li_ancestor where id = v_lingnan;
    update branch set founder_person_id = p_li_descendant where id = v_guangfu;

    -- Canonical relationship categories match current relation type policy.
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values (v_clan1, p_ancestor, p_ancestor_spouse, 'spouse', 'spouse', 'marriage', false, false, true, '元配关系。', 'high', 'official', v_admin, now() - interval '250 days', now()) returning id into r_spouse;
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values (v_clan1, p_ancestor_spouse, p_ancestor, 'spouse', 'spouse', 'marriage', false, false, false, '配偶反向关系。', 'high', 'official', v_admin, now() - interval '250 days', now());
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values
      (v_clan1, p_long2, p_long2_spouse, 'spouse', 'spouse', 'marriage', false, false, true, '元配关系。', 'high', 'official', v_admin, now() - interval '220 days', now()),
      (v_clan1, p_long2_spouse, p_long2, 'spouse', 'spouse', 'marriage', false, false, false, '配偶反向关系。', 'high', 'official', v_admin, now() - interval '220 days', now()),
      (v_clan1, p_second2, p_second2_spouse, 'spouse', 'spouse', 'marriage', false, false, true, '元配关系。', 'high', 'official', v_admin, now() - interval '218 days', now()),
      (v_clan1, p_second2_spouse, p_second2, 'spouse', 'spouse', 'marriage', false, false, false, '配偶反向关系。', 'high', 'official', v_admin, now() - interval '218 days', now()),
      (v_clan1, p_long3, p_long3_spouse, 'spouse', 'spouse', 'marriage', false, false, true, '元配关系。', 'high', 'official', v_admin, now() - interval '190 days', now()),
      (v_clan1, p_long3_spouse, p_long3, 'spouse', 'spouse', 'marriage', false, false, false, '配偶反向关系。', 'high', 'official', v_admin, now() - interval '190 days', now()),
      (v_clan1, p_long3, p_long3_second_spouse, 'spouse', 'second_spouse', 'marriage', false, false, true, '继配关系。', 'medium', 'official', v_admin, now() - interval '160 days', now()),
      (v_clan1, p_long3_second_spouse, p_long3, 'spouse', 'second_spouse', 'marriage', false, false, false, '继配反向关系。', 'medium', 'official', v_admin, now() - interval '160 days', now());

    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values
      (v_clan1, p_ancestor, p_long2, 'parent_child', 'biological_father', 'blood', true, true, true, '生父关系。', 'high', 'official', v_admin, now() - interval '230 days', now()),
      (v_clan1, p_ancestor_spouse, p_long2, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母关系。', 'high', 'official', v_admin, now() - interval '230 days', now()),
      (v_clan1, p_ancestor, p_second2, 'parent_child', 'biological_father', 'blood', true, true, true, '生父关系。', 'high', 'official', v_admin, now() - interval '228 days', now()),
      (v_clan1, p_ancestor_spouse, p_second2, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母关系。', 'high', 'official', v_admin, now() - interval '228 days', now()),
      (v_clan1, p_long2, p_long3, 'parent_child', 'biological_father', 'blood', true, true, true, '生父关系。', 'high', 'official', v_admin, now() - interval '200 days', now()),
      (v_clan1, p_long2_spouse, p_long3, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母关系。', 'high', 'official', v_admin, now() - interval '200 days', now()),
      (v_clan1, p_long2, p_longwest3, 'parent_child', 'biological_father', 'blood', true, true, true, '生父关系。', 'high', 'official', v_admin, now() - interval '198 days', now()),
      (v_clan1, p_long2_spouse, p_longwest3, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母关系。', 'high', 'official', v_admin, now() - interval '198 days', now()),
      (v_clan1, p_long3, p_private5, 'parent_child', 'biological_father', 'blood', true, true, true, '生父关系。', 'high', 'official', v_admin, now() - interval '110 days', now()),
      (v_clan1, p_long3_second_spouse, p_private5, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母关系。', 'high', 'official', v_admin, now() - interval '110 days', now()),
      (v_clan1, p_second2, p_no_descendant3, 'parent_child', 'biological_father', 'blood', true, true, true, '生父关系。', 'high', 'official', v_admin, now() - interval '190 days', now()),
      (v_clan1, p_second2_spouse, p_no_descendant3, 'parent_child', 'biological_mother', 'blood', true, true, true, '生母关系。', 'high', 'official', v_admin, now() - interval '190 days', now()),
      (v_clan1, p_biofather3, p_adopted4, 'parent_child', 'biological_father', 'blood', true, true, true, '保留的生物亲子关系。', 'high', 'official', v_admin, now() - interval '170 days', now())
    returning id into r_parent;

    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, ritual_relation_type, succession_reason, successor_branch_id, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values (v_clan1, p_no_descendant3, p_adopted4, 'in_adoption', 'legal_father', 'ritual', 'in_adoption', '二房无嗣，经族议入继。', v_adopted_branch, true, false, true, '入继关系，主世系按二房继嗣房展示。', 'high', 'official', v_admin, now() - interval '150 days', now()) returning id into r_adoption;
    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, ritual_relation_type, succession_reason, successor_branch_id, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values
      (v_clan1, p_biofather3, p_adopted4, 'out_adoption', 'out_adopted', 'ritual', 'out_adoption', '由海外支出嗣至二房继嗣房。', v_adopted_branch, false, false, false, '出嗣关系，不删除生物亲子。', 'high', 'official', v_admin, now() - interval '150 days', now()),
      (v_clan1, p_second2, p_adopted4, 'successor', 'heir_successor', 'ritual', 'successor', '承祧二房香火。', v_adopted_branch, true, false, true, '承祧关系。', 'high', 'official', v_admin, now() - interval '149 days', now()),
      (v_clan1, p_long3, p_dual4, 'dual_successor', 'dual_successor', 'ritual', 'dual_successor', '兼祧长房东分房与二房继嗣房。', v_adopted_branch, true, false, true, '兼祧关系。', 'medium', 'official', v_admin, now() - interval '140 days', now()),
      (v_clan1, p_no_descendant3, p_dual4, 'heir_son', 'heir_son', 'ritual', 'heir_son', '以张俊宁为嗣子。', v_adopted_branch, true, false, false, '嗣子关系。', 'medium', 'official', v_admin, now() - interval '139 days', now()),
      (v_clan1, p_no_descendant3, p_second2_spouse, 'no_descendant', 'no_descendant', 'status', 'no_descendant', '二房三世无亲生子女。', v_second, false, false, true, '无嗣状态标记。', 'high', 'official', v_admin, now() - interval '138 days', now())
    returning id into r_dual;

    insert into relationship (clan_id, from_person_id, to_person_id, relation_type, relation_label, relation_category, is_lineage_relation, is_biological, is_primary, description, confidence_level, data_status, created_by, created_at, updated_at)
    values (v_clan2, p_li_ancestor, p_li_descendant, 'parent_child', 'biological_father', 'blood', true, true, true, '隔离宗族亲子关系。', 'high', 'official', v_admin, now() - interval '180 days', now());

    insert into generation_scheme (clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
    values (v_clan1, null, '张氏宗族默认字辈', '明承启俊泽 守正继家声', 1, true, true, false, 'active', now() - interval '230 days')
    returning id into v_scheme;
    insert into generation_word (scheme_id, generation_no, word, description, sort_order)
    values
      (v_scheme, 1, '明', '第一世', 1),
      (v_scheme, 2, '承', '第二世', 2),
      (v_scheme, 3, '启', '第三世', 3),
      (v_scheme, 4, '俊', '第四世', 4),
      (v_scheme, 5, '泽', '第五世', 5),
      (v_scheme, 6, '守', '第六世续派', 6),
      (v_scheme, 7, '正', '第七世续派', 7);
    insert into generation_scheme (clan_id, branch_id, scheme_name, poem_text, start_generation, is_default, validation_enabled, strict_mode, status, created_at)
    values (v_clan1, v_overseas, '海外支续派方案', '海纳新知 远绍家声', 6, false, true, true, 'active', now() - interval '80 days')
    returning id into v_branch_scheme;
    insert into generation_word (scheme_id, generation_no, word, description, sort_order)
    values
      (v_branch_scheme, 6, '海', '海外支第六世', 1),
      (v_branch_scheme, 7, '纳', '海外支第七世', 2),
      (v_branch_scheme, 8, '新', '海外支第八世', 3);

    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (v_clan1, '张氏老谱影印本', 'genealogy_book', '宗族理事会', '百忍堂张氏族谱', '卷一', '1-86', '民国二十六年', '记载始迁祖、支派、字辈和主要人物。', 'verified', '核心谱书来源。', 'high', 'clan_only', 'normal', v_admin, now() - interval '200 days', now()) returning id into v_source_book;
    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (v_clan1, '长沙地方志迁徙条目', 'local_chronicle', '地方志办公室', '长沙地方志', '人物与姓氏卷', '112-118', '1998', '记载张氏由周口迁入长沙及后续分布。', 'verified', '迁徙路线来源。', 'high', 'public', 'normal', v_admin, now() - interval '180 days', now()) returning id into v_source_chronicle;
    insert into source (clan_id, source_name, source_type, provider_name, book_title, volume_no, page_no, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (v_clan1, '祖茔墓碑拓片', 'tombstone', '长房东分房', '张明远墓碑拓片', null, null, '1958', '墓碑记载姓名、生卒及迁徙。', 'verified', '墓葬证据。', 'high', 'branch_only', 'sensitive', v_editor, now() - interval '160 days', now()) returning id into v_source_tomb;
    insert into source (clan_id, source_name, source_type, provider_name, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (v_clan1, '二房继嗣口述访谈', 'oral_record', '张启泽及族老', '2025-10-02', '说明张俊安入继、出嗣与承祧过程。', 'pending_review', '包含在世人员和宗法敏感信息。', 'medium', 'private', 'high', v_editor, now() - interval '90 days', now()) returning id into v_source_oral;
    insert into source (clan_id, source_name, source_type, provider_name, source_date, excerpt, verification_status, description, confidence_level, privacy_level, sensitive_level, created_by, created_at, updated_at)
    values (v_clan1, '百忍堂宗祠照片', 'photo', '数字化志愿者', '2026-01-18', '宗祠正门、匾额和内部陈设照片。', 'draft', '文化场所图片草稿。', 'medium', 'clan_only', 'normal', v_editor, now() - interval '60 days', now()) returning id into v_source_photo;

    insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
    values
      (v_clan1, v_source_book, 'person', p_ancestor, '谱书记载始迁祖', '卷一始祖条。', 'high', 'active', v_admin, now() - interval '150 days', now()),
      (v_clan1, v_source_book, 'relationship', r_parent, '谱书记载亲子关系', '长房世系条。', 'high', 'active', v_admin, now() - interval '150 days', now()),
      (v_clan1, v_source_chronicle, 'branch', v_root, '地方志记载迁徙', '周口迁长沙。', 'high', 'active', v_admin, now() - interval '140 days', now()),
      (v_clan1, v_source_oral, 'relationship', r_adoption, '族老访谈确认入继', '入继与出嗣经族议确认。', 'medium', 'pending_review', v_editor, now() - interval '80 days', now()),
      (v_clan1, v_source_book, 'generation_word', (select id from generation_word where scheme_id = v_scheme and generation_no = 5), '谱书字派来源', '第五世用字“泽”。', 'high', 'active', v_admin, now() - interval '130 days', now());

    insert into source_attachment (source_id, clan_id, original_filename, stored_filename, content_type, file_size, storage_path, checksum, upload_status, privacy_level, sensitive_level, created_by, created_at)
    values
      (v_source_book, v_clan1, '张氏老谱卷一.pdf', 'scn_zhang_book_v1.pdf', 'application/pdf', 5242880, 'data/uploads/scenario/scn_zhang_book_v1.pdf', md5('scn-book'), 'metadata_only', 'clan_only', 'normal', v_admin, now() - interval '150 days'),
      (v_source_tomb, v_clan1, '张明远墓碑拓片.jpg', 'scn_zhang_tombstone.jpg', 'image/jpeg', 2097152, 'data/uploads/scenario/scn_zhang_tombstone.jpg', md5('scn-tomb'), 'metadata_only', 'branch_only', 'sensitive', v_editor, now() - interval '120 days'),
      (v_source_photo, v_clan1, '百忍堂宗祠.jpg', 'scn_zhang_hall.jpg', 'image/jpeg', 3145728, 'data/uploads/scenario/scn_zhang_hall.jpg', md5('scn-hall'), 'metadata_only', 'clan_only', 'normal', v_editor, now() - interval '50 days');

    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
    select clan_id, id, 'birth', '出生', birth_date, coalesce(birth_date_precision, 'unknown'), birth_place,
           name || '出生。', 'source', v_source_book, 10, data_status, v_admin, now() - interval '100 days', now()
    from person where clan_id = v_clan1 and birth_date is not null;
    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
    select clan_id, id, 'death', '逝世', death_date, coalesce(death_date_precision, 'unknown'), tomb_place,
           name || '逝世。', 'source', v_source_tomb, 90, data_status, v_admin, now() - interval '90 days', now()
    from person where clan_id = v_clan1 and death_date is not null;
    insert into person_event (clan_id, person_id, event_type, event_title, event_date, event_date_precision, event_place, event_description, source_type, source_id, sort_order, data_status, created_by, created_at, updated_at)
    values
      (v_clan1, p_ancestor, 'migration', '中原迁长沙', date '1905-01-01', 'year', '河南周口至湖南长沙', '举家迁居长沙并建立中原总支。', 'source', v_source_chronicle, 30, 'official', v_admin, now() - interval '130 days', now()),
      (v_clan1, p_adopted4, 'adoption', '入继二房', date '1988-02-01', 'month', '广东省佛山市', '经族议入继二房继嗣房。', 'relationship', r_adoption, 40, 'official', v_editor, now() - interval '80 days', now()),
      (v_clan1, p_long3, 'marriage', '与赵氏婚配', date '1960-01-01', 'year', '湖南省长沙市', '与赵雅兰成婚。', 'relationship', r_spouse, 50, 'official', v_admin, now() - interval '70 days', now());

    insert into revision (clan_id, trace_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, approved_at)
    values (v_clan1, '11111111-1111-1111-1111-111111111111'::uuid, 'person', p_ancestor, 'modified', '{"dataStatus":"draft"}'::jsonb, '{"dataStatus":"official"}'::jsonb, '始迁祖正式入谱。', v_editor, now() - interval '30 days', 'approved', now() - interval '29 days')
    returning id into v_revision_approved;
    insert into review_task (clan_id, revision_id, trace_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (v_clan1, v_revision_approved, '11111111-1111-1111-1111-111111111111'::uuid, 1, v_reviewer, 'reviewer', v_root, 'approved', '来源完整，同意入谱。', now() - interval '29 days', now() - interval '30 days');

    insert into revision (clan_id, trace_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status)
    values (v_clan1, '22222222-2222-2222-2222-222222222222'::uuid, 'relationship', r_adoption, 'modified', '{"confidenceLevel":"medium"}'::jsonb, '{"confidenceLevel":"high"}'::jsonb, '入继关系可信度调整，等待审核。', v_editor, now() - interval '6 days', 'pending')
    returning id into v_revision_pending;
    insert into review_task (clan_id, revision_id, trace_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, created_at)
    values (v_clan1, v_revision_pending, '22222222-2222-2222-2222-222222222222'::uuid, 1, v_reviewer, 'reviewer', v_adopted_branch, 'pending', '等待补充族议记录。', now() - interval '6 days');

    insert into revision (clan_id, trace_id, target_type, target_id, change_type, before_data, after_data, diff_summary, submitter_id, submit_time, status, rejected_reason)
    values (v_clan1, '33333333-3333-3333-3333-333333333333'::uuid, 'source', v_source_oral, 'modified', '{"verificationStatus":"pending_review"}'::jsonb, '{"verificationStatus":"verified"}'::jsonb, '口述来源申请验证。', v_editor, now() - interval '8 days', 'rejected', '缺少受访人签名和授权。')
    returning id into v_revision_rejected;
    insert into review_task (clan_id, revision_id, trace_id, review_level, reviewer_id, reviewer_role, branch_id, status, review_comment, reviewed_at, created_at)
    values (v_clan1, v_revision_rejected, '33333333-3333-3333-3333-333333333333'::uuid, 1, v_reviewer, 'reviewer', v_second, 'rejected', '缺少签名和授权。', now() - interval '7 days', now() - interval '8 days');

    insert into import_job (clan_id, branch_id, import_type, file_format, original_filename, idempotency_key, total_count, success_count, failure_count, skipped_count, status, processing_status, review_status, review_round, error_summary, execution_mode, execution_status, execution_stage, cursor_row_no, processed_count, published_count, chunk_size, execution_retry_count, execution_max_retries, manual_intervention_required, created_by, created_at, updated_at, completed_at)
    values (v_clan1, v_long, 'person', 'csv', 'SCN_长房人物导入.csv', 'scn-person-import-1', 20, 18, 2, 0, 'completed', 'correction_required', 'not_submitted', 0, '第 8、13 行校验失败。', 'sync', 'partial_failed', 'completed', 20, 20, 18, 200, 0, 3, false, v_editor, now() - interval '5 days', now(), now() - interval '5 days')
    returning id into v_import_job;
    insert into import_job_error (job_id, row_no, error_message, raw_data, created_at)
    values
      (v_import_job, 8, '姓名不能为空', 'SCN-Z-IMPORT-008,,male,5,泽', now() - interval '5 days'),
      (v_import_job, 13, '出生日期格式不合法', 'SCN-Z-IMPORT-013,张测试,male,5,泽,2026-99-99', now() - interval '5 days');

    -- Current RBAC model: clan_membership + member_role.
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_admin, p_long3, 'joined', 'active', v_admin, now() - interval '100 days', v_admin, now() - interval '100 days', v_admin, now()) returning id into v_membership_admin;
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_branch_admin, p_longwest3, 'joined', 'active', v_admin, now() - interval '90 days', v_admin, now() - interval '90 days', v_admin, now()) returning id into v_membership_branch;
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_editor, p_dual4, 'joined', 'active', v_admin, now() - interval '80 days', v_admin, now() - interval '80 days', v_admin, now()) returning id into v_membership_editor;
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_reviewer, p_no_descendant3, 'joined', 'active', v_admin, now() - interval '70 days', v_admin, now() - interval '70 days', v_admin, now()) returning id into v_membership_reviewer;
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (v_clan1, v_viewer, p_same_name5, 'joined', 'active', v_admin, now() - interval '60 days', v_admin, now() - interval '60 days', v_admin, now()) returning id into v_membership_viewer;

    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    values (v_membership_admin, v_role_clan_admin, 'clan', v_clan1, 'active', v_admin, now() - interval '100 days', v_admin, now() - interval '100 days', v_admin, now());
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    values (v_membership_branch, v_role_branch_admin, 'branch', v_long, 'active', v_admin, now() - interval '90 days', v_admin, now() - interval '90 days', v_admin, now()) returning id into v_branch_manager_role;
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    values
      (v_membership_editor, v_role_editor, 'branch', v_long, 'active', v_admin, now() - interval '80 days', v_admin, now() - interval '80 days', v_admin, now()),
      (v_membership_reviewer, v_role_reviewer, 'clan', v_clan1, 'active', v_admin, now() - interval '70 days', v_admin, now() - interval '70 days', v_admin, now()),
      (v_membership_viewer, v_role_viewer, 'clan', v_clan1, 'active', v_admin, now() - interval '60 days', v_admin, now() - interval '60 days', v_admin, now());
    update branch set manager_member_id = v_branch_manager_role, updated_at = now() where id = v_long;

    -- Admin belongs to the second clan; viewer deliberately does not, enabling cross-clan denial tests.
    insert into clan_membership (clan_id, user_id, person_id, join_status, member_status, invited_by, joined_at, created_by, created_at, updated_by, updated_at)
    values (v_clan2, v_admin, p_li_ancestor, 'joined', 'active', v_admin, now() - interval '50 days', v_admin, now() - interval '50 days', v_admin, now());
    insert into member_role (membership_id, role_id, scope_type, scope_id, status, granted_by, granted_at, created_by, created_at, updated_by, updated_at)
    select id, v_role_clan_admin, 'clan', v_clan2, 'active', v_admin, now() - interval '50 days', v_admin, now() - interval '50 days', v_admin, now()
    from clan_membership where clan_id = v_clan2 and user_id = v_admin;

    -- Culture tables are current implemented modules. Keep the script executable on branches where a table is absent.
    if to_regclass(current_schema() || '.culture_item') is not null then
        insert into culture_item (clan_id, branch_id, category, title, summary, content, historical_period, location_text, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values (v_clan1, null, 'surname_origin', '张氏姓源与清河郡望', '宗族姓源和郡望概述。', '根据谱书和地方志整理张氏姓源、郡望与迁徙背景。', '先秦至明清', '清河郡、河南周口', 'high', 'public', 'normal', 'official', true, 10, v_admin, now() - interval '80 days', now(), 1)
        returning id into v_culture_official;
        insert into culture_item (clan_id, branch_id, category, title, summary, content, historical_period, location_text, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values
          (v_clan1, v_long, 'family_instruction', '百忍堂家训', '敦亲睦族、敬祖修身。', '家训正文与现代释义。', '清末民初', '湖南长沙', 'high', 'clan_only', 'normal', 'official', true, 20, v_editor, now() - interval '70 days', now(), 1),
          (v_clan1, v_second, 'person_story', '二房继嗣纪事', '记录入继、出嗣与承祧过程。', '包含在世人员及宗法敏感细节。', '1980年代', '广东佛山', 'medium', 'private', 'high', 'pending_review', false, 30, v_editor, now() - interval '20 days', now(), 1),
          (v_clan1, v_overseas, 'custom_tradition', '海外祭祖仪式', '海外支祭祖流程草案。', '待支派确认。', '当代', '加拿大多伦多', 'low', 'branch_only', 'normal', 'draft', false, 40, v_editor, now() - interval '10 days', now(), 1),
          (v_clan1, v_long_west, 'other', '已归档旧版家规', '历史版本，仅供追溯。', '旧版家规全文。', '民国', '湖南长沙', 'medium', 'clan_only', 'normal', 'archived', false, 90, v_admin, now() - interval '200 days', now(), 2);
        insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
        values (v_clan1, v_source_book, 'culture_item', v_culture_official, '谱书卷首姓源记载', '卷首姓源与郡望。', 'high', 'active', v_admin, now() - interval '60 days', now());
    end if;

    if to_regclass(current_schema() || '.migration_event') is not null then
        insert into migration_event (clan_id, branch_id, sequence_no, from_location, to_location, migration_time_text, founder_person_id, reason, description, confidence_level, privacy_level, sensitive_level, data_status, created_by, created_at, updated_at, version)
        values (v_clan1, v_root, 1, '河南省周口市', '湖南省长沙市', '清末光绪年间', p_ancestor, '经商与避灾', '张明远举家迁居长沙，建立中原总支。', 'high', 'public', 'normal', 'official', v_admin, now() - interval '100 days', now(), 1)
        returning id into v_migration_official;
        insert into migration_event (clan_id, branch_id, sequence_no, from_location, to_location, migration_time_text, founder_person_id, reason, description, confidence_level, privacy_level, sensitive_level, data_status, created_by, created_at, updated_at, version)
        values
          (v_clan1, v_second, 2, '湖南省长沙市', '广东省广州市', '民国二十七年前后', p_second2, '经商迁居', '二房迁往广州。', 'high', 'clan_only', 'normal', 'official', v_admin, now() - interval '95 days', now(), 1),
          (v_clan1, v_overseas, 3, '广东省广州市', '加拿大多伦多', '1980年代', p_biofather3, '家庭团聚', '海外支迁徙事件。', 'medium', 'branch_only', 'normal', 'official', v_editor, now() - interval '85 days', now(), 1),
          (v_clan1, v_adopted_branch, 4, '加拿大多伦多', '广东省佛山市', '1988年', p_adopted4, '入继二房', '涉及入继和在世人员的敏感迁徙。', 'medium', 'private', 'high', 'pending_review', v_editor, now() - interval '25 days', now(), 1),
          (v_clan1, v_long_west, 5, '湖南省长沙市', '湖南省长沙市望城区', '时间待考', p_longwest3, '分房迁居', '迁徙草稿。', 'low', 'branch_only', 'normal', 'draft', v_editor, now() - interval '12 days', now(), 1);
        insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
        values (v_clan1, v_source_chronicle, 'migration_event', v_migration_official, '地方志迁徙条目', '周口迁长沙。', 'high', 'active', v_admin, now() - interval '70 days', now());
    end if;

    if to_regclass(current_schema() || '.culture_site') is not null then
        insert into culture_site (clan_id, branch_id, related_person_id, site_type, site_name, address_text, founded_period, current_status, summary, description, latitude, longitude, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values (v_clan1, v_root, p_ancestor, 'ancestral_hall', '百忍堂张氏宗祠', '湖南省长沙市开福区示例路1号', '民国初年', '修缮开放', '宗族祭祀与议事场所。', '包含正厅、族谱陈列室和家训碑。', 28.228200, 112.938800, 'high', 'public', 'normal', 'official', true, 10, v_admin, now() - interval '75 days', now(), 1)
        returning id into v_site_official;
        insert into culture_site (clan_id, branch_id, related_person_id, site_type, site_name, address_text, founded_period, current_status, summary, description, confidence_level, privacy_level, sensitive_level, data_status, featured_on_home, sort_order, created_by, created_at, updated_at, version)
        values
          (v_clan1, v_long_east, p_ancestor, 'cemetery', '张明远祖茔', '湖南省长沙市郊示例山', '1958年', '族内维护', '始迁祖墓葬地。', '精确位置仅支派管理员可见。', 'high', 'private', 'high', 'official', false, 20, v_editor, now() - interval '65 days', now(), 1),
          (v_clan1, v_overseas, p_biofather3, 'memorial', '海外支纪念墙', '加拿大多伦多示例社区', '2020年', '建设中', '海外支人物纪念设施。', '文化场所草稿。', 'medium', 'branch_only', 'normal', 'draft', false, 30, v_editor, now() - interval '15 days', now(), 1);
        insert into source_binding (clan_id, source_id, target_type, target_id, binding_reason, excerpt, confidence_level, binding_status, created_by, created_at, updated_at)
        values (v_clan1, v_source_photo, 'culture_site', v_site_official, '宗祠照片', '宗祠正门与匾额。', 'medium', 'active', v_editor, now() - interval '50 days', now());
    end if;

    insert into operation_log (clan_id, actor_id, action_type, target_type, target_id, trace_id, revision_id, review_task_id, business_target_type, business_target_id, event_result, branch_id, summary, detail, request_id, client_ip, created_at)
    values
      (v_clan1, v_admin, 'scenario_seed', 'clan', v_clan1, null, null, null, 'clan', v_clan1, 'success', null, '生成当前模型场景数据', '包含人物、关系、来源、审核、权限、文化和迁徙。', 'scenario-seed-current', '127.0.0.1', now()),
      (v_clan1, v_reviewer, 'review_approve', 'review_task', (select id from review_task where revision_id = v_revision_approved limit 1), '11111111-1111-1111-1111-111111111111'::uuid, v_revision_approved, (select id from review_task where revision_id = v_revision_approved limit 1), 'person', p_ancestor, 'success', v_root, '审核通过始迁祖入谱', '场景数据审核通过记录。', 'scenario-review-approved', '127.0.0.1', now() - interval '29 days'),
      (v_clan1, v_editor, 'person_import', 'import_job', v_import_job, null, null, null, 'import_job', v_import_job, 'partial_success', v_long, '人物导入部分成功', '成功18行，失败2行。', 'scenario-import-partial', '127.0.0.1', now() - interval '5 days');
end
$$ language plpgsql;

commit;

\echo 'Current-model scenario data seeded successfully.'
