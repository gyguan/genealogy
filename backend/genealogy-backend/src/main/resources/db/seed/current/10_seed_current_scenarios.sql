\set ON_ERROR_STOP on

-- Deterministic acceptance/demo data for the schema currently implemented on main.
-- Run 00_reset_business_data.sql first. This file is intentionally NOT a Flyway migration.

begin;
select pg_advisory_xact_lock(hashtext('genealogy-current-business-data-reset'));

-- Current login accounts. Password hashes are the same PBKDF2 format used by the
-- existing clean initialization data, so the accounts remain usable by the app.
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
    where username in ('demo_admin','demo_branch_admin','demo_editor','demo_reviewer','demo_viewer')
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
where username in ('demo_admin','demo_branch_admin','demo_editor','demo_reviewer','demo_viewer');

-- The business dataset is created in one block so every generated ID is bound to
-- the correct clan and branch. All names and contact data are synthetic.
do $$
declare
    u_admin bigint;
    u_branch_admin bigint;
    u_editor bigint;
    u_reviewer bigint;
    u_viewer bigint;

    c_zhang bigint;
    c_li bigint;

    b_root bigint;
    b_long bigint;
    b_second bigint;
    b_third bigint;
    b_east bigint;
    b_west bigint;
    b_successor bigint;
    b_li_root bigint;
    b_li_north bigint;

    p_ancestor bigint;
    p_ancestor_spouse bigint;
    p_long bigint;
    p_long_spouse bigint;
    p_second bigint;
    p_second_spouse bigint;
    p_third bigint;
    p_east bigint;
    p_east_spouse bigint;
    p_west bigint;
    p_bio_son bigint;
    p_adopted bigint;
    p_east_child bigint;
    p_west_child bigint;
    p_dual bigint;
    p_living bigint;
    p_same_name bigint;
    p_no_desc bigint;
    p_li_ancestor bigint;
    p_li_child bigint;

    scheme_clan bigint;
    scheme_branch bigint;
    source_book bigint;
    source_chronicle bigint;
    source_oral bigint;
    source_tomb bigint;
    source_private bigint;
    attachment_id bigint;

    culture_origin bigint;
    culture_rule bigint;
    culture_pending bigint;
    culture_rejected bigint;
    migration_official bigint;
    migration_pending bigint;
    site_hall bigint;
    site_cemetery bigint;

    rel_parent bigint;
    rel_spouse bigint;
    rel_adoptive bigint;
    rel_successor bigint;
    rel_out bigint;
    rel_in bigint;
    rel_dual bigint;
    rel_heir bigint;
    rel_no_desc bigint;

    revision_approved bigint;
    revision_pending bigint;
    revision_rejected bigint;
    review_approved bigint;
    review_pending bigint;
    review_rejected bigint;

    import_success bigint;
    import_partial bigint;

    membership_admin bigint;
    membership_branch bigint;
    membership_editor bigint;
    membership_reviewer bigint;
    membership_viewer bigint;

    branch_manager_role bigint;
