\set ON_ERROR_STOP on

-- Parameterized, set-based PostgreSQL generator for the current implemented model.
\if :{?dataset_code}
\else
\set dataset_code SMALL
\endif
\if :{?person_count}
\else
\set person_count 10000
\endif
\if :{?branch_count}
\else
\set branch_count 100
\endif
\if :{?children_per_parent}
\else
\set children_per_parent 3
\endif
\if :{?events_per_person}
\else
\set events_per_person 2
\endif
\if :{?source_count}
\else
\set source_count 100
\endif
\if :{?culture_item_count}
\else
\set culture_item_count 500
\endif
\if :{?migration_event_count}
\else
\set migration_event_count 100
\endif
\if :{?review_count}
\else
\set review_count 1000
\endif
\if :{?operation_log_count}
\else
\set operation_log_count 10000
\endif

begin;
select pg_advisory_xact_lock(hashtext('genealogy-current-business-data-reset'));

create temporary table perf_config as
select upper(:'dataset_code')::text dataset_code,
       :'person_count'::integer person_count,
       :'branch_count'::integer branch_count,
       :'children_per_parent'::integer children_per_parent,
       :'events_per_person'::integer events_per_person,
       :'source_count'::integer source_count,
       :'culture_item_count'::integer culture_item_count,
       :'migration_event_count'::integer migration_event_count,
       :'review_count'::integer review_count,
       :'operation_log_count'::integer operation_log_count,
       null::bigint clan_id,
       (select id from app_user where username='demo_admin')::bigint admin_user_id,
       (select id from app_user where username='demo_editor')::bigint editor_user_id,
       (select id from app_user where username='demo_reviewer')::bigint reviewer_user_id;

do $$
declare c perf_config%rowtype;
begin
    select * into c from perf_config;
    if c.dataset_code !~ '^[A-Z0-9][A-Z0-9_-]{0,31}$' then raise exception 'dataset_code must match [A-Z0-9_-] and be at most 32 characters'; end if;
    if c.person_count<1 or c.person_count>5000000 then raise exception 'person_count must be between 1 and 5,000,000'; end if;
    if c.branch_count<1 or c.branch_count>least(c.person_count,200000) then raise exception 'branch_count must be between 1 and min(person_count, 200,000)'; end if;
    if c.children_per_parent<2 or c.children_per_parent>20 then raise exception 'children_per_parent must be between 2 and 20'; end if;
    if c.events_per_person<0 or c.events_per_person>10 then raise exception 'events_per_person must be between 0 and 10'; end if;
    if c.source_count<1 or c.source_count>100000 then raise exception 'source_count must be between 1 and 100,000'; end if;
    if c.culture_item_count<0 or c.culture_item_count>1000000 then raise exception 'culture_item_count must be between 0 and 1,000,000'; end if;
    if c.migration_event_count<0 or c.migration_event_count>100000 then raise exception 'migration_event_count must be between 0 and 100,000'; end if;
    if c.review_count<0 or c.review_count>c.person_count then raise exception 'review_count must be between 0 and person_count'; end if;
    if c.operation_log_count<0 or c.operation_log_count>10000000 then raise exception 'operation_log_count must be between 0 and 10,000,000'; end if;
    if c.admin_user_id is null or c.editor_user_id is null or c.reviewer_user_id is null then raise exception 'Run 10_seed_current_scenarios.sql before performance generation'; end if;
    if exists(select 1 from clan where clan_code='PERF-'||c.dataset_code) then raise exception 'Performance dataset PERF-% already exists',c.dataset_code; end if;
end $$;

do $$
declare c perf_config%rowtype; v_clan_id bigint;
begin
    select * into c from perf_config;
    insert into clan (
        clan_code,clan_name,surname,hall_name,commandery,origin_place,current_places,
        description,status,created_by,created_at,updated_at
    ) values (
        'PERF-'||c.dataset_code,'性能测试宗族 '||c.dataset_code,'测','性能堂','测试郡',
        '性能测试源点',jsonb_build_array('性能测试城市A','性能测试城市B','性能测试城市C'),
        format('人物=%s，支派=%s，子女分叉=%s。',c.person_count,c.branch_count,c.children_per_parent),
        'active',c.admin_user_id,now(),now()
    ) returning id into v_clan_id;
    update perf_config set clan_id=v_clan_id;
