\set ON_ERROR_STOP on

-- Fails fast when deterministic scenario/performance data violates current invariants.
begin;

create temporary table verified_seed_clan as
select id,clan_code from clan where clan_code like 'SCENARIO-%' or clan_code like 'PERF-%';

do $$
declare v_count bigint; v_missing text;
begin
    if not exists(select 1 from clan where clan_code='SCENARIO-ZHANG-HUAIYANG') then raise exception 'Missing SCENARIO-ZHANG-HUAIYANG; run 10_seed_current_scenarios.sql'; end if;
    if not exists(select 1 from clan where clan_code='SCENARIO-LI-LONGXI') then raise exception 'Missing SCENARIO-LI-LONGXI; run 10_seed_current_scenarios.sql'; end if;

    select count(*) into v_count from branch b join verified_seed_clan c on c.id=b.clan_id;
    if v_count<9 then raise exception 'Expected at least 9 scenario branches, found %',v_count; end if;
    select count(*) into v_count from person p join verified_seed_clan c on c.id=p.clan_id where p.deleted_at is null;
    if v_count<20 then raise exception 'Expected at least 20 scenario people, found %',v_count; end if;

    if exists(select 1 from branch child join branch parent on parent.id=child.parent_id join verified_seed_clan c on c.id=child.clan_id where child.clan_id<>parent.clan_id) then raise exception 'Cross-clan branch parent detected'; end if;
    if exists(select 1 from person p join branch b on b.id=p.branch_id join verified_seed_clan c on c.id=p.clan_id where p.clan_id<>b.clan_id) then raise exception 'Person points to a branch in another clan'; end if;

    if exists(
      with recursive walk as(
        select b.id,b.parent_id,b.clan_id,array[b.id] path,false cycle from branch b join verified_seed_clan c on c.id=b.clan_id where b.parent_id is null
        union all
        select child.id,child.parent_id,child.clan_id,walk.path||child.id,child.id=any(walk.path)
        from walk join branch child on child.parent_id=walk.id and child.clan_id=walk.clan_id where not walk.cycle
      ) select 1 from walk where cycle limit 1
    ) then raise exception 'Branch cycle detected'; end if;

    if exists(
      with recursive reachable as(
        select b.id,b.clan_id from branch b join verified_seed_clan c on c.id=b.clan_id where b.parent_id is null
        union select child.id,child.clan_id from reachable r join branch child on child.parent_id=r.id and child.clan_id=r.clan_id
      ) select 1 from branch b join verified_seed_clan c on c.id=b.clan_id left join reachable r on r.id=b.id where r.id is null limit 1
    ) then raise exception 'Unreachable branch detected (cycle or invalid root topology)'; end if;

    if exists(select 1 from relationship r join person f on f.id=r.from_person_id join person t on t.id=r.to_person_id join verified_seed_clan c on c.id=r.clan_id where r.clan_id<>f.clan_id or r.clan_id<>t.clan_id) then raise exception 'Cross-clan relationship endpoint detected'; end if;
    if exists(select 1 from relationship r join verified_seed_clan c on c.id=r.clan_id where r.from_person_id=r.to_person_id) then raise exception 'Self relationship detected'; end if;
    if exists(
      select 1 from relationship r join verified_seed_clan c on c.id=r.clan_id
      where not((r.relation_type='parent_child' and r.relation_category='blood') or (r.relation_type='spouse' and r.relation_category='marriage') or (r.relation_type in('adoptive','successor','out_adoption','in_adoption','dual_successor','heir_son') and r.relation_category='ritual') or (r.relation_type='no_descendant' and r.relation_category='status'))
    ) then raise exception 'Relationship type/category mismatch detected'; end if;

    select string_agg(required_type,', ' order by required_type) into v_missing
    from(values('parent_child'),('spouse'),('adoptive'),('successor'),('out_adoption'),('in_adoption'),('dual_successor'),('heir_son'),('no_descendant'))req(required_type)
    where not exists(select 1 from relationship r join clan c on c.id=r.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and r.relation_type=req.required_type);
    if v_missing is not null then raise exception 'Missing relationship scenario types: %',v_missing; end if;

    if exists(select 1 from source_binding sb join source s on s.id=sb.source_id join verified_seed_clan c on c.id=sb.clan_id where sb.clan_id<>s.clan_id) then raise exception 'Source binding/source clan mismatch detected'; end if;
    if exists(select 1 from person_event e join person p on p.id=e.person_id join verified_seed_clan c on c.id=e.clan_id where e.clan_id<>p.clan_id) then raise exception 'Person event/person clan mismatch detected'; end if;
    if exists(select 1 from review_task t join revision r on r.id=t.revision_id join verified_seed_clan c on c.id=t.clan_id where t.reviewer_id is not null and t.reviewer_id=r.submitter_id) then raise exception 'Self-review detected'; end if;

    select string_agg(required_status,', ' order by required_status) into v_missing
    from(values('approved'),('pending'),('rejected'))req(required_status)
    where not exists(select 1 from revision r join clan c on c.id=r.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and r.status=req.required_status);
    if v_missing is not null then raise exception 'Missing revision statuses: %',v_missing; end if;

    if exists(select 1 from clan_membership m join person p on p.id=m.person_id join verified_seed_clan c on c.id=m.clan_id where m.clan_id<>p.clan_id) then raise exception 'Membership/person clan mismatch detected'; end if;
    if exists(
      select 1 from member_role mr join clan_membership m on m.id=mr.membership_id join verified_seed_clan c on c.id=m.clan_id
      left join branch b on mr.scope_type='branch' and b.id=mr.scope_id
      left join person p on mr.scope_type='self' and p.id=mr.scope_id
      where (mr.scope_type='clan' and mr.scope_id<>m.clan_id) or (mr.scope_type='branch' and(b.id is null or b.clan_id<>m.clan_id)) or (mr.scope_type='self' and(p.id is null or p.clan_id<>m.clan_id))
    ) then raise exception 'Member role scope points outside membership clan'; end if;

    if not exists(select 1 from person p join clan c on c.id=p.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and p.name='张俊杰' group by p.name having count(*)>=3) then raise exception 'Same-name-different-person scenario is missing'; end if;
    if not exists(select 1 from person p join clan c on c.id=p.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and p.is_living=true and p.privacy_level='private') then raise exception 'Living private-person scenario is missing'; end if;
    if not exists(select 1 from import_job j join clan c on c.id=j.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and j.failure_count>0) then raise exception 'Partial import failure scenario is missing'; end if;
    if not exists(select 1 from operation_log l join clan c on c.id=l.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and l.event_result='denied' and l.risk_level='high') then raise exception 'High-risk denied operation scenario is missing'; end if;

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
      where r.relation_type='parent_child'
        and parent.person_code like 'PERF-%' and child.person_code like 'PERF-%'
        and parent.generation_no is not null and child.generation_no is not null
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

