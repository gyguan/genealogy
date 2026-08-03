from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "backend/genealogy-backend/src/main/resources/db/seed/current"
TEST = ROOT / "backend/genealogy-backend/src/test/java/com/genealogy/database/CurrentSeedDataContractTest.java"
README = SEED / "README.md"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def replace_once(content: str, old: str, new: str, label: str) -> str:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one marker, found {count}")
    return content.replace(old, new, 1)


def regex_once(content: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, content, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


scenario_path = SEED / "10_seed_current_scenarios.sql"
scenario = read(scenario_path)

branch_alignment = """
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

"""
if "Match BranchApplicationService" not in scenario:
    scenario = replace_once(
        scenario,
        "    create temporary table seed_person_input (",
        branch_alignment + "    create temporary table seed_person_input (",
        "scenario branch hierarchy alignment",
    )

quality_and_workbench = """
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

"""
if "scenario-quality-passed" not in scenario:
    scenario = replace_once(
        scenario,
        "    insert into import_job (clan_id,branch_id,import_type,file_format,original_filename,idempotency_key,total_count,success_count,failure_count,skipped_count,status,processing_status,review_status,review_round,error_summary,execution_mode,execution_status,execution_stage,cursor_row_no,processed_count,published_count,chunk_size,execution_retry_count,execution_max_retries,manual_intervention_required,created_by,created_at,updated_at,completed_at)",
        quality_and_workbench + "    insert into import_job (clan_id,branch_id,import_type,file_format,original_filename,idempotency_key,total_count,success_count,failure_count,skipped_count,status,processing_status,review_status,review_round,error_summary,execution_mode,execution_status,execution_stage,cursor_row_no,processed_count,published_count,chunk_size,execution_retry_count,execution_max_retries,manual_intervention_required,created_by,created_at,updated_at,completed_at)",
        "scenario quality and workbench coverage",
    )

import_runtime = """

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
"""
if "Materialize current import row" not in scenario:
    scenario = replace_once(
        scenario,
        "      (import_partial,8,'关系类型不受支持','SCN-Z-0201,SCN-Z-2102,unknown_relation',now()-interval '2 days');\n\n    insert into clan_membership",
        "      (import_partial,8,'关系类型不受支持','SCN-Z-0201,SCN-Z-2102,unknown_relation',now()-interval '2 days');" + import_runtime + "\n\n    insert into clan_membership",
        "scenario import runtime coverage",
    )

write(scenario_path, scenario)

performance_path = SEED / "20_generate_performance_data.sql"
performance = read(performance_path)

branch_block = """-- Fixed three-way branch tree with application-compatible id paths and exact levels.
create temporary table perf_branch_map (
    external_id integer primary key,
    id bigint not null unique,
    parent_external_id integer,
    level_no integer not null default 0,
    branch_path text
) on commit drop;
insert into perf_branch_map(external_id,id,parent_external_id)
select n,nextval(pg_get_serial_sequence('branch','id')),
       case when n=1 then null else ((n-2)/3)+1 end
from perf_config c cross join generate_series(1,c.branch_count)n;

with recursive branch_tree as (
    select m.external_id,m.id,m.parent_external_id,1 as level_no,m.id::text as branch_path
    from perf_branch_map m where m.parent_external_id is null
    union all
    select child.external_id,child.id,child.parent_external_id,parent.level_no+1,
           parent.branch_path||'/'||child.id
    from branch_tree parent
    join perf_branch_map child on child.parent_external_id=parent.external_id
)
update perf_branch_map m
set level_no=t.level_no,branch_path=t.branch_path
from branch_tree t where t.external_id=m.external_id;

insert into branch (
    id,clan_id,parent_id,branch_name,branch_path,level,sort_order,
    migration_from,migration_to,description,status,created_at,updated_at
)
select m.id,c.clan_id,parent.id,format('压测支派-%06s',m.external_id),
       m.branch_path,m.level_no,m.external_id,format('测试地点-%s',((m.external_id-1)%50)+1),
       format('测试地点-%s',(m.external_id%50)+51),'集合化生成的压测支派。',
       'official',now(),now()
from perf_branch_map m
cross join perf_config c
left join perf_branch_map parent on parent.external_id=m.parent_external_id;

"""
performance = regex_once(
    performance,
    r"-- Fixed three-way branch tree\..*?(?=create temporary table perf_person_map)",
    branch_block,
    "performance branch tree",
)

person_map_block = """create temporary table perf_person_map (
    external_id integer primary key,
    id bigint not null unique,
    parent_external_id integer,
    branch_external_id integer not null,
    generation_no integer not null default 0
) on commit drop;
insert into perf_person_map(external_id,id,parent_external_id,branch_external_id)
select n,nextval(pg_get_serial_sequence('person','id')),
       case when n=1 then null else ((n-2)/c.children_per_parent)+1 end,
       ((n-1)%c.branch_count)+1
from perf_config c cross join generate_series(1,c.person_count)n;

with recursive person_tree as (
    select p.external_id,p.parent_external_id,1 as generation_no
    from perf_person_map p where p.parent_external_id is null
    union all
    select child.external_id,child.parent_external_id,parent.generation_no+1
    from person_tree parent
    join perf_person_map child on child.parent_external_id=parent.external_id
)
update perf_person_map p
set generation_no=t.generation_no
from person_tree t where t.external_id=p.external_id;

"""
performance = regex_once(
    performance,
    r"create temporary table perf_person_map \(.*?(?=insert into person \()",
    person_map_block,
    "performance person generation tree",
)

old_dates = """       make_date(1800+(p.external_id%220),(p.external_id%12)+1,(p.external_id%27)+1),
       case when p.external_id%10=0 then 'year' else 'day' end,
       case when p.external_id%5=0 then make_date(1870+(p.external_id%150),(p.external_id%12)+1,(p.external_id%27)+1) end,
       case when p.external_id%5=0 then 'year' else 'unknown' end,"""
new_dates = """       life.birth_date,
       case when p.external_id%10=0 then 'year' else 'day' end,
       case when p.external_id%5=0 then (life.birth_date+make_interval(years => 40+(p.external_id%56)))::date end,
       case when p.external_id%5=0 then 'year' else 'unknown' end,"""
performance = replace_once(performance, old_dates, new_dates, "performance life dates")
performance = replace_once(
    performance,
    "from perf_person_map p\njoin perf_branch_map bm on bm.external_id=p.branch_external_id\njoin branch b on b.id=bm.id\ncross join perf_config c;",
    "from perf_person_map p\njoin perf_branch_map bm on bm.external_id=p.branch_external_id\njoin branch b on b.id=bm.id\ncross join perf_config c\ncross join lateral (\n    select make_date(1800+(p.external_id%180),(p.external_id%12)+1,(p.external_id%27)+1) as birth_date\n) life;",
    "performance birth-date lateral",
)
performance = replace_once(
    performance,
    "join perf_person_map parent on parent.external_id=((child.external_id-2)/c.children_per_parent)+1",
    "join perf_person_map parent on parent.external_id=child.parent_external_id",
    "performance biological parent mapping",
)
performance = replace_once(
    performance,
    "       make_date(1800+(p.external_id%220),((p.external_id+e)%12)+1,((p.external_id+e)%27)+1),",
    "       case when e=1 then person_row.birth_date else (person_row.birth_date+make_interval(years => 8+e*7))::date end,",
    "performance event chronology",
)
performance = replace_once(
    performance,
    "from perf_config c\njoin perf_person_map p on true\njoin generate_series(1,c.events_per_person)e on true;",
    "from perf_config c\njoin perf_person_map p on true\njoin person person_row on person_row.id=p.id\njoin generate_series(1,c.events_per_person)e on true;",
    "performance event person join",
)

performance_quality = """
insert into review_quality_check (
    id,clan_id,scope_type,mode,status,scope_fingerprint,task_ids_json,query_json,
    rule_codes_json,summary_json,rules_json,review_blocked,triggered_by,
    queued_at,started_at,completed_at,failure_code,failure_message
)
select md5('perf-quality-'||c.dataset_code||'-'||t.id)::uuid,c.clan_id,'TASK_IDS','FULL',
       case t.status when 'approved' then 'PASSED' when 'pending' then 'ISSUES_FOUND' else 'FAILED' end,
       md5('perf-quality-scope-'||c.dataset_code||'-'||t.id),jsonb_build_array(t.id)::text,null,
       jsonb_build_array(case when t.status='pending' then 'MISSING_SOURCE' else 'PAYLOAD_INVALID' end)::text,
       case when t.status='rejected' then null else
         jsonb_build_object('taskCount',1,'ruleCount',1,
           'passedRuleCount',case when t.status='approved' then 1 else 0 end,
           'issueCount',case when t.status='pending' then 1 else 0 end,
           'blockingIssueCount',case when t.status='pending' then 1 else 0 end,
           'warningIssueCount',0,'reviewBlocked',t.status='pending')::text end,
       case when t.status='rejected' then null else jsonb_build_array(
         jsonb_build_object('ruleCode',case when t.status='pending' then 'MISSING_SOURCE' else 'PAYLOAD_INVALID' end,
           'ruleName','压测质量规则','outcome',case when t.status='approved' then 'PASSED' else 'ISSUE' end,
           'blockLevel','BLOCKING','affectedTaskCount',case when t.status='approved' then 0 else 1 end,
           'message',case when t.status='pending' then '压测阻断问题' end,
           'affectedReviewTaskIds',case when t.status='approved' then jsonb_build_array() else jsonb_build_array(t.id) end)
       )::text end,
       t.status='pending',c.reviewer_user_id,t.created_at,t.created_at,now(),
       case when t.status='rejected' then 'REVIEW_QUALITY_EXECUTION_FAILED' end,
       case when t.status='rejected' then '压测质量检查失败' end
from review_task t cross join perf_config c where t.clan_id=c.clan_id;

with ranked as (
    select t.*,row_number() over(order by t.id) rn
    from review_task t cross join perf_config c
    where t.clan_id=c.clan_id and t.status='pending'
)
insert into workbench_task_action (
    clan_id,task_key,action_type,comment_text,actor_id,expected_updated_at,created_at
)
select c.clan_id,'review-'||r.id,'mark_checked','压测任务已完成抽样核查。',
       c.editor_user_id,r.created_at,now()
from ranked r cross join perf_config c where (r.rn-1)%100=0;

"""
if "perf-quality-scope" not in performance:
    performance = replace_once(
        performance,
        "insert into operation_log (\n    clan_id,actor_id,action_type,target_type,target_id,business_target_type,",
        performance_quality + "insert into operation_log (\n    clan_id,actor_id,action_type,target_type,target_id,business_target_type,",
        "performance quality coverage",
    )
    performance = replace_once(
        performance,
        "analyze review_task;\nanalyze operation_log;",
        "analyze review_task;\nanalyze review_quality_check;\nanalyze workbench_task_action;\nanalyze operation_log;",
        "performance analyze extensions",
    )

write(performance_path, performance)

verify_path = SEED / "30_verify_seed_data.sql"
verify = read(verify_path)

invariants = """

    if exists(select 1 from branch b join verified_seed_clan c on c.id=b.clan_id where b.parent_id is null and (b.level<>1 or b.branch_path<>b.id::text)) then
      raise exception 'Root branch path/level does not match application hierarchy semantics';
    end if;
    if exists(
      select 1 from branch child join branch parent on parent.id=child.parent_id
      join verified_seed_clan c on c.id=child.clan_id
      where child.level<>parent.level+1 or child.branch_path<>parent.branch_path||'/'||child.id
    ) then raise exception 'Child branch path/level does not match parent hierarchy'; end if;

    if exists(
      select 1 from person p join verified_seed_clan c on c.id=p.clan_id
      where p.birth_date is not null and p.death_date is not null and p.death_date<p.birth_date
    ) then raise exception 'Person death date precedes birth date'; end if;
    if exists(
      select 1 from relationship r
      join person parent on parent.id=r.from_person_id
      join person child on child.id=r.to_person_id
      join verified_seed_clan c on c.id=r.clan_id
      where r.relation_type='parent_child' and parent.generation_no is not null and child.generation_no is not null
        and child.generation_no<>parent.generation_no+1
    ) then raise exception 'Parent-child generation numbers are inconsistent'; end if;

    if exists(
      select 1 from import_job j join clan c on c.id=j.clan_id
      where c.clan_code='SCENARIO-ZHANG-HUAIYANG'
        and (select count(*) from import_job_row r where r.job_id=j.id)<>j.total_count
    ) then raise exception 'Import job row count does not match total_count'; end if;
    if exists(
      select 1 from import_job j join clan c on c.id=j.clan_id
      where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and j.execution_mode='async'
        and (not exists(select 1 from import_job_payload p where p.job_id=j.id)
          or not exists(select 1 from import_job_chunk ch where ch.job_id=j.id)
          or not exists(select 1 from import_file_fingerprint f where f.job_id=j.id))
    ) then raise exception 'Async import recovery state is incomplete'; end if;
    if not exists(
      select 1 from import_job j join clan c on c.id=j.clan_id
      where c.clan_code='SCENARIO-ZHANG-HUAIYANG'
        and (select count(*) from import_job_row r where r.job_id=j.id and r.row_status='draft_created')=9
        and (select count(*) from import_job_row r where r.job_id=j.id and r.row_status in('invalid','retry_failed'))=2
        and (select count(*) from import_job_row r where r.job_id=j.id and r.row_status='excluded')=1
    ) then raise exception 'Partial import row-state scenario is incomplete'; end if;

    select string_agg(required_status,', ' order by required_status) into v_missing
    from(values('PASSED'),('ISSUES_FOUND'),('FAILED'))req(required_status)
    where not exists(
      select 1 from review_quality_check q join clan c on c.id=q.clan_id
      where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and q.status=req.required_status
    );
    if v_missing is not null then raise exception 'Missing quality-check statuses: %',v_missing; end if;
    if not exists(select 1 from workbench_task_action a join clan c on c.id=a.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and a.action_type='mark_checked') then
      raise exception 'Workbench task action scenario is missing';
    end if;
    if not exists(
      select 1 from culture_revision_payload p join revision r on r.id=p.revision_id
      join clan c on c.id=r.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG'
    ) then raise exception 'Culture revision payload scenario is missing'; end if;
"""
if "Root branch path/level" not in verify:
    verify = replace_once(
        verify,
        "    if not exists(select 1 from operation_log l join clan c on c.id=l.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and l.event_result='denied' and l.risk_level='high') then raise exception 'High-risk denied operation scenario is missing'; end if;\nend $$;",
        "    if not exists(select 1 from operation_log l join clan c on c.id=l.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and l.event_result='denied' and l.risk_level='high') then raise exception 'High-risk denied operation scenario is missing'; end if;" + invariants + "\nend $$;",
        "verification domain invariants",
    )
    verify = replace_once(
        verify,
        " (select count(*) from import_job j where j.clan_id=c.id)import_jobs,\n (select count(*) from operation_log l where l.clan_id=c.id)operation_logs",
        " (select count(*) from import_job j where j.clan_id=c.id)import_jobs,\n (select count(*) from import_job_row r join import_job j on j.id=r.job_id where j.clan_id=c.id)import_rows,\n (select count(*) from review_quality_check q where q.clan_id=c.id)quality_checks,\n (select count(*) from workbench_task_action a where a.clan_id=c.id)workbench_actions,\n (select count(*) from operation_log l where l.clan_id=c.id)operation_logs",
        "verification evidence columns",
    )
write(verify_path, verify)

test = read(TEST)
if "insert into import_job_row" not in test:
    test = replace_once(
        test,
        ".contains(\"insert into import_job\")\n                .contains(\"insert into operation_log\")",
        ".contains(\"insert into import_job\")\n                .contains(\"insert into import_job_row\")\n                .contains(\"insert into import_job_chunk\")\n                .contains(\"insert into import_job_payload\")\n                .contains(\"insert into import_file_fingerprint\")\n                .contains(\"insert into review_quality_check\")\n                .contains(\"insert into workbench_task_action\")\n                .contains(\"insert into culture_revision_payload\")\n                .contains(\"insert into operation_log\")",
        "contract scenario extensions",
    )
    test = replace_once(
        test,
        ".contains(\"nextval(pg_get_serial_sequence('person','id'))\")\n                .contains(\"relation_category\")",
        ".contains(\"nextval(pg_get_serial_sequence('person','id'))\")\n                .contains(\"with recursive branch_tree\")\n                .contains(\"with recursive person_tree\")\n                .contains(\"make_interval(years =>\")\n                .contains(\"relation_category\")",
        "contract performance extensions",
    )
    test = replace_once(
        test,
        ".contains(\"Member role scope points outside membership clan\")\n                .contains(\"Seed integrity verification passed\")",
        ".contains(\"Member role scope points outside membership clan\")\n                .contains(\"Root branch path/level does not match application hierarchy semantics\")\n                .contains(\"Person death date precedes birth date\")\n                .contains(\"Parent-child generation numbers are inconsistent\")\n                .contains(\"Async import recovery state is incomplete\")\n                .contains(\"Missing quality-check statuses\")\n                .contains(\"Workbench task action scenario is missing\")\n                .contains(\"Seed integrity verification passed\")",
        "contract verification extensions",
    )
write(TEST, test)

readme = read(README)
addition = """

## 领域一致性保证

当前脚本除数据库约束外，还显式校验应用层语义：支派路径采用 `父路径/子ID`、层级与父子关系一致；人物生卒时间合法；父子关系代次相差一代；导入任务具有逐行状态、异步载荷、分片与文件指纹；审核质量检查、文化审核载荷和修谱工作台动作均有确定性场景。`30_verify_seed_data.sql` 会在任一条件不满足时失败。
"""
if "## 领域一致性保证" not in readme:
    readme = readme.rstrip() + addition + "\n"
write(README, readme)

print("Current seed scripts aligned with the latest implemented model.")