end $$;

-- Fixed three-way branch tree. Current branch lifecycle uses official, not legacy active.
create temporary table perf_branch_map (
    external_id integer primary key,
    id bigint not null unique,
    parent_external_id integer,
    level_no integer not null
) on commit drop;
insert into perf_branch_map(external_id,id,parent_external_id,level_no)
select n,
       nextval(pg_get_serial_sequence('branch','id')),
       case when n=1 then null else ((n-2)/3)+1 end,
       case when n=1 then 1 else 2+floor(ln(greatest(n-1,1))/ln(3))::integer end
from perf_config c cross join generate_series(1,c.branch_count)n;

insert into branch (
    id,clan_id,parent_id,branch_name,branch_path,level,sort_order,
    migration_from,migration_to,description,status,created_at,updated_at
)
select m.id,c.clan_id,parent.id,format('压测支派-%06s',m.external_id),
       format('/PERF/%s/%s',c.dataset_code,lpad(m.external_id::text,6,'0')),
       m.level_no,m.external_id,format('测试地点-%s',((m.external_id-1)%50)+1),
       format('测试地点-%s',(m.external_id%50)+51),'集合化生成的压测支派。',
       'official',now(),now()
from perf_branch_map m
cross join perf_config c
left join perf_branch_map parent on parent.external_id=m.parent_external_id;

create temporary table perf_person_map (
    external_id integer primary key,
    id bigint not null unique,
    branch_external_id integer not null,
    generation_no integer not null
) on commit drop;
insert into perf_person_map(external_id,id,branch_external_id,generation_no)
select n,
       nextval(pg_get_serial_sequence('person','id')),
       ((n-1)%c.branch_count)+1,
       1+floor(ln(greatest(n,1))/ln(c.children_per_parent))::integer
from perf_config c cross join generate_series(1,c.person_count)n;

insert into person (
    id,clan_id,branch_id,person_code,name,genealogy_name,courtesy_name,alias_name,
    gender,generation_no,generation_word,rank_in_family,birth_date,
    birth_date_precision,death_date,death_date_precision,is_living,birth_place,
    residence_place,occupation,education,title_or_honor,biography,tomb_place,
    epitaph,has_descendant,lineage_status,privacy_level,data_status,created_by,
    created_at,updated_by,updated_at,deleted_at
)
select p.id,c.clan_id,b.id,format('PERF-%s-%09s',c.dataset_code,p.external_id),
       format('测%s%s',substr('承启俊泽仁义礼智信忠孝',((p.generation_no-1)%12)+1,1),lpad((p.external_id%10000)::text,4,'0')),
       format('谱名-%09s',p.external_id),format('字-%05s',p.external_id%100000),
       case when p.external_id%101=0 then format('别名-%s',p.external_id) end,
       case when p.external_id%2=0 then 'male' else 'female' end,p.generation_no,
       substr('承启俊泽仁义礼智信忠孝',((p.generation_no-1)%12)+1,1),
       format('排行-%s',((p.external_id-1)%c.children_per_parent)+1),
       make_date(1800+(p.external_id%220),(p.external_id%12)+1,(p.external_id%27)+1),
       case when p.external_id%10=0 then 'year' else 'day' end,
       case when p.external_id%5=0 then make_date(1870+(p.external_id%150),(p.external_id%12)+1,(p.external_id%27)+1) end,
       case when p.external_id%5=0 then 'year' else 'unknown' end,
       p.external_id%5<>0,format('出生地-%s',p.external_id%200),format('居住地-%s',p.external_id%500),
       format('职业-%s',p.external_id%30),case when p.external_id%3=0 then '本科' else '家学' end,
       case when p.external_id%97=0 then '修谱志愿者' end,
       format('性能测试人物 %s，不对应任何真实个人。',p.external_id),
       case when p.external_id%5=0 then format('测试墓地-%s',p.external_id%100) end,
       case when p.external_id%250=0 then '性能测试墓志摘要。' end,
       p.external_id*c.children_per_parent<=c.person_count,
       case when p.external_id%997=0 then 'adopted' else 'normal' end,
       case when p.external_id%100=0 then 'private' when p.external_id%10=0 then 'branch_only' else 'clan_only' end,
       'official',c.admin_user_id,now()-((p.external_id%365)::text||' days')::interval,
       c.admin_user_id,now(),null
