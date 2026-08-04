\set ON_ERROR_STOP on

-- Deterministic acceptance data for the schema currently implemented on main.
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

do $$
declare
    u_admin bigint := (select id from app_user where username = 'demo_admin');
    u_branch bigint := (select id from app_user where username = 'demo_branch_admin');
    u_editor bigint := (select id from app_user where username = 'demo_editor');
    u_reviewer bigint := (select id from app_user where username = 'demo_reviewer');
    u_viewer bigint := (select id from app_user where username = 'demo_viewer');
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
    scheme_clan bigint;
    scheme_east bigint;
    src_book bigint;
    src_chronicle bigint;
    src_oral bigint;
    src_tomb bigint;
    src_private bigint;
    rev_approved bigint;
    rev_pending bigint;
    rev_rejected bigint;
    task_approved bigint;
    task_pending bigint;
    task_rejected bigint;
    import_success bigint;
    import_partial bigint;
    membership_admin bigint;
    membership_branch bigint;
    membership_editor bigint;
    membership_reviewer bigint;
    membership_viewer bigint;
    membership_li bigint;
    branch_role_assignment bigint;
begin
    if u_admin is null or u_branch is null or u_editor is null or u_reviewer is null or u_viewer is null then
        raise exception 'Required demo accounts are incomplete';
    end if;
    if exists(select 1 from clan where clan_code like 'SCENARIO-%') then
        raise exception 'Scenario data already exists; run 00_reset_business_data.sql first';
    end if;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        current_places, description, status, created_by, created_at, updated_at
    ) values (
        'SCENARIO-ZHANG-HUAIYANG', '淮阳张氏全场景测试宗族', '张', '百忍堂', '清河郡',
        '河南省周口市淮阳区',
        '["河南省周口市淮阳区","安徽省合肥市","江苏省苏州市","浙江省嘉兴市"]'::jsonb,
        '覆盖当前已实现的支派、人物、关系、来源、审核、导入、文化、迁徙、权限和隐私场景。',
        'active', u_admin, now() - interval '365 days', now()
    ) returning id into c_zhang;

    insert into clan (
        clan_code, clan_name, surname, hall_name, commandery, origin_place,
        current_places, description, status, created_by, created_at, updated_at
    ) values (
        'SCENARIO-LI-LONGXI', '陇西李氏隔离测试宗族', '李', '敦本堂', '陇西郡',
        '甘肃省定西市陇西县', '["甘肃省定西市陇西县","陕西省西安市"]'::jsonb,
        '用于跨宗族引用、同名人物和授权隔离测试。',
        'active', u_admin, now() - interval '180 days', now()
    ) returning id into c_li;

    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,null,'始迁总支','/SCENARIO-ZHANG/ROOT',1,10,'河南淮阳','安徽合肥','宗族根支。','official',now()-interval '300 days',now()) returning id into b_root;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,b_root,'长房','/SCENARIO-ZHANG/ROOT/LONG',2,10,'安徽合肥','江苏苏州','长房。','official',now()-interval '290 days',now()) returning id into b_long;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,b_root,'二房','/SCENARIO-ZHANG/ROOT/SECOND',2,20,'安徽合肥','浙江嘉兴','二房。','official',now()-interval '290 days',now()) returning id into b_second;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,b_root,'三房','/SCENARIO-ZHANG/ROOT/THIRD',2,30,'安徽合肥','上海松江','三房。','official',now()-interval '290 days',now()) returning id into b_third;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,b_long,'长房东支','/SCENARIO-ZHANG/ROOT/LONG/EAST',3,10,'江苏苏州','江苏昆山','深层子树。','official',now()-interval '280 days',now()) returning id into b_east;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,b_long,'长房西支','/SCENARIO-ZHANG/ROOT/LONG/WEST',3,20,'江苏苏州','江苏无锡','兄弟支派权限隔离。','official',now()-interval '280 days',now()) returning id into b_west;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_zhang,b_second,'继嗣房','/SCENARIO-ZHANG/ROOT/SECOND/SUCCESSOR',3,10,'浙江嘉兴','浙江海宁','已归档继嗣房。','archived',now()-interval '270 days',now()) returning id into b_successor;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_li,null,'陇西祖支','/SCENARIO-LI/ROOT',1,10,'甘肃陇西','陕西西安','第二宗族根支。','official',now()-interval '170 days',now()) returning id into b_li_root;
    insert into branch (clan_id,parent_id,branch_name,branch_path,level,sort_order,migration_from,migration_to,description,status,created_at,updated_at)
    values (c_li,b_li_root,'关中北支','/SCENARIO-LI/ROOT/NORTH',2,10,'陕西西安','陕西咸阳','跨宗族隔离支派。','official',now()-interval '160 days',now()) returning id into b_li_north;


    -- Match BranchApplicationService: roots use their own id; descendants append child ids.
    update branch set branch_path=b_root::text,level=1 where id=b_root;
    update branch set branch_path=b_root::text||'/'||b_long,level=2 where id=b_long;
    update branch set branch_path=b_root::text||'/'||b_second,level=2 where id=b_second;
    update branch set branch_path=b_root::text||'/'||b_third,level=2 where id=b_third;
    update branch set branch_path=b_root::text||'/'||b_long||'/'||b_east,level=3 where id=b_east;
    update branch set branch_path=b_root::text||'/'||b_long||'/'||b_west,level=3 where id=b_west;
    update branch set branch_path=b_root::text||'/'||b_second||'/'||b_successor,level=3 where id=b_successor;
    update branch set branch_path=b_li_root::text,level=1 where id=b_li_root;
    update branch set branch_path=b_li_root::text||'/'||b_li_north,level=2 where id=b_li_north;

    create temporary table seed_person_input (
        clan_id bigint, branch_id bigint, person_code text, person_name text,
        gender text, generation_no integer, generation_word text,
        birth_date date, birth_precision text, death_date date,
        death_precision text, is_living boolean, privacy_level text,
        data_status text, lineage_status text, alias_name text
    ) on commit drop;

    insert into seed_person_input values
      (c_zhang,b_root,'SCN-Z-0001','张明远','male',1,'明',date '1840-03-12','day',date '1912-09-02','day',false,'public','official','normal','明远公'),
      (c_zhang,b_root,'SCN-Z-0002','王淑兰','female',1,'明',date '1844-07-01','month',date '1918-01-01','year',false,'clan_only','official','normal','王氏'),
      (c_zhang,b_long,'SCN-Z-0101','张承德','male',2,'承',date '1868-01-01','year',date '1941-06-01','month',false,'clan_only','official','normal',null),
      (c_zhang,b_long,'SCN-Z-0102','李静文','female',2,'承',date '1872-04-01','month',date '1950-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_second,'SCN-Z-0201','张承礼','male',2,'承',date '1871-01-01','year',date '1945-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_second,'SCN-Z-0202','陈慧芳','female',2,'承',date '1875-01-01','year',date '1953-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_third,'SCN-Z-0301','张承信','male',2,'承',date '1876-01-01','year',date '1950-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_east,'SCN-Z-1101','张启文','male',3,'启',date '1895-05-10','day',date '1974-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_east,'SCN-Z-1102','刘雅兰','female',3,'启',date '1898-01-01','year',date '1980-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_west,'SCN-Z-1201','张启武','male',3,'启',date '1900-01-01','year',date '1981-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_second,'SCN-Z-2101','张启安','male',3,'启',date '1902-01-01','year',date '1988-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_successor,'SCN-Z-2102','张启和','male',3,'启',date '1904-01-01','year',date '1986-01-01','year',false,'clan_only','official','adopted','原名张启成'),
      (c_zhang,b_east,'SCN-Z-1111','张俊杰','male',4,'俊',date '1928-01-01','year',date '2001-01-01','year',false,'clan_only','official','normal',null),
      (c_zhang,b_west,'SCN-Z-1211','张俊杰','male',4,'俊',date '1930-01-01','year',null,'unknown',true,'branch_only','official','normal',null),
      (c_zhang,b_third,'SCN-Z-3101','张俊宁','male',4,'俊',date '1932-01-01','year',null,'unknown',true,'branch_only','official','adopted','兼祧人'),
      (c_zhang,b_east,'SCN-Z-1112','张泽宇','male',5,'泽',date '1998-06-18','day',null,'unknown',true,'private','official','normal',null),
      (c_zhang,b_second,'SCN-Z-2201','张俊杰','male',4,'俊',null,'unknown',null,'unknown',null,'private','draft','unknown','同名第三人'),
      (c_zhang,b_third,'SCN-Z-3201','张俊清','male',4,'俊',date '1935-01-01','year',date '2010-01-01','year',false,'clan_only','official','normal','无嗣人物'),
      (c_li,b_li_root,'SCN-L-0001','李明远','male',1,'明',date '1850-01-01','year',date '1925-01-01','year',false,'public','official','normal',null),
      (c_li,b_li_north,'SCN-L-0101','李承安','male',2,'承',date '1880-01-01','year',date '1960-01-01','year',false,'clan_only','official','normal',null);

    insert into person (
        clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,alias_name,
        gender,generation_no,generation_word,rank_in_family,birth_date,
        birth_date_precision,death_date,death_date_precision,is_living,
        birth_place,residence_place,occupation,education,title_or_honor,
        biography,tomb_place,epitaph,has_descendant,lineage_status,
        privacy_level,data_status,created_by,created_at,updated_by,updated_at,deleted_at
    )
    select clan_id,branch_id,person_code,person_name,person_name,
           case when gender='male' then '字'||coalesce(generation_word,'未详')||'修' else null end,
           alias_name,gender,generation_no,generation_word,
           null,
           birth_date,birth_precision,death_date,death_precision,is_living,
           '虚构出生地',case when is_living is null then null else '虚构居住地' end,
           case when is_living=true then '现代职业' else '历史职业' end,
           case when generation_no>=4 then '现代教育' else '家学' end,
           case when generation_no=1 then '始迁祖' else null end,
           person_name||'为全场景测试使用的虚构人物，不对应真实个人。',
           case when is_living=false then '虚构祖茔' else null end,
           case when is_living=false and generation_no=1 then '虚构墓志摘要。' else null end,
           person_code not in ('SCN-Z-2201','SCN-Z-3201'),lineage_status,
           privacy_level,data_status,u_editor,now()-interval '250 days',u_editor,now(),null
    from seed_person_input;

    update clan set ancestor_person_id=(select id from person where person_code='SCN-Z-0001') where id=c_zhang;
    update clan set ancestor_person_id=(select id from person where person_code='SCN-L-0001') where id=c_li;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-0001') where id=b_root;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-0101') where id=b_long;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-0201') where id=b_second;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-0301') where id=b_third;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-1101') where id=b_east;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-1201') where id=b_west;
    update branch set founder_person_id=(select id from person where person_code='SCN-Z-2102') where id=b_successor;
    update branch set founder_person_id=(select id from person where person_code='SCN-L-0001') where id=b_li_root;
    update branch set founder_person_id=(select id from person where person_code='SCN-L-0101') where id=b_li_north;

    create temporary table seed_relation_input (
        clan_id bigint,from_code text,to_code text,relation_type text,
        relation_label text,relation_category text,ritual_type text,
        successor_branch_id bigint,succession_reason text,
        lineage boolean,biological boolean,primary_flag boolean,data_status text
    ) on commit drop;
    insert into seed_relation_input values
      (c_zhang,'SCN-Z-0001','SCN-Z-0101','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0001','SCN-Z-0201','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0001','SCN-Z-0301','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0101','SCN-Z-1101','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0101','SCN-Z-1201','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0201','SCN-Z-2101','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-1101','SCN-Z-1111','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-1201','SCN-Z-1211','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0301','SCN-Z-3101','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-1111','SCN-Z-1112','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_li,'SCN-L-0001','SCN-L-0101','parent_child','biological_father','blood',null,null,null,true,true,true,'official'),
      (c_zhang,'SCN-Z-0001','SCN-Z-0002','spouse','spouse','marriage',null,null,null,false,false,true,'official'),
      (c_zhang,'SCN-Z-0002','SCN-Z-0001','spouse','spouse','marriage',null,null,null,false,false,false,'official'),
      (c_zhang,'SCN-Z-0101','SCN-Z-0102','spouse','spouse','marriage',null,null,null,false,false,true,'official'),
      (c_zhang,'SCN-Z-0102','SCN-Z-0101','spouse','spouse','marriage',null,null,null,false,false,false,'official'),
      (c_zhang,'SCN-Z-0201','SCN-Z-0202','spouse','second_spouse','marriage',null,null,null,false,false,true,'official'),
      (c_zhang,'SCN-Z-0202','SCN-Z-0201','spouse','second_spouse','marriage',null,null,null,false,false,false,'official'),
      (c_zhang,'SCN-Z-0201','SCN-Z-2102','adoptive','legal_father','ritual','adoptive',b_second,'家庭收养关系',false,false,true,'official'),
      (c_zhang,'SCN-Z-0201','SCN-Z-2102','successor','heir_successor','ritual','successor',b_second,'二房延续香火',true,false,true,'official'),
      (c_zhang,'SCN-Z-0101','SCN-Z-2102','out_adoption','out_adopted','ritual','out_adoption',b_second,'由长房出嗣至二房',false,false,true,'official'),
      (c_zhang,'SCN-Z-0201','SCN-Z-2102','in_adoption','legal_father','ritual','in_adoption',b_second,'由长房入继二房',true,false,true,'official'),
      (c_zhang,'SCN-Z-1201','SCN-Z-3101','dual_successor','dual_successor','ritual','dual_successor',b_west,'兼承三房与长房西支',true,false,true,'official'),
      (c_zhang,'SCN-Z-3201','SCN-Z-1112','heir_son','heir_son','ritual','heir_son',b_third,'无嗣立嗣',true,false,false,'pending_review'),
      (c_zhang,'SCN-Z-3201','SCN-Z-3201','no_descendant','no_descendant','status','no_descendant',null,'谱载无嗣',false,false,true,'official');

    insert into relationship (
        clan_id,from_person_id,to_person_id,relation_type,relation_label,
        relation_category,ritual_relation_type,succession_reason,successor_branch_id,
        is_lineage_relation,is_biological,is_primary,description,confidence_level,
        data_status,created_by,created_at,updated_at,deleted_at
    )
    select r.clan_id,f.id,t.id,r.relation_type,r.relation_label,r.relation_category,
           r.ritual_type,r.succession_reason,r.successor_branch_id,r.lineage,
           r.biological,r.primary_flag,'当前关系模型全场景测试。',
           case when r.data_status='pending_review' then 'medium' else 'high' end,
           r.data_status,u_editor,now()-interval '150 days',now(),null
    from seed_relation_input r
    join person f on f.person_code=r.from_code
    join person t on t.person_code=r.to_code;

    insert into generation_scheme (clan_id,branch_id,scheme_name,poem_text,start_generation,is_default,validation_enabled,strict_mode,status,created_at)
    values (c_zhang,null,'宗族通用十代字辈','明承启俊泽 仁义礼智信',1,true,true,false,'official',now()-interval '200 days') returning id into scheme_clan;
    insert into generation_word (scheme_id,generation_no,word,description,sort_order)
    select scheme_clan,n::integer,w,'宗族通用字辈第'||n||'代',n::integer
    from unnest(array['明','承','启','俊','泽','仁','义','礼','智','信']) with ordinality t(w,n);
    insert into generation_scheme (clan_id,branch_id,scheme_name,poem_text,start_generation,is_default,validation_enabled,strict_mode,status,created_at)
    values (c_zhang,b_east,'长房东支续派','泽衍昌盛永',5,true,true,true,'official',now()-interval '100 days') returning id into scheme_east;
    insert into generation_word (scheme_id,generation_no,word,description,sort_order)
    select scheme_east,(n+4)::integer,w,'东支续派第'||(n+4)||'代',n::integer
    from unnest(array['泽','衍','昌','盛','永']) with ordinality t(w,n);

    insert into source (clan_id,source_name,source_type,provider_name,book_title,volume_no,page_no,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'《淮阳张氏宗谱》影印本','genealogy_book','虚构理事会','淮阳张氏宗谱','卷一','12-48','民国二十四年','测试摘录。','official','主要谱书来源。','high','clan_only','normal',u_admin,now()-interval '120 days',now()) returning id into src_book;
    insert into source (clan_id,source_name,source_type,provider_name,book_title,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'《嘉兴府志》迁徙条目','local_chronicle','虚构地方志馆','嘉兴府志','清末','测试摘录。','official','迁徙旁证。','medium','public','normal',u_admin,now()-interval '110 days',now()) returning id into src_chronicle;
    insert into source (clan_id,source_name,source_type,provider_name,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'长房口述访谈 2026-01','oral_history','虚构访谈人','2026-01','测试摘录。','rejected','审核驳回，待补充原始录音。','low','branch_only','normal',u_editor,now()-interval '90 days',now()) returning id into src_oral;
    insert into source (clan_id,source_name,source_type,provider_name,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'张明远墓碑拓片','tombstone','虚构祖茔管理人','1912','测试摘录。','official','墓碑影像及释文。','high','clan_only','sensitive',u_admin,now()-interval '80 days',now()) returning id into src_tomb;
    insert into source (clan_id,source_name,source_type,provider_name,source_date,excerpt,verification_status,description,confidence_level,privacy_level,sensitive_level,created_by,created_at,updated_at)
    values (c_zhang,'在世人员隐私材料底稿','archive','虚构管理员','2026-02','仅用于隐私测试。','official','受限测试来源。','unknown','private','highly_sensitive',u_admin,now()-interval '20 days',now()) returning id into src_private;

    insert into source_attachment (source_id,clan_id,original_filename,stored_filename,content_type,file_size,storage_path,checksum,upload_status,privacy_level,sensitive_level,created_by,created_at,deleted_at)
    values
      (src_book,c_zhang,'宗谱样例.pdf','scenario_book.pdf','application/pdf',1048576,'data/uploads/scenario/scenario_book.pdf',md5('scenario-book'),'metadata_only','clan_only','normal',u_admin,now()-interval '70 days',null),
      (src_private,c_zhang,'隐私材料样例.txt','scenario_private.txt','text/plain',2048,'data/uploads/scenario/scenario_private.txt',md5('scenario-private'),'metadata_only','private','highly_sensitive',u_admin,now()-interval '10 days',null);

    insert into source_binding (clan_id,source_id,target_type,target_id,binding_reason,excerpt,confidence_level,binding_status,created_by,created_at,updated_at)
    values
      (c_zhang,src_book,'person',(select id from person where person_code='SCN-Z-0001'),'谱书人物记载','始迁祖记载。','high','official',u_admin,now()-interval '60 days',now()),
      (c_zhang,src_book,'relationship',(select id from relationship where relation_type='parent_child' and from_person_id=(select id from person where person_code='SCN-Z-0001') and to_person_id=(select id from person where person_code='SCN-Z-0101')),'谱书父子记载','世系表。','high','official',u_admin,now()-interval '60 days',now()),
      (c_zhang,src_chronicle,'branch',b_second,'地方志迁徙旁证','二房迁徙。','medium','official',u_admin,now()-interval '50 days',now()),
      (c_zhang,src_oral,'relationship',(select id from relationship where relation_type='dual_successor' limit 1),'兼祧口述资料','兼承两房。','low','rejected',u_editor,now()-interval '30 days',now()),
      (c_zhang,src_tomb,'person',(select id from person where person_code='SCN-Z-0001'),'墓碑生卒旁证','墓碑卒年。','high','official',u_admin,now()-interval '40 days',now()),
      (c_zhang,src_private,'person',(select id from person where person_code='SCN-Z-1112'),'在世人员隐私材料','受限可见。','unknown','official',u_admin,now()-interval '5 days',now()),
      (c_zhang,src_book,'generation_word',(select id from generation_word where scheme_id=scheme_clan and generation_no=1),'字辈来源','谱首字派。','high','official',u_admin,now()-interval '55 days',now());

    insert into person_event (clan_id,person_id,event_type,event_title,event_date,event_date_precision,event_place,event_description,source_type,source_id,sort_order,data_status,created_by,created_at,updated_at,deleted_at)
    values
      (c_zhang,(select id from person where person_code='SCN-Z-0001'),'birth','出生',date '1840-03-12','day','河南淮阳','始迁祖出生。','source',src_book,10,'official',u_admin,now()-interval '50 days',now(),null),
      (c_zhang,(select id from person where person_code='SCN-Z-0001'),'migration','迁居合肥',date '1860-01-01','year','安徽合肥','由淮阳迁居合肥。','source',src_chronicle,30,'official',u_admin,now()-interval '48 days',now(),null),
      (c_zhang,(select id from person where person_code='SCN-Z-0001'),'death','逝世',date '1912-09-02','day','安徽合肥','葬于虚构祖茔。','source',src_tomb,90,'official',u_admin,now()-interval '45 days',now(),null),
      (c_zhang,(select id from person where person_code='SCN-Z-2102'),'adoption','入继二房',date '1918-01-01','year','浙江嘉兴','出嗣并入继二房。','relationship',(select id from relationship where relation_type='in_adoption' limit 1),50,'official',u_editor,now()-interval '35 days',now(),null),
      (c_zhang,(select id from person where person_code='SCN-Z-3101'),'succession','兼祧两房',date '1955-01-01','year','上海松江','兼承两房。','relationship',(select id from relationship where relation_type='dual_successor' limit 1),55,'official',u_editor,now()-interval '25 days',now(),null),
      (c_zhang,(select id from person where person_code='SCN-Z-1112'),'education','大学毕业',date '2020-06-01','month','上海','在世人员脱敏事件。','source',src_private,60,'official',u_editor,now()-interval '3 days',now(),null);

    insert into culture_item (clan_id,branch_id,category,title,summary,content,historical_period,location_text,confidence_level,privacy_level,sensitive_level,data_status,is_featured_on_home,sort_order,created_by,created_at,updated_at,version)
    values
      (c_zhang,null,'surname_origin','张氏得姓源流','首页姓氏源流。','虚构正文。','先秦至明清','河南淮阳','high','public','normal','official',true,10,u_editor,now()-interval '80 days',now(),0),
      (c_zhang,b_root,'clan_rule','百忍堂家规十则','宗族级家规。','虚构正文。','民国修订','安徽合肥','medium','clan_only','normal','official',true,20,u_editor,now()-interval '70 days',now(),0),
      (c_zhang,b_east,'person_story','张启文执教故事','待审核文化资料。','口述整理稿。','二十世纪中叶','江苏昆山','low','branch_only','normal','pending_review',false,30,u_editor,now()-interval '20 days',now(),0),
      (c_zhang,b_second,'custom_tradition','二房祭祖习俗旧稿','已驳回文化资料。','缺少来源。','不详','浙江嘉兴','unknown','private','sensitive','rejected',false,40,u_editor,now()-interval '15 days',now(),1);

    insert into migration_event (clan_id,branch_id,sequence_no,from_location,to_location,migration_time_text,founder_person_id,reason,description,confidence_level,privacy_level,sensitive_level,data_status,created_by,created_at,updated_at,version)
    values
      (c_zhang,b_root,1,'河南省周口市淮阳区','安徽省合肥市','清咸丰十年（约1860年）',(select id from person where person_code='SCN-Z-0001'),'避乱与经商','始迁祖迁居。','medium','public','normal','official',u_editor,now()-interval '60 days',now(),0),
      (c_zhang,b_second,2,'安徽省合肥市','浙江省嘉兴市','清末民初',(select id from person where person_code='SCN-Z-0201'),'经商定居','等待复核。','low','branch_only','normal','pending_review',u_editor,now()-interval '20 days',now(),0);

    insert into culture_site (clan_id,branch_id,related_person_id,site_type,site_name,address_text,founded_period,current_status,summary,description,latitude,longitude,confidence_level,privacy_level,sensitive_level,data_status,is_featured_on_home,sort_order,created_by,created_at,updated_at,version)
    values
      (c_zhang,b_root,(select id from person where person_code='SCN-Z-0001'),'ancestral_hall','百忍堂张氏宗祠','安徽省合肥市虚构地址','民国初年','修缮开放','首页文化场所。','虚构宗祠。',31.82,117.22,'high','public','normal','official',true,10,u_editor,now()-interval '50 days',now(),0),
      (c_zhang,b_root,(select id from person where person_code='SCN-Z-0001'),'cemetery','合肥张氏祖茔','安徽省合肥市虚构祖茔','清末','受保护','敏感文化场所。','不含真实坐标。',31.81,117.21,'medium','private','highly_sensitive','official',false,20,u_admin,now()-interval '45 days',now(),0);

    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (c_zhang,'11111111-1111-1111-1111-111111111111','person',(select id from person where person_code='SCN-Z-0001'),'modified',jsonb_build_object('dataStatus','draft'),jsonb_build_object('dataStatus','pending_review'),'始迁祖资料正式入谱。',u_editor,now()-interval '60 days','approved',now()-interval '59 days',null) returning id into rev_approved;
    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (c_zhang,'22222222-2222-2222-2222-222222222222','relationship',(select id from relationship where relation_type='heir_son' limit 1),'created',null,jsonb_build_object('relationType','heir_son','dataStatus','pending_review'),'无嗣立嗣等待审核。',u_editor,now()-interval '5 days','pending',null,null) returning id into rev_pending;
    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (c_zhang,'33333333-3333-3333-3333-333333333333','source',src_oral,'modified',jsonb_build_object('verificationStatus','draft'),jsonb_build_object('verificationStatus','pending_review'),'口述资料证据不足。',u_editor,now()-interval '10 days','rejected',null,'缺少原始录音。') returning id into rev_rejected;

    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    values (c_zhang,rev_approved,'11111111-1111-1111-1111-111111111111',1,u_reviewer,'reviewer',b_root,'approved','证据一致。',now()-interval '59 days',now()-interval '60 days') returning id into task_approved;
    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    values (c_zhang,rev_pending,'22222222-2222-2222-2222-222222222222',1,u_reviewer,'reviewer',b_third,'pending','等待补充页码。',null,now()-interval '5 days') returning id into task_pending;
    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    values (c_zhang,rev_rejected,'33333333-3333-3333-3333-333333333333',1,u_reviewer,'reviewer',b_long,'rejected','补齐材料后重提。',now()-interval '9 days',now()-interval '10 days') returning id into task_rejected;


    -- Culture review payload uses the current revision extension table.
    insert into revision (clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason)
    values (
      c_zhang,'44444444-4444-4444-4444-444444444444','culture_item',
      (select id from culture_item where clan_id=c_zhang and data_status='pending_review' order by id limit 1),
      'modified',jsonb_build_object('dataStatus','draft'),jsonb_build_object('dataStatus','pending_review'),
      '文化资料提交审核。',u_editor,now()-interval '4 days','pending',null,null
    );
    insert into culture_revision_payload (revision_id,payload_json,created_at)
    select id,jsonb_build_object(
        'title','张启文执教故事','dataStatus','pending_review','branchId',b_east,
        'summary','口述整理稿等待审核','sourceIds',jsonb_build_array(src_oral)
      )::text,now()-interval '4 days'
    from revision where trace_id='44444444-4444-4444-4444-444444444444';
    insert into review_task (clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,branch_id,status,review_comment,reviewed_at,created_at)
    select c_zhang,id,'44444444-4444-4444-4444-444444444444',1,u_reviewer,'reviewer',b_east,
           'pending','等待核对口述来源。',null,now()-interval '4 days'
    from revision where trace_id='44444444-4444-4444-4444-444444444444';

    -- Persist representative quality-check outcomes used by review and workbench APIs.
    insert into review_quality_check (
      id,clan_id,scope_type,mode,status,scope_fingerprint,task_ids_json,query_json,
      rule_codes_json,summary_json,rules_json,review_blocked,triggered_by,
      queued_at,started_at,completed_at,failure_code,failure_message
    ) values
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',c_zhang,'TASK_IDS','REVIEW_GATE','PASSED',
       'scenario-quality-passed',jsonb_build_array(task_approved)::text,null,
       jsonb_build_array('PAYLOAD_INVALID','RELATIONSHIP_CONFLICT')::text,
       jsonb_build_object('taskCount',1,'ruleCount',2,'passedRuleCount',2,'issueCount',0,'blockingIssueCount',0,'warningIssueCount',0,'reviewBlocked',false)::text,
       jsonb_build_array(
         jsonb_build_object('ruleCode','PAYLOAD_INVALID','ruleName','数据载荷有效性','outcome','PASSED','blockLevel','BLOCKING','affectedTaskCount',0,'message',null,'affectedReviewTaskIds',jsonb_build_array()),
         jsonb_build_object('ruleCode','RELATIONSHIP_CONFLICT','ruleName','关系冲突','outcome','PASSED','blockLevel','BLOCKING','affectedTaskCount',0,'message',null,'affectedReviewTaskIds',jsonb_build_array())
       )::text,false,u_reviewer,now()-interval '59 days',now()-interval '59 days',now()-interval '59 days',null,null),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',c_zhang,'TASK_IDS','FULL','ISSUES_FOUND',
       'scenario-quality-blocked',jsonb_build_array(task_pending)::text,null,
       jsonb_build_array('MISSING_SOURCE')::text,
       jsonb_build_object('taskCount',1,'ruleCount',1,'passedRuleCount',0,'issueCount',1,'blockingIssueCount',1,'warningIssueCount',0,'reviewBlocked',true)::text,
       jsonb_build_array(
         jsonb_build_object('ruleCode','MISSING_SOURCE','ruleName','来源证据完整性','outcome','ISSUE','blockLevel','BLOCKING','affectedTaskCount',1,'message','缺少可审核来源证据','affectedReviewTaskIds',jsonb_build_array(task_pending))
       )::text,true,u_reviewer,now()-interval '4 days',now()-interval '4 days',now()-interval '4 days',null,null),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',c_zhang,'TASK_IDS','INCREMENTAL','FAILED',
       'scenario-quality-failed',jsonb_build_array(task_rejected)::text,null,
       jsonb_build_array('PAYLOAD_INVALID')::text,null,null,false,u_reviewer,
       now()-interval '8 days',now()-interval '8 days',now()-interval '8 days',
       'REVIEW_QUALITY_EXECUTION_FAILED','模拟质量检查执行失败');

    insert into workbench_task_action (
      clan_id,task_key,action_type,comment_text,actor_id,expected_updated_at,created_at
    )
    select c_zhang,'review-'||task_pending,'mark_checked','已核对待审核关系，等待补充来源页码。',
           u_editor,t.created_at,now()-interval '2 days'
    from review_task t where t.id=task_pending;

    insert into import_job (clan_id,branch_id,import_type,file_format,original_filename,idempotency_key,total_count,success_count,failure_count,skipped_count,status,processing_status,review_status,review_round,error_summary,execution_mode,execution_status,execution_stage,cursor_row_no,processed_count,published_count,chunk_size,execution_retry_count,execution_max_retries,manual_intervention_required,created_by,created_at,updated_at,completed_at)
    values (c_zhang,b_east,'person','csv','东支人物成功导入.csv','scenario-person-success',20,20,0,0,'completed','ready_for_review','approved',1,null,'sync','completed','completed',20,20,20,200,0,3,false,u_editor,now()-interval '12 days',now()-interval '12 days',now()-interval '12 days') returning id into import_success;
    insert into import_job (clan_id,branch_id,import_type,file_format,original_filename,idempotency_key,total_count,success_count,failure_count,skipped_count,status,processing_status,review_status,review_round,error_summary,execution_mode,execution_status,execution_stage,cursor_row_no,processed_count,published_count,chunk_size,execution_retry_count,execution_max_retries,manual_intervention_required,created_by,created_at,updated_at,completed_at)
    values (c_zhang,b_second,'relationship','xlsx','二房关系部分失败.xlsx','scenario-relation-partial',12,9,2,1,'partial_failed','correction_required','not_submitted',0,'第5、8行无效。','async','failed','failed',12,12,9,200,1,3,true,u_editor,now()-interval '3 days',now()-interval '2 days',now()-interval '2 days') returning id into import_partial;
    insert into import_job_error (job_id,row_no,error_message,raw_data,created_at)
    values
      (import_partial,5,'父人物编码不存在','SCN-Z-NOT-FOUND,SCN-Z-2101,parent_child',now()-interval '2 days'),
      (import_partial,8,'关系类型不受支持','SCN-Z-0201,SCN-Z-2102,unknown_relation',now()-interval '2 days');

    -- Materialize current import row, recovery, chunk and idempotency models.
    insert into import_job_row (
      job_id,row_no,raw_data,normalized_data,corrected_data,row_status,error_code,error_message,
      draft_person_id,draft_target_type,draft_target_id,retry_count,corrected_by,corrected_at,
      excluded_reason,excluded_by,excluded_at,published_at,created_at,updated_at,version
    )
    select import_success,n,format('SCN-SUCCESS-%s',n),
           jsonb_build_object('personCode',p.person_code,'name',p.name,'branchId',p.branch_id),
           null,'draft_created',null,null,p.id,'person',p.id,0,null,null,null,null,null,
           now()-interval '12 days',now()-interval '12 days',now()-interval '12 days',0
    from generate_series(1,20)n
    cross join lateral (
      select id,person_code,name,branch_id from person
      where clan_id=c_zhang and deleted_at is null order by id
      limit 1 offset ((n-1)%18)
    ) p;

    with row_state(row_no,row_status,error_code,error_message) as (
      values
        (1,'draft_created',null,null),(2,'draft_created',null,null),(3,'draft_created',null,null),
        (4,'draft_created',null,null),(5,'invalid','IMPORT_PERSON_NOT_FOUND','父人物编码不存在'),
        (6,'draft_created',null,null),(7,'draft_created',null,null),
        (8,'retry_failed','IMPORT_RELATION_TYPE_INVALID','关系类型不受支持'),
        (9,'draft_created',null,null),(10,'draft_created',null,null),(11,'draft_created',null,null),
        (12,'excluded',null,null)
    )
    insert into import_job_row (
      job_id,row_no,raw_data,normalized_data,corrected_data,row_status,error_code,error_message,
      draft_person_id,draft_target_type,draft_target_id,retry_count,corrected_by,corrected_at,
      excluded_reason,excluded_by,excluded_at,published_at,created_at,updated_at,version
    )
    select import_partial,s.row_no,format('SCN-RELATION-%s',s.row_no),
           jsonb_build_object('fromPersonCode','SCN-Z-0201','toPersonCode','SCN-Z-2102','relationType','parent_child'),
           case when s.row_no=8 then jsonb_build_object('relationType','unknown_relation') end,
           s.row_status,s.error_code,s.error_message,null,
           case when s.row_status='draft_created' then 'relationship' end,
           case when s.row_status='draft_created' then r.id end,
           case when s.row_no=8 then 1 else 0 end,
           case when s.row_no=8 then u_editor end,
           case when s.row_no=8 then now()-interval '2 days' end,
           case when s.row_status='excluded' then '重复关系，人工排除' end,
           case when s.row_status='excluded' then u_editor end,
           case when s.row_status='excluded' then now()-interval '2 days' end,
           null,now()-interval '3 days',now()-interval '2 days',0
    from row_state s
    left join lateral (
      select id from relationship where clan_id=c_zhang and deleted_at is null order by id
      limit 1 offset ((s.row_no-1)%23)
    ) r on true;

    update import_job
       set published_count=0,failure_stage='drafting',last_error_code='IMPORT_ROWS_INVALID',
           heartbeat_at=now()-interval '2 days',updated_at=now()-interval '2 days'
     where id=import_partial;

    insert into import_job_payload (job_id,original_filename,content_type,file_content,confirm_duplicates,created_at)
    values (import_partial,'二房关系部分失败.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            convert_to('deterministic scenario xlsx payload','UTF8'),true,now()-interval '3 days');

    insert into import_job_chunk (
      job_id,stage,chunk_no,from_row_no,to_row_no,idempotency_key,status,attempt_count,
      error_summary,started_at,completed_at,version
    ) values
      (import_partial,'drafting',0,1,6,'scenario-import-partial-drafting-0','completed',1,null,now()-interval '3 days',now()-interval '3 days',0),
      (import_partial,'drafting',1,7,12,'scenario-import-partial-drafting-1','failed',2,'第8行重试失败',now()-interval '2 days',now()-interval '2 days',0);

    insert into import_file_fingerprint (clan_id,branch_id,import_type,file_hash,job_id,created_at)
    values
      (c_zhang,b_east,'person',repeat(md5('scenario-person-success'),2),import_success,now()-interval '12 days'),
      (c_zhang,b_second,'relationship',repeat(md5('scenario-relation-partial'),2),import_partial,now()-interval '3 days');


    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_admin,(select id from person where person_code='SCN-Z-0001'),'joined','active',u_admin,now()-interval '100 days',u_admin,now()-interval '100 days',u_admin,now()) returning id into membership_admin;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_branch,(select id from person where person_code='SCN-Z-1211'),'joined','active',u_admin,now()-interval '90 days',u_admin,now()-interval '90 days',u_admin,now()) returning id into membership_branch;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_editor,(select id from person where person_code='SCN-Z-1111'),'joined','active',u_admin,now()-interval '80 days',u_admin,now()-interval '80 days',u_admin,now()) returning id into membership_editor;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_reviewer,(select id from person where person_code='SCN-Z-3101'),'joined','active',u_admin,now()-interval '70 days',u_admin,now()-interval '70 days',u_admin,now()) returning id into membership_reviewer;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_zhang,u_viewer,(select id from person where person_code='SCN-Z-1112'),'joined','active',u_admin,now()-interval '60 days',u_admin,now()-interval '60 days',u_admin,now()) returning id into membership_viewer;
    insert into clan_membership (clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,created_by,created_at,updated_by,updated_at)
    values (c_li,u_admin,(select id from person where person_code='SCN-L-0001'),'joined','active',u_admin,now()-interval '50 days',u_admin,now()-interval '50 days',u_admin,now()) returning id into membership_li;

    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_admin,id,'clan',c_zhang,'active',u_admin,now()-interval '100 days',u_admin,now()-interval '100 days',u_admin,now() from app_role where role_code='clan_admin';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_branch,id,'branch_subtree',b_long,'active',u_admin,now()-interval '90 days',u_admin,now()-interval '90 days',u_admin,now() from app_role where role_code='branch_admin' returning id into branch_role_assignment;
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_editor,id,'branch_subtree',b_east,'active',u_admin,now()-interval '80 days',u_admin,now()-interval '80 days',u_admin,now() from app_role where role_code='editor';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_reviewer,id,'clan',c_zhang,'active',u_admin,now()-interval '70 days',u_admin,now()-interval '70 days',u_admin,now() from app_role where role_code='reviewer';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_viewer,id,'branch_subtree',b_east,'active',u_admin,now()-interval '60 days',u_admin,now()-interval '60 days',u_admin,now() from app_role where role_code='viewer';
    insert into member_role (membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,created_by,created_at,updated_by,updated_at)
    select membership_li,id,'clan',c_li,'active',u_admin,now()-interval '50 days',u_admin,now()-interval '50 days',u_admin,now() from app_role where role_code='clan_admin';
    update branch set manager_member_id=branch_role_assignment,updated_at=now() where id in (b_long,b_east,b_west);

    insert into operation_log (clan_id,actor_id,action_type,target_type,target_id,trace_id,revision_id,review_task_id,business_target_type,business_target_id,event_result,risk_level,risk_event_type,disposition_status,branch_id,summary,detail,request_id,client_ip,created_at)
    values
      (c_zhang,u_admin,'seed_current_scenarios','clan',c_zhang,null,null,null,'clan',c_zhang,'success',null,null,null,null,'创建当前模型全场景测试数据','完整场景。','scenario-seed-zhang','127.0.0.1',now()-interval '1 day'),
      (c_zhang,u_reviewer,'review_approve','review_task',task_approved,'11111111-1111-1111-1111-111111111111',rev_approved,task_approved,'person',(select id from person where person_code='SCN-Z-0001'),'success','medium','formal_data_change','resolved',b_root,'始迁祖资料审核通过','证据完整。','scenario-review-approved','127.0.0.1',now()-interval '59 days'),
      (c_zhang,u_reviewer,'review_reject','review_task',task_rejected,'33333333-3333-3333-3333-333333333333',rev_rejected,task_rejected,'source',src_oral,'rejected','medium','review_anomaly','open',b_long,'口述来源审核驳回','缺少原始录音。','scenario-review-rejected','127.0.0.1',now()-interval '9 days'),
      (c_zhang,u_viewer,'source_attachment_download_denied','source_attachment',(select id from source_attachment where source_id=src_private limit 1),null,null,null,'source',src_private,'denied','high','access_denied','open',b_east,'受限附件下载被拒绝',null,'scenario-risk-denied','127.0.0.1',now()-interval '1 hour'),
      (c_zhang,u_editor,'import_partial_failed','import_job',import_partial,null,null,null,'import_job',import_partial,'partial_failed',null,null,null,b_second,'关系导入部分失败','2行失败。','scenario-import-partial','127.0.0.1',now()-interval '2 days');
end $$;

commit;
\echo 'Current-schema acceptance scenarios created.'