begin
    select id into strict u_admin from app_user where username = 'demo_admin';
    select id into strict u_branch_admin from app_user where username = 'demo_branch_admin';
    select id into strict u_editor from app_user where username = 'demo_editor';
    select id into strict u_reviewer from app_user where username = 'demo_reviewer';
    select id into strict u_viewer from app_user where username = 'demo_viewer';

    if exists (select 1 from clan where clan_code like 'SCENARIO-%') then
        raise exception 'Scenario clans already exist. Run 00_reset_business_data.sql before reseeding.';
    end if;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        current_places, description, status, created_by, created_at, updated_at
    ) values (
        'SCENARIO-ZHANG-HUAIYANG', '淮阳张氏全场景测试宗族', '张', '百忍堂', '清河郡',
        '河南省周口市淮阳区',
        '["河南省周口市淮阳区","安徽省合肥市","江苏省苏州市","浙江省嘉兴市"]'::jsonb,
        '当前已实现模型的确定性全场景数据：支派树、人物、世系、婚配、宗法承继、来源、审核、导入、文化、迁徙、权限和隐私。',
        'active', u_admin, now() - interval '365 days', now()
    ) returning id into c_zhang;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        current_places, description, status, created_by, created_at, updated_at
    ) values (
        'SCENARIO-LI-LONGXI', '陇西李氏隔离测试宗族', '李', '敦本堂', '陇西郡',
        '甘肃省定西市陇西县', '["甘肃省定西市陇西县","陕西省西安市"]'::jsonb,
        '用于跨宗族隔离、同名人物和权限边界测试。',
        'active', u_admin, now() - interval '180 days', now()
    ) returning id into c_li;

    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, null, '始迁总支', '/SCENARIO-ZHANG/ROOT', 1, 10, '河南淮阳', '安徽合肥', '宗族根支，作为全部房支的共同上级。', 'active') returning id into b_root;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, b_root, '长房', '/SCENARIO-ZHANG/ROOT/LONG', 2, 10, '安徽合肥', '江苏苏州', '长子房，包含东支与西支。', 'active') returning id into b_long;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, b_root, '二房', '/SCENARIO-ZHANG/ROOT/SECOND', 2, 20, '安徽合肥', '浙江嘉兴', '二子房，包含继嗣与出嗣案例。', 'active') returning id into b_second;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, b_root, '三房', '/SCENARIO-ZHANG/ROOT/THIRD', 2, 30, '安徽合肥', '上海松江', '三子房，包含兼祧案例。', 'active') returning id into b_third;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, b_long, '长房东支', '/SCENARIO-ZHANG/ROOT/LONG/EAST', 3, 10, '江苏苏州', '江苏昆山', '用于深层子树和大房系查询。', 'active') returning id into b_east;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, b_long, '长房西支', '/SCENARIO-ZHANG/ROOT/LONG/WEST', 3, 20, '江苏苏州', '江苏无锡', '用于兄弟支派权限隔离。', 'active') returning id into b_west;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_zhang, b_second, '继嗣房', '/SCENARIO-ZHANG/ROOT/SECOND/SUCCESSOR', 3, 10, '浙江嘉兴', '浙江海宁', '宗法承继测试房。', 'inactive') returning id into b_successor;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_li, null, '陇西祖支', '/SCENARIO-LI/ROOT', 1, 10, '甘肃陇西', '陕西西安', '第二宗族根支。', 'active') returning id into b_li_root;
    insert into branch (clan_id, parent_id, branch_name, branch_path, level, sort_order, migration_from, migration_to, description, status)
    values (c_li, b_li_root, '关中北支', '/SCENARIO-LI/ROOT/NORTH', 2, 10, '陕西西安', '陕西咸阳', '跨宗族隔离测试支派。', 'active') returning id into b_li_north;

    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,alias_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,education,title_or_honor,biography,tomb_place,epitaph,has_descendant,lineage_status,privacy_level,data_status,created_by,created_at,updated_by,updated_at)
    values (c_zhang,b_root,'SCN-Z-0001','张明远','张明远','字慎思','明远公','male',1,'明','始迁祖',date '1840-03-12','day',date '1912-09-02','day',false,'河南淮阳','安徽合肥','塾师','家学','始迁祖','由淮阳迁居合肥，主持首次修谱。','合肥祖茔','敦亲睦族，诗礼传家。',true,'normal','public','official',u_admin,now()-interval '350 days',u_admin,now()) returning id into p_ancestor;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,alias_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,education,biography,tomb_place,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_root,'SCN-Z-0002','王淑兰','王氏淑兰','字静和','王氏','female',1,'明','原配',date '1844-07-01','month',date '1918-01-01','year',false,'河南开封','安徽合肥','家务与家塾','家学','始迁祖原配，协助整理家训。','合肥祖茔',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_ancestor_spouse;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,biography,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_long,'SCN-Z-0101','张承德','张承德','字厚生','male',2,'承','长子',date '1868-01-01','year',date '1941-06-01','month',false,'安徽合肥','江苏苏州','商户','长房开房人物。',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_long;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_long,'SCN-Z-0102','李静文','李氏静文','female',2,'承','原配',date '1872-04-01','month',false,'江苏常州','江苏苏州','家务',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_long_spouse;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,biography,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_second,'SCN-Z-0201','张承礼','张承礼','字秉中','male',2,'承','次子',date '1871-01-01','year',date '1945-01-01','year',false,'安徽合肥','浙江嘉兴','乡绅','二房开房人物，存在继嗣记录。',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_second;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_second,'SCN-Z-0202','陈慧芳','陈氏慧芳','female',2,'承','原配',date '1875-01-01','year',false,'浙江嘉兴','浙江嘉兴','家务',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_second_spouse;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_third,'SCN-Z-0301','张承信','张承信','字守诺','male',2,'承','三子',date '1876-01-01','year',date '1950-01-01','year',false,'安徽合肥','上海松江','工匠',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_third;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_east,'SCN-Z-1101','张启文','张启文','字文修','male',3,'启','长房长孙',date '1895-05-10','day',date '1974-01-01','year',false,'江苏苏州','江苏昆山','教师',true,'normal','clan_only','official',u_editor,u_editor) returning id into p_east;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_east,'SCN-Z-1102','刘雅兰','刘氏雅兰','female',3,'启','原配',date '1898-01-01','year',false,'江苏昆山','江苏昆山','家务',true,'normal','clan_only','official',u_editor,u_editor) returning id into p_east_spouse;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_west,'SCN-Z-1201','张启武','张启武','字崇武','male',3,'启','长房次孙',date '1900-01-01','year',date '1981-01-01','year',false,'江苏苏州','江苏无锡','技师',true,'normal','clan_only','official',u_editor,u_editor) returning id into p_west;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_second,'SCN-Z-2101','张启安','张启安','male',3,'启','二房亲生子',date '1902-01-01','year',date '1988-01-01','year',false,'浙江嘉兴','浙江嘉兴','医师',false,'normal','clan_only','official',u_editor,u_editor) returning id into p_bio_son;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,alias_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,biography,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_successor,'SCN-Z-2102','张启和','张启和','字协中','原名张启成','male',3,'启','继嗣子',date '1904-01-01','year',false,'江苏苏州','浙江海宁','商人','出生于长房，后入继二房。',true,'adopted','clan_only','official',u_editor,u_editor) returning id into p_adopted;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_east,'SCN-Z-1111','张俊杰','张俊杰','male',4,'俊','东支长子',date '1928-01-01','year',date '2001-01-01','year',false,'江苏昆山','江苏昆山','会计',true,'normal','clan_only','official',u_editor,u_editor) returning id into p_east_child;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_west,'SCN-Z-1211','张俊杰','张俊杰','male',4,'俊','西支长子',date '1930-01-01','year',true,'江苏无锡','江苏无锡','退休工程师',true,'normal','branch_only','official',u_editor,u_editor) returning id into p_west_child;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,biography,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_third,'SCN-Z-3101','张俊宁','张俊宁','字安之','male',4,'俊','兼祧人',date '1932-01-01','year',true,'上海松江','上海松江','教师','兼承三房与长房西支。',true,'adopted','branch_only','official',u_editor,u_editor) returning id into p_dual;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,education,biography,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_east,'SCN-Z-1112','张泽宇','张泽宇','male',5,'泽','东支曾孙',date '1998-06-18','day',true,'江苏昆山','上海市','软件工程师','本科','在世人员，用于隐私脱敏测试。',false,'normal','private','official',u_editor,u_editor) returning id into p_living;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,alias_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_second,'SCN-Z-2201','张俊杰','张俊杰','同名第三人','male',4,'俊','二房同名人物',null,'unknown',null,'浙江海宁',false,'unknown','private','draft',u_editor,u_editor) returning id into p_same_name;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_zhang,b_third,'SCN-Z-3201','张俊清','张俊清','male',4,'俊','无嗣人物',date '1935-01-01','year',false,'上海松江','上海松江',false,'normal','clan_only','official',u_editor,u_editor) returning id into p_no_desc;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,death_date,death_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_li,b_li_root,'SCN-L-0001','李明远','李明远','字守初','male',1,'明','始祖',date '1850-01-01','year',date '1925-01-01','year',false,'甘肃陇西','陕西西安','商户',true,'normal','public','official',u_admin,u_admin) returning id into p_li_ancestor;
    insert into person (clan_id,branch_id,person_code,name,genealogy_name,gender,generation_no,generation_word,rank_in_family,birth_date,birth_date_precision,is_living,birth_place,residence_place,occupation,has_descendant,lineage_status,privacy_level,data_status,created_by,updated_by)
    values (c_li,b_li_north,'SCN-L-0101','李承安','李承安','male',2,'承','长子',date '1880-01-01','year',false,'陕西西安','陕西咸阳','教师',true,'normal','clan_only','official',u_admin,u_admin) returning id into p_li_child;

    update clan set ancestor_person_id=p_ancestor where id=c_zhang;
    update clan set ancestor_person_id=p_li_ancestor where id=c_li;
    update branch set founder_person_id=p_ancestor where id=b_root;
    update branch set founder_person_id=p_long where id=b_long;
    update branch set founder_person_id=p_second where id=b_second;
    update branch set founder_person_id=p_third where id=b_third;
    update branch set founder_person_id=p_east where id=b_east;
    update branch set founder_person_id=p_west where id=b_west;
    update branch set founder_person_id=p_adopted where id=b_successor;
    update branch set founder_person_id=p_li_ancestor where id=b_li_root;
    update branch set founder_person_id=p_li_child where id=b_li_north;

    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_ancestor,p_long,'parent_child','father','blood',true,true,true,'始祖之长子。','high','official',u_editor) returning id into rel_parent;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values
      (c_zhang,p_ancestor,p_second,'parent_child','father','blood',true,true,true,'始祖之次子。','high','official',u_editor),
      (c_zhang,p_ancestor,p_third,'parent_child','father','blood',true,true,true,'始祖之三子。','high','official',u_editor),
      (c_zhang,p_long,p_east,'parent_child','father','blood',true,true,true,'长房长子。','high','official',u_editor),
      (c_zhang,p_long,p_west,'parent_child','father','blood',true,true,true,'长房次子。','high','official',u_editor),
      (c_zhang,p_second,p_bio_son,'parent_child','father','blood',true,true,true,'二房亲生子。','high','official',u_editor),
      (c_zhang,p_east,p_east_child,'parent_child','father','blood',true,true,true,'东支父子。','high','official',u_editor),
      (c_zhang,p_west,p_west_child,'parent_child','father','blood',true,true,true,'西支父子。','high','official',u_editor),
      (c_zhang,p_third,p_dual,'parent_child','father','blood',true,true,true,'三房生父关系。','high','official',u_editor),
      (c_zhang,p_east_child,p_living,'parent_child','father','blood',true,true,true,'在世人员父子关系。','high','official',u_editor),
      (c_li,p_li_ancestor,p_li_child,'parent_child','father','blood',true,true,true,'第二宗族父子关系。','high','official',u_editor);
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_ancestor,p_ancestor_spouse,'spouse','primary_spouse','marriage',false,false,true,'始祖原配。','high','official',u_editor) returning id into rel_spouse;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values
      (c_zhang,p_long,p_long_spouse,'spouse','primary_spouse','marriage',false,false,true,'长房原配。','high','official',u_editor),
      (c_zhang,p_second,p_second_spouse,'spouse','primary_spouse','marriage',false,false,true,'二房原配。','medium','official',u_editor),
      (c_zhang,p_east,p_east_spouse,'spouse','primary_spouse','marriage',false,false,true,'东支原配。','high','official',u_editor);
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,successor_branch_id,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_second,p_adopted,'adoptive','adoptive_father','ritual','adoptive',b_second,false,false,true,'家庭收养关系。','high','official',u_editor) returning id into rel_adoptive;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,successor_branch_id,succession_reason,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_second,p_adopted,'successor','heir_successor','ritual','successor',b_second,'二房延续香火',true,false,true,'承祧二房正式世系。','high','official',u_editor) returning id into rel_successor;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,successor_branch_id,succession_reason,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_long,p_adopted,'out_adoption','out_adopted','ritual','out_adoption',b_second,'由长房出嗣至二房',false,false,true,'保留原出生房。','high','official',u_editor) returning id into rel_out;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,successor_branch_id,succession_reason,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_second,p_adopted,'in_adoption','in_adopted','ritual','in_adoption',b_second,'由长房入继二房',true,false,true,'入继二房。','high','official',u_editor) returning id into rel_in;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,successor_branch_id,succession_reason,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_west,p_dual,'dual_successor','dual_successor','ritual','dual_successor',b_west,'兼承三房与长房西支',true,false,true,'兼祧第二承继关系。','medium','official',u_editor) returning id into rel_dual;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,successor_branch_id,succession_reason,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_no_desc,p_dual,'heir_son','heir_son','ritual','heir_son',b_third,'无嗣立嗣',true,false,false,'无嗣人物指定嗣子。','medium','pending_review',u_editor) returning id into rel_heir;
    insert into relationship (clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,ritual_relation_type,succession_reason,is_lineage_relation,is_biological,is_primary,description,confidence_level,data_status,created_by)
    values (c_zhang,p_no_desc,p_third,'no_descendant','no_descendant','status','no_descendant','谱载无嗣',false,false,true,'无嗣状态标记。','high','official',u_editor) returning id into rel_no_desc;

    insert into generation_scheme (clan_id,branch_id,scheme_name,poem_text,start_generation,is_default,validation_enabled,strict_mode,status,created_at)
    values (c_zhang,null,'宗族通用十代字辈','明承启俊泽 仁义礼智信',1,true,true,false,'active',now()-interval '300 days') returning id into scheme_clan;
    insert into generation_word (scheme_id,generation_no,word,description,sort_order)
    select scheme_clan,n,w,'宗族通用字辈第'||n||'代',n from unnest(array['明','承','启','俊','泽','仁','义','礼','智','信']) with ordinality t(w,n);
    insert into generation_scheme (clan_id,branch_id,scheme_name,poem_text,start_generation,is_default,validation_enabled,strict_mode,status,created_at)
    values (c_zhang,b_east,'长房东支续派','泽衍昌盛永',5,true,true,true,'active',now()-interval '120 days') returning id into scheme_branch;
    insert into generation_word (scheme_id,generation_no,word,description,sort_order)
    select scheme_branch,n+4,w,'东支续派第'||(n+4)||'代',n from unnest(array['泽','衍','昌','盛','永']) with ordinality t(w,n);

    insert into source (clan_id,source_name,source_type,provider_name,book_title,volume_no,page_no,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'《淮阳张氏宗谱》影印本','genealogy_book','百忍堂理事会','淮阳张氏宗谱','卷一','12-48','民国二十四年','始迁、房支、世次、婚配与字辈原文。','verified','主要谱书来源。','high','clan_only','normal',u_admin,now()-interval '250 days',now()) returning id into source_book;
    insert into source (clan_id,source_name,source_type,provider_name,book_title,volume_no,page_no,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'《嘉兴府志》迁徙条目','local_chronicle','嘉兴地方志馆','嘉兴府志','卷八','213','清末','张氏二房由合肥迁嘉兴。','verified','迁徙旁证。','medium','public','normal',u_admin,now()-interval '200 days',now()) returning id into source_chronicle;
    insert into source (clan_id,source_name,source_type,provider_name,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'长房口述访谈 2026-01','oral_record','演示支派管理员','2026-01-08','记录继嗣、出嗣与同名人物辨识。','unverified','部分说法仍待复核。','low','branch_only','normal',u_editor,now()-interval '90 days',now()) returning id into source_oral;
    insert into source (clan_id,source_name,source_type,provider_name,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'张明远墓碑拓片','tombstone','合肥祖茔管理人','1912','碑文载生卒与始迁事迹。','verified','墓碑影像及释文。','high','clan_only','sensitive',u_admin,now()-interval '180 days',now()) returning id into source_tomb;
    insert into source (clan_id,source_name,source_type,provider_name,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'在世人员联系方式底稿','archive','演示管理员','2026-02','仅用于隐私权限测试。','unverified','受限测试来源。','unknown','private','high',u_admin,now()-interval '30 days',now()) returning id into source_private;

    insert into source_attachment (source_id,clan_id,original_filename,stored_filename,content_type,file_size,storage_path,checksum,upload_status,privacy_level,sensitive_level,created_by,created_at)
    values (source_book,c_zhang,'淮阳张氏宗谱_卷一_样例.pdf','scenario_zhang_book_v1.pdf','application/pdf',1048576,'data/uploads/scenario/scenario_zhang_book_v1.pdf',md5('scenario-book'),'metadata_only','clan_only','normal',u_admin,now()-interval '200 days') returning id into attachment_id;
    insert into source_attachment (source_id,clan_id,original_filename,stored_filename,content_type,file_size,storage_path,checksum,upload_status,privacy_level,sensitive_level,created_by,created_at)
    values (source_private,c_zhang,'隐私材料_样例.txt','scenario_private.txt','text/plain',2048,'data/uploads/scenario/scenario_private.txt',md5('scenario-private'),'metadata_only','private','high',u_admin,now()-interval '20 days');

    insert into source_binding (clan_id,source_id,target_type,target_id,binding_reason,excerpt,confidence_level,binding_status,created_by,created_at,updated_at)
    values
      (c_zhang,source_book,'person',p_ancestor,'谱书人物记载','卷一载始迁祖姓名、生卒与迁徙。','high','active',u_admin,now()-interval '190 days',now()),
      (c_zhang,source_book,'relationship',rel_parent,'谱书父子记载','卷一世系表。','high','active',u_admin,now()-interval '190 days',now()),
      (c_zhang,source_chronicle,'branch',b_second,'地方志迁徙旁证','二房迁嘉兴条目。','medium','active',u_admin,now()-interval '150 days',now()),
      (c_zhang,source_oral,'relationship',rel_dual,'兼祧口述资料','访谈中说明兼承两房。','low','pending_review',u_editor,now()-interval '60 days',now()),
      (c_zhang,source_tomb,'person',p_ancestor,'墓碑生卒旁证','拓片载卒年。','high','active',u_admin,now()-interval '140 days',now()),
      (c_zhang,source_private,'person',p_living,'在世人员隐私材料','仅验证受限可见性。','unknown','active',u_admin,now()-interval '20 days',now()),
      (c_zhang,source_book,'generation_word',(select id from generation_word where scheme_id=scheme_clan and generation_no=1),'字辈来源','谱首字派。','high','active',u_admin,now()-interval '180 days',now());

    insert into person_event (clan_id,person_id,event_type,event_title,event_date,event_date_precision,event_place,event_description,source_type,source_id,sort_order,data_status,created_by,created_at,updated_at)
    values
      (c_zhang,p_ancestor,'birth','出生',date '1840-03-12','day','河南淮阳','始迁祖出生。','source',source_book,10,'official',u_admin,now()-interval '180 days',now()),
      (c_zhang,p_ancestor,'migration','迁居合肥',date '1860-01-01','year','安徽合肥','由淮阳迁居合肥。','source',source_chronicle,30,'official',u_admin,now()-interval '175 days',now()),
      (c_zhang,p_ancestor,'death','逝世',date '1912-09-02','day','安徽合肥','葬于合肥祖茔。','source',source_tomb,90,'official',u_admin,now()-interval '170 days',now()),
      (c_zhang,p_adopted,'adoption','入继二房',date '1918-01-01','year','浙江嘉兴','由长房出嗣并入继二房。','relationship',rel_in,50,'official',u_editor,now()-interval '100 days',now()),
      (c_zhang,p_dual,'succession','兼祧两房',date '1955-01-01','year','上海松江','兼承三房与长房西支。','relationship',rel_dual,55,'official',u_editor,now()-interval '80 days',now()),
      (c_zhang,p_living,'education','大学毕业',date '2020-06-01','month','上海','在世人员脱敏事件。','source',source_private,60,'official',u_editor,now()-interval '10 days',now());

    if to_regclass('public.culture_item') is not null then
      insert into culture_item (clan_id,branch_id,category,title,summary,content,historical_period,location_text,confidence_level,privacy_level,sensitive_level,data_status,featured_on_home,sort_order,created_by,created_at,updated_at,version)
      values (c_zhang,null,'surname_origin','张氏得姓源流','宗族首页展示的姓氏源流。','测试正文。','先秦至明清','河南淮阳','high','public','normal','official',true,10,u_editor,now()-interval '120 days',now(),0) returning id into culture_origin;
      insert into culture_item (clan_id,branch_id,category,title,summary,content,historical_period,location_text,confidence_level,privacy_level,sensitive_level,data_status,featured_on_home,sort_order,created_by,created_at,updated_at,version)
      values (c_zhang,b_root,'clan_rule','百忍堂家规十则','宗族级家规。','虚构测试内容。','民国修订','安徽合肥','medium','clan_only','normal','official',true,20,u_editor,now()-interval '100 days',now(),0) returning id into culture_rule;
      insert into culture_item (clan_id,branch_id,category,title,summary,content,historical_period,location_text,confidence_level,privacy_level,sensitive_level,data_status,featured_on_home,sort_order,created_by,created_at,updated_at,version)
      values (c_zhang,b_east,'person_story','张启文执教故事','待审核文化资料。','口述整理稿。','二十世纪中叶','江苏昆山','low','branch_only','normal','pending_review',false,30,u_editor,now()-interval '20 days',now(),0) returning id into culture_pending;
      insert into culture_item (clan_id,branch_id,category,title,summary,content,historical_period,location_text,confidence_level,privacy_level,sensitive_level,data_status,featured_on_home,sort_order,created_by,created_at,updated_at,version)
      values (c_zhang,b_second,'custom_tradition','二房祭祖习俗旧稿','已驳回文化资料。','缺少来源。','不详','浙江嘉兴','unknown','private','sensitive','rejected',false,40,u_editor,now()-interval '15 days',now(),1) returning id into culture_rejected;
      insert into source_binding (clan_id,source_id,target_type,target_id,binding_reason,excerpt,confidence_level,binding_status,created_by,created_at,updated_at)
      values
        (c_zhang,source_book,'culture_item',culture_origin,'谱书序言来源','谱序记载姓氏源流。','high','active',u_editor,now()-interval '80 days',now()),
        (c_zhang,source_book,'culture_item',culture_rule,'家规来源','卷首家规。','high','active',u_editor,now()-interval '80 days',now()),
        (c_zhang,source_oral,'culture_item',culture_pending,'口述来源','待审核访谈摘要。','low','pending_review',u_editor,now()-interval '10 days',now());
    end if;

    if to_regclass('public.migration_event') is not null then
      insert into migration_event (clan_id,branch_id,sequence_no,from_location,to_location,migration_time_text,founder_person_id,reason,description,confidence_level,privacy_level,sensitive_level,data_status,created_by,created_at,updated_at,version)
      values (c_zhang,b_root,1,'河南省周口市淮阳区','安徽省合肥市','清咸丰十年（约1860年）',p_ancestor,'避乱与经商','始迁祖携家迁居合肥。','medium','public','normal','official',u_editor,now()-interval '110 days',now(),0) returning id into migration_official;
      insert into migration_event (clan_id,branch_id,sequence_no,from_location,to_location,migration_time_text,founder_person_id,reason,description,confidence_level,privacy_level,sensitive_level,data_status,created_by,created_at,updated_at,version)
      values (c_zhang,b_second,2,'安徽省合肥市','浙江省嘉兴市','清末民初',p_second,'经商定居','等待地方志复核。','low','branch_only','normal','pending_review',u_editor,now()-interval '25 days',now(),0) returning id into migration_pending;
      insert into source_binding (clan_id,source_id,target_type,target_id,binding_reason,excerpt,confidence_level,binding_status,created_by,created_at,updated_at)
      values
        (c_zhang,source_chronicle,'migration_event',migration_official,'迁徙地点旁证','地方志迁徙条目。','medium','active',u_editor,now()-interval '75 days',now()),
        (c_zhang,source_oral,'migration_event',migration_pending,'迁徙口述资料','待审核访谈。','low','pending_review',u_editor,now()-interval '10 days',now());
    end if;

    if to_regclass('public.culture_site') is not null then
      insert into culture_site (clan_id,branch_id,related_person_id,site_type,site_name,address_text,founded_period,current_status,summary,description,latitude,longitude,confidence_level,privacy_level,sensitive_level,data_status,featured_on_home,sort_order,created_by,created_at,updated_at,version)
      values (c_zhang,b_root,p_ancestor,'ancestral_hall','百忍堂张氏宗祠','安徽省合肥市测试地址','民国初年','修缮开放','宗族首页文化场所。','虚构测试宗祠。',31.82,117.22,'high','public','normal','official',true,10,u_editor,now()-interval '90 days',now(),0) returning id into site_hall;
      insert into culture_site (clan_id,branch_id,related_person_id,site_type,site_name,address_text,founded_period,current_status,summary,description,latitude,longitude,confidence_level,privacy_level,sensitive_level,data_status,featured_on_home,sort_order,created_by,created_at,updated_at,version)
      values (c_zhang,b_root,p_ancestor,'cemetery','合肥张氏祖茔','安徽省合肥市测试祖茔','清末','受保护','敏感文化场所。','不含真实坐标。',31.81,117.21,'medium','private','high','official',false,20,u_admin,now()-interval '85 days',now(),0) returning id into site_cemetery;
      insert into source_binding (clan_id,source_id,target_type,target_id,binding_reason,excerpt,confidence_level,binding_status,created_by,created_at,updated_at)
      values (c_zhang,source_tomb,'culture_site',site_cemetery,'墓碑与祖茔关联','墓碑拓片拍摄于测试祖茔。','medium','active',u_admin,now()-interval '70 days',now());
    end if;

    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (c_zhang,'11111111-1111-1111-1111-111111111111','person',p_ancestor,'modified',jsonb_build_object('dataStatus','draft'),jsonb_build_object('dataStatus','official'),'始迁祖资料正式入谱。',u_editor,now()-interval '60 days','approved',now()-interval '59 days',null) returning id into revision_approved;
    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    values (c_zhang,revision_approved,'11111111-1111-1111-1111-111111111111',1,u_reviewer,'reviewer',b_root,'approved','谱书与墓碑证据一致。',now()-interval '59 days',now()-interval '60 days') returning id into review_approved;
    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (c_zhang,'22222222-2222-2222-2222-222222222222','relationship',rel_heir,'created',null,jsonb_build_object('relationType','heir_son'),'无嗣立嗣关系等待审核。',u_editor,now()-interval '5 days','pending',null,null) returning id into revision_pending;
    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    values (c_zhang,revision_pending,'22222222-2222-2222-2222-222222222222',1,u_reviewer,'reviewer',b_third,'pending','等待补充谱书页码。',null,now()-interval '5 days') returning id into review_pending;
    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (c_zhang,'33333333-3333-3333-3333-333333333333','source',source_oral,'modified',jsonb_build_object('verificationStatus','unverified'),jsonb_build_object('verificationStatus','verified'),'口述资料证据不足。',u_editor,now()-interval '10 days','rejected',null,'缺少受访人确认与原始录音。') returning id into revision_rejected;
    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    values (c_zhang,revision_rejected,'33333333-3333-3333-3333-333333333333',1,u_reviewer,'reviewer',b_long,'rejected','补齐原始材料后重新提交。',now()-interval '9 days',now()-interval '10 days') returning id into review_rejected;

    insert into import_job (clan_id,branch_id,import_type,file_format,original_filename,idempotency_key,total_count,success_count,failure_count,skipped_count,status,processing_status,review_status,review_round,error_summary,execution_mode,execution_status,execution_stage,cursor_row_no,processed_count,published_count,chunk_size,execution_retry_count,execution_max_retries,manual_intervention_required,created_by,created_at,updated_at,completed_at)
    values (c_zhang,b_east,'person','csv','东支人物成功导入.csv','scenario-person-success',20,20,0,0,'completed','ready_for_review','approved',1,null,'sync','completed','completed',20,20,20,200,0,3,false,u_editor,now()-interval '12 days',now()-interval '12 days',now()-interval '12 days') returning id into import_success;
    insert into import_job (clan_id,branch_id,import_type,file_format,original_filename,idempotency_key,total_count,success_count,failure_count,skipped_count,status,processing_status,review_status,review_round,error_summary,execution_mode,execution_status,execution_stage,cursor_row_no,processed_count,published_count,chunk_size,execution_retry_count,execution_max_retries,manual_intervention_required,created_by,created_at,updated_at,completed_at)
    values (c_zhang,b_second,'relationship','xlsx','二房关系部分失败.xlsx','scenario-relation-partial',12,9,2,1,'partial_failed','correction_required','not_submitted',0,'第5、8行人物编码无效。','async','partial_failed','failed',12,12,9,200,1,3,true,u_editor,now()-interval '3 days',now()-interval '2 days',now()-interval '2 days') returning id into import_partial;
    insert into import_job_error (job_id,row_no,error_message,raw_data,created_at)
    values (import_partial,5,'父人物编码不存在','SCN-Z-NOT-FOUND,SCN-Z-2101,parent_child',now()-interval '2 days'),(import_partial,8,'关系类型不受支持','SCN-Z-0201,SCN-Z-2102,unknown_relation',now()-interval '2 days');

    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_admin,p_ancestor,'joined','active',u_admin,now()-interval '100 days',u_admin,now()-interval '100 days',u_admin,now()) returning id into membership_admin;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_branch_admin,p_west_child,'joined','active',u_admin,now()-interval '90 days',u_admin,now()-interval '90 days',u_admin,now()) returning id into membership_branch;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_editor,p_east_child,'joined','active',u_admin,now()-interval '80 days',u_admin,now()-interval '80 days',u_admin,now()) returning id into membership_editor;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_reviewer,p_dual,'joined','active',u_admin,now()-interval '70 days',u_admin,now()-interval '70 days',u_admin,now()) returning id into membership_reviewer;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_viewer,p_living,'joined','active',u_admin,now()-interval '60 days',u_admin,now()-interval '60 days',u_admin,now()) returning id into membership_viewer;
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_admin,id,'clan',c_zhang,'active',u_admin,now()-interval '100 days',u_admin,now()-interval '100 days',u_admin,now() from app_role where role_code='clan_admin';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_branch,id,'branch',b_long,'active',u_admin,now()-interval '90 days',u_admin,now()-interval '90 days',u_admin,now() from app_role where role_code='branch_admin' returning id into branch_manager_role;
    update branch set manager_member_id=branch_manager_role,updated_at=now() where id in (b_long,b_east,b_west);
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_editor,id,'branch',b_east,'active',u_admin,now()-interval '80 days',u_admin,now()-interval '80 days',u_admin,now() from app_role where role_code='editor';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_reviewer,id,'clan',c_zhang,'active',u_admin,now()-interval '70 days',u_admin,now()-interval '70 days',u_admin,now() from app_role where role_code='reviewer';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_viewer,id,'self',p_living,'active',u_admin,now()-interval '60 days',u_admin,now()-interval '60 days',u_admin,now() from app_role where role_code='viewer';
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_li,u_admin,p_li_ancestor,'joined','active',u_admin,now()-interval '50 days',u_admin,now()-interval '50 days',u_admin,now());
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select cm.id,r.id,'clan',c_li,'active',u_admin,now()-interval '50 days',u_admin,now()-interval '50 days',u_admin,now() from clan_membership cm join app_role r on r.role_code='clan_admin' where cm.clan_id=c_li and cm.user_id=u_admin;

    insert into operation_log (clan_id,actor_id,action_type,target_type,target_id,trace_id,revision_id,review_task_id,business_target_type,business_target_id,event_result,risk_level,risk_event_type,disposition_status,branch_id,summary,detail,request_id,client_ip,created_at)
    values
      (c_zhang,u_admin,'seed_current_scenarios','clan',c_zhang,null,null,null,'clan',c_zhang,'success','low',null,'closed',null,'创建当前模型全场景测试数据','支派、人物、关系、来源、审核、导入、文化、迁徙与权限。','scenario-seed-zhang','127.0.0.1',now()-interval '1 day'),
      (c_zhang,u_reviewer,'review_approve','review_task',review_approved,'11111111-1111-1111-1111-111111111111',revision_approved,review_approved,'person',p_ancestor,'success','medium','formal_data_change','closed',b_root,'始迁祖资料审核通过','证据完整。','scenario-review-approved','127.0.0.1',now()-interval '59 days'),
      (c_zhang,u_reviewer,'review_reject','review_task',review_rejected,'33333333-3333-3333-3333-333333333333',revision_rejected,review_rejected,'source',source_oral,'rejected','medium','review_exception','closed',b_long,'口述来源审核驳回','缺少原始录音和签名。','scenario-review-rejected','127.0.0.1',now()-interval '9 days'),
      (c_zhang,u_viewer,'source_attachment_download_denied','source_attachment',attachment_id,null,null,null,'source',source_private,'denied','high','sensitive_attachment_access','open',b_east,'受限附件下载被拒绝',null,'scenario-risk-denied','127.0.0.1',now()-interval '1 hour'),
      (c_zhang,u_editor,'import_partial_failed','import_job',import_partial,null,null,null,'import_job',import_partial,'partial_failed','medium','bulk_import_failure','investigating',b_second,'关系导入部分失败','2行失败。','scenario-import-partial','127.0.0.1',now()-interval '2 days');
end $$;

commit;

\echo 'Current-schema acceptance scenarios created.'