from perf_person_map p
join perf_branch_map bm on bm.external_id=p.branch_external_id
join branch b on b.id=bm.id
cross join perf_config c;

update clan c set ancestor_person_id=(select id from perf_person_map where external_id=1)
from perf_config cfg where c.id=cfg.clan_id;
update branch b set founder_person_id=p.id
from perf_branch_map bm
join perf_person_map p on p.external_id=bm.external_id
cross join perf_config c
where b.id=bm.id and bm.external_id<=c.person_count;

-- Biological tree, spouse edges and sparse ritual edges.
insert into relationship (
    clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,
    is_lineage_relation,is_biological,is_primary,description,confidence_level,
    data_status,created_by,created_at,updated_at
)
select c.clan_id,parent.id,child.id,'parent_child','father','blood',true,true,true,
       '压测父子关系。','high','official',c.admin_user_id,now(),now()
from perf_person_map child
cross join perf_config c
join perf_person_map parent on parent.external_id=((child.external_id-2)/c.children_per_parent)+1
where child.external_id>1;

insert into relationship (
    clan_id,from_person_id,to_person_id,relation_type,relation_label,relation_category,
    is_lineage_relation,is_biological,is_primary,description,confidence_level,
    data_status,created_by,created_at,updated_at
)
select c.clan_id,left_person.id,right_person.id,'spouse','spouse','marriage',false,false,true,
       '压测婚配关系。','medium','official',c.admin_user_id,now(),now()
from perf_config c
join generate_series(2,c.person_count-1,2)n on true
join perf_person_map left_person on left_person.external_id=n
join perf_person_map right_person on right_person.external_id=n+1;

insert into relationship (
    clan_id,from_person_id,to_person_id,relation_type,relation_label,
    relation_category,ritual_relation_type,successor_branch_id,succession_reason,
    is_lineage_relation,is_biological,is_primary,description,confidence_level,
    data_status,created_by,created_at,updated_at
)
select c.clan_id,parent.id,child.id,
       case (child.external_id/1000)%5 when 0 then 'in_adoption' when 1 then 'out_adoption' when 2 then 'successor' when 3 then 'dual_successor' else 'heir_son' end,
       'performance_ritual','ritual',
       case (child.external_id/1000)%5 when 0 then 'in_adoption' when 1 then 'out_adoption' when 2 then 'successor' when 3 then 'dual_successor' else 'heir_son' end,
       branch_row.id,'压测宗法承继',true,false,false,'固定千分位礼法关系。',
       'medium','official',c.admin_user_id,now(),now()
from perf_config c
join generate_series(1000,c.person_count,1000)n on true
join perf_person_map child on child.external_id=n
join perf_person_map parent on parent.external_id=greatest(1,n-c.children_per_parent)
join perf_branch_map bm on bm.external_id=child.branch_external_id
join branch branch_row on branch_row.id=bm.id;

insert into person_event (
    clan_id,person_id,event_type,event_title,event_date,event_date_precision,
    event_place,event_description,source_type,source_id,sort_order,data_status,
    created_by,created_at,updated_at,deleted_at
)
select c.clan_id,p.id,
       case e when 1 then 'birth' when 2 then 'migration' when 3 then 'education' else 'other' end,
       case e when 1 then '出生' when 2 then '迁徙' when 3 then '教育经历' else '其他事件' end,
       make_date(1800+(p.external_id%220),((p.external_id+e)%12)+1,((p.external_id+e)%27)+1),
       case when e=1 then 'day' else 'year' end,format('事件地点-%s',(p.external_id+e)%500),
       format('人物 %s 的第 %s 条性能测试事件。',p.external_id,e),'generated',null,e*10,
       'official',c.admin_user_id,now(),now(),null
from perf_config c
join perf_person_map p on true
join generate_series(1,c.events_per_person)e on true;

create temporary table perf_source_map(external_id integer primary key,id bigint not null unique) on commit drop;
insert into perf_source_map(external_id,id)
select n,nextval(pg_get_serial_sequence('source','id'))
from perf_config c cross join generate_series(1,c.source_count)n;