end $$;

do $$
declare v_count bigint; v_missing text;
begin
    if to_regclass('public.culture_item') is not null then
      execute $q$select count(*) from culture_item i join clan c on c.id=i.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and i.deleted_at is null$q$ into v_count;
      if v_count<4 then raise exception 'Expected at least 4 culture item scenarios, found %',v_count; end if;
      execute $q$select string_agg(s,', ' order by s) from(values('official'),('pending_review'),('rejected'))req(s) where not exists(select 1 from culture_item i join clan c on c.id=i.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and i.data_status=req.s)$q$ into v_missing;
      if v_missing is not null then raise exception 'Missing culture item statuses: %',v_missing; end if;
    end if;
    if to_regclass('public.migration_event') is not null then
      execute $q$select count(*) from migration_event m join clan c on c.id=m.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and m.deleted_at is null$q$ into v_count;
      if v_count<2 then raise exception 'Expected at least 2 migration event scenarios, found %',v_count; end if;
      if exists(select 1 from migration_event m join verified_seed_clan c on c.id=m.clan_id where btrim(m.from_location)=btrim(m.to_location)) then raise exception 'Migration event has identical origin and destination'; end if;
    end if;
    if to_regclass('public.culture_site') is not null then
      execute $q$select count(*) from culture_site s join clan c on c.id=s.clan_id where c.clan_code='SCENARIO-ZHANG-HUAIYANG' and s.deleted_at is null$q$ into v_count;
      if v_count<2 then raise exception 'Expected at least 2 culture site scenarios, found %',v_count; end if;
    end if;
end $$;

select c.clan_code,
 (select count(*) from branch b where b.clan_id=c.id)branches,
 (select count(*) from person p where p.clan_id=c.id and p.deleted_at is null)people,
 (select count(*) from relationship r where r.clan_id=c.id and r.deleted_at is null)relationships,
 (select count(*) from person_event e where e.clan_id=c.id and e.deleted_at is null)person_events,
 (select count(*) from source s where s.clan_id=c.id)sources,
 (select count(*) from source_binding sb where sb.clan_id=c.id)source_bindings,
 (select count(*) from revision r where r.clan_id=c.id)revisions,
 (select count(*) from review_task t where t.clan_id=c.id)review_tasks,
 (select count(*) from import_job j where j.clan_id=c.id)import_jobs,
 (select count(*) from import_job_row r join import_job j on j.id=r.job_id where j.clan_id=c.id)import_rows,
 (select count(*) from review_quality_check q where q.clan_id=c.id)quality_checks,
 (select count(*) from workbench_task_action a where a.clan_id=c.id)workbench_actions,
 (select count(*) from operation_log l where l.clan_id=c.id)operation_logs
from clan c join verified_seed_clan v on v.id=c.id order by c.clan_code;

commit;
\echo 'Seed integrity verification passed.'