insert into source (
    id,clan_id,source_name,source_type,provider_name,book_title,volume_no,page_no,
    source_date,excerpt,verification_status,description,confidence_level,
    privacy_level,sensitive_level,created_by,created_at,updated_at
)
select s.id,c.clan_id,format('压测来源-%07s',s.external_id),
       case s.external_id%4 when 0 then 'genealogy_book' when 1 then 'local_chronicle' when 2 then 'oral_history' else 'photo' end,
       '性能测试资料提供方',format('压测资料集-%s',(s.external_id-1)/100+1),
       format('卷%s',(s.external_id-1)/1000+1),format('页%s',s.external_id%500),
       (1900+s.external_id%126)::text,'无真实内容的性能测试摘录。','official','性能测试来源。',
       case when s.external_id%10=0 then 'medium' else 'high' end,
       case when s.external_id%100=0 then 'private' else 'clan_only' end,
       case when s.external_id%100=0 then 'highly_sensitive' else 'normal' end,
       c.admin_user_id,now(),now()
from perf_source_map s cross join perf_config c;

insert into source_binding (
    clan_id,source_id,target_type,target_id,binding_reason,excerpt,
    confidence_level,binding_status,created_by,created_at,updated_at
)
select c.clan_id,s.id,'person',p.id,'压测人物来源','确定性来源绑定。',
       'high','official',c.admin_user_id,now(),now()
from perf_config c
join perf_person_map p on p.external_id%100=0
join perf_source_map s on s.external_id=((p.external_id/100-1)%c.source_count)+1;

insert into culture_item (
    clan_id,branch_id,category,title,summary,content,historical_period,
    location_text,confidence_level,privacy_level,sensitive_level,data_status,
    featured_on_home,sort_order,created_by,created_at,updated_at,version
)
select c.clan_id,b.id,
       (array['surname_origin','hall_name','commandery','family_instruction','ancestor_instruction','clan_rule','genealogy_preface','genealogy_rule','person_story','custom_tradition','other'])[((n-1)%11)+1],
       format('压测文化资料-%08s',n),'压测摘要','压测正文',format('时期-%s',n%20),
       format('地点-%s',n%500),case when n%10=0 then 'medium' else 'high' end,
       case when n%100=0 then 'private' when n%10=0 then 'branch_only' else 'clan_only' end,
       case when n%100=0 then 'highly_sensitive' else 'normal' end,
       case n%20 when 0 then 'draft' when 1 then 'pending_review' when 2 then 'rejected' when 3 then 'archived' else 'official' end,
       n<=20,n,c.admin_user_id,now(),now(),0
from perf_config c
join generate_series(1,c.culture_item_count)n on true
join perf_branch_map bm on bm.external_id=((n-1)%c.branch_count)+1
join branch b on b.id=bm.id;

insert into migration_event (
    clan_id,branch_id,sequence_no,from_location,to_location,migration_time_text,
    founder_person_id,reason,description,confidence_level,privacy_level,
    sensitive_level,data_status,created_by,created_at,updated_at,version
)
select c.clan_id,b.id,n,format('迁出地-%s',n),format('迁入地-%s',n+100000),
       format('约%s年',1800+n%220),p.id,'压测迁徙原因','压测迁徙说明','medium',
       case when n%100=0 then 'private' else 'clan_only' end,
       case when n%100=0 then 'highly_sensitive' else 'normal' end,
       case n%20 when 0 then 'draft' when 1 then 'pending_review' when 2 then 'rejected' when 3 then 'archived' else 'official' end,
       c.admin_user_id,now(),now(),0
from perf_config c
join generate_series(1,c.migration_event_count)n on true
join perf_branch_map bm on bm.external_id=((n-1)%c.branch_count)+1
join branch b on b.id=bm.id
join perf_person_map pm on pm.external_id=((n-1)%c.person_count)+1
join person p on p.id=pm.id;

create temporary table perf_revision_map(external_id integer primary key,id bigint not null unique,trace_id uuid not null) on commit drop;
insert into perf_revision_map(external_id,id,trace_id)
select n,nextval(pg_get_serial_sequence('revision','id')),md5('perf-revision-'||c.dataset_code||'-'||n)::uuid
from perf_config c cross join generate_series(1,c.review_count)n;

insert into revision (
    id,clan_id,trace_id,target_type,target_id,change_type,before_data,after_data,
    diff_summary,submitter_id,submit_time,status,approved_at,rejected_reason
)
select r.id,c.clan_id,r.trace_id,'person',p.id,'modified',jsonb_build_object('dataStatus','draft'),
       jsonb_build_object('dataStatus','official'),format('压测审核-%s',r.external_id),
       c.editor_user_id,now()-(r.external_id%30||' days')::interval,
       case r.external_id%3 when 0 then 'approved' when 1 then 'pending' else 'rejected' end,
       case when r.external_id%3=0 then now() else null end,
       case when r.external_id%3=2 then '压测驳回原因' end
from perf_revision_map r
join perf_person_map p on p.external_id=r.external_id
cross join perf_config c;

insert into review_task (
    clan_id,revision_id,trace_id,review_level,reviewer_id,reviewer_role,
    branch_id,status,review_comment,reviewed_at,created_at
)
select c.clan_id,r.id,r.trace_id,1,c.reviewer_user_id,'reviewer',b.id,
       case r.external_id%3 when 0 then 'approved' when 1 then 'pending' else 'rejected' end,
       case r.external_id%3 when 0 then '压测审核通过' when 1 then '压测待审核' else '压测审核驳回' end,
       case when r.external_id%3<>1 then now() end,now()
from perf_revision_map r
join perf_person_map p on p.external_id=r.external_id
join perf_branch_map bm on bm.external_id=p.branch_external_id
join branch b on b.id=bm.id
cross join perf_config c;

insert into operation_log (
    clan_id,actor_id,action_type,target_type,target_id,business_target_type,
    business_target_id,event_result,risk_level,risk_event_type,disposition_status,
    branch_id,summary,detail,request_id,client_ip,created_at
)
select c.clan_id,
       case n%3 when 0 then c.admin_user_id when 1 then c.editor_user_id else c.reviewer_user_id end,
       case n%5 when 0 then 'person_update' when 1 then 'relationship_create' when 2 then 'tree_query' when 3 then 'source_view' else 'export' end,
       'person',p.id,'person',p.id,case when n%1000=0 then 'denied' else 'success' end,
       case when n%1000=0 then 'high' end,
       case when n%1000=0 then 'access_denied' end,
       case when n%1000=0 then 'open' end,b.id,
       format('压测操作日志-%s',n),null,format('perf-%s-%s',c.dataset_code,n),
       '127.0.0.1',now()-(n%86400||' seconds')::interval
from perf_config c
join generate_series(1,c.operation_log_count)n on true
join perf_person_map p on p.external_id=((n-1)%c.person_count)+1
join perf_branch_map bm on bm.external_id=p.branch_external_id
join branch b on b.id=bm.id;

insert into clan_membership (
    clan_id,user_id,person_id,join_status,member_status,invited_by,joined_at,
    created_by,created_at,updated_by,updated_at
)
select c.clan_id,c.admin_user_id,p.id,'joined','active',c.admin_user_id,now(),
       c.admin_user_id,now(),c.admin_user_id,now()
from perf_config c join perf_person_map p on p.external_id=1;

insert into member_role (
    membership_id,role_id,scope_type,scope_id,status,granted_by,granted_at,
    created_by,created_at,updated_by,updated_at
)
select m.id,r.id,'clan',c.clan_id,'active',c.admin_user_id,now(),
       c.admin_user_id,now(),c.admin_user_id,now()
from perf_config c
join clan_membership m on m.clan_id=c.clan_id and m.user_id=c.admin_user_id
join app_role r on r.role_code='clan_admin';

analyze clan;
analyze branch;
analyze person;
analyze relationship;
analyze person_event;
analyze source;
analyze source_binding;
analyze revision;
analyze review_task;
analyze operation_log;

do $$
declare c perf_config%rowtype;
begin
    select * into c from perf_config;
    raise notice 'performance dataset created: PERF-%, persons=%, branches=%, events=%, sources=%, culture=%, migrations=%, reviews=%, logs=%',
        c.dataset_code,c.person_count,c.branch_count,c.person_count*c.events_per_person,
        c.source_count,c.culture_item_count,c.migration_event_count,c.review_count,c.operation_log_count;
end $$;

commit;
\echo 'Current-schema performance dataset created.'
