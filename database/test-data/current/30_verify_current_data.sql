\set ON_ERROR_STOP on

\echo 'Current-model seed verification started.'

do $$
declare
    v_count bigint;
begin
    select count(*) into v_count
    from clan
    where clan_code in ('SCN-ZHANG-CURRENT', 'SCN-LI-ISOLATION');
    if v_count <> 2 then
        raise exception 'Scenario clans are incomplete: expected 2, actual %', v_count;
    end if;

    select count(*) into v_count
    from branch b
    join branch p on p.id = b.parent_id
    where b.clan_id <> p.clan_id;
    if v_count > 0 then
        raise exception 'Branch parents cross clan boundaries: %', v_count;
    end if;

    select count(*) into v_count
    from person p
    left join branch b on b.id = p.branch_id
    where p.branch_id is not null
      and (b.id is null or b.clan_id <> p.clan_id);
    if v_count > 0 then
        raise exception 'Persons reference a missing or cross-clan branch: %', v_count;
    end if;

    select count(*) into v_count
    from clan c
    join person p on p.id = c.ancestor_person_id
    where p.clan_id <> c.id;
    if v_count > 0 then
        raise exception 'Clan ancestor belongs to another clan: %', v_count;
    end if;

    select count(*) into v_count
    from branch b
    join person p on p.id = b.founder_person_id
    where p.clan_id <> b.clan_id;
    if v_count > 0 then
        raise exception 'Branch founder belongs to another clan: %', v_count;
    end if;

    select count(*) into v_count
    from relationship r
    left join person f on f.id = r.from_person_id
    left join person t on t.id = r.to_person_id
    where f.id is null or t.id is null
       or f.clan_id <> r.clan_id
       or t.clan_id <> r.clan_id
       or r.from_person_id = r.to_person_id;
    if v_count > 0 then
        raise exception 'Invalid relationship endpoints: %', v_count;
    end if;

    select count(*) into v_count
    from relationship
    where not (
        (relation_type = 'parent_child' and relation_category = 'blood') or
        (relation_type = 'spouse' and relation_category = 'marriage') or
        (relation_type in ('adoptive','successor','out_adoption','in_adoption','dual_successor','heir_son') and relation_category = 'ritual') or
        (relation_type = 'no_descendant' and relation_category = 'status')
    );
    if v_count > 0 then
        raise exception 'Relationship type/category mismatch: %', v_count;
    end if;

    select count(*) into v_count
    from relationship r
    where r.relation_type = 'spouse'
      and r.deleted_at is null
      and not exists (
          select 1
          from relationship rr
          where rr.clan_id = r.clan_id
            and rr.from_person_id = r.to_person_id
            and rr.to_person_id = r.from_person_id
            and rr.relation_type = 'spouse'
            and rr.deleted_at is null
      );
    if v_count > 0 then
        raise exception 'Spouse relationships missing reverse edge: %', v_count;
    end if;

    select count(distinct relation_type) into v_count
    from relationship r
    join clan c on c.id = r.clan_id
    where c.clan_code = 'SCN-ZHANG-CURRENT'
      and r.relation_type in (
          'parent_child','spouse','in_adoption','out_adoption',
          'successor','dual_successor','heir_son','no_descendant'
      );
    if v_count <> 8 then
        raise exception 'Scenario relationship types are incomplete: expected 8, actual %', v_count;
    end if;

    with recursive branch_walk as (
        select b.id as start_id,
               b.id as current_id,
               b.parent_id,
               array[b.id]::bigint[] as visited,
               false as cycle
        from branch b
        union all
        select w.start_id,
               p.id,
               p.parent_id,
               w.visited || p.id,
               p.id = any(w.visited)
        from branch_walk w
        join branch p on p.id = w.parent_id
        where not w.cycle
          and cardinality(w.visited) <= 1000
    )
    select count(*) into v_count from branch_walk where cycle;
    if v_count > 0 then
        raise exception 'Branch hierarchy contains cycles: %', v_count;
    end if;

    with recursive lineage_walk as (
        select r.from_person_id as start_id,
               r.to_person_id as current_id,
               array[r.from_person_id, r.to_person_id]::bigint[] as visited,
               r.to_person_id = r.from_person_id as cycle
        from relationship r
        where r.relation_type = 'parent_child'
          and r.deleted_at is null
        union all
        select w.start_id,
               r.to_person_id,
               w.visited || r.to_person_id,
               r.to_person_id = any(w.visited)
        from lineage_walk w
        join relationship r
          on r.from_person_id = w.current_id
         and r.relation_type = 'parent_child'
         and r.deleted_at is null
        where not w.cycle
          and cardinality(w.visited) <= 1000
    )
    select count(*) into v_count from lineage_walk where cycle;
    if v_count > 0 then
        raise exception 'Biological parent-child graph contains cycles: %', v_count;
    end if;

    select count(*) into v_count
    from source_binding sb
    left join source s on s.id = sb.source_id
    where s.id is null or s.clan_id <> sb.clan_id;
    if v_count > 0 then
        raise exception 'Source bindings reference a missing or cross-clan source: %', v_count;
    end if;

    select count(*) into v_count
    from source_binding sb
    where (sb.target_type = 'person' and not exists (select 1 from person p where p.id = sb.target_id and p.clan_id = sb.clan_id))
       or (sb.target_type = 'relationship' and not exists (select 1 from relationship r where r.id = sb.target_id and r.clan_id = sb.clan_id))
       or (sb.target_type = 'branch' and not exists (select 1 from branch b where b.id = sb.target_id and b.clan_id = sb.clan_id))
       or (sb.target_type = 'generation_word' and not exists (
              select 1 from generation_word gw
              join generation_scheme gs on gs.id = gw.scheme_id
              where gw.id = sb.target_id and gs.clan_id = sb.clan_id
          ))
       or (sb.target_type = 'culture_item' and not exists (select 1 from culture_item ci where ci.id = sb.target_id and ci.clan_id = sb.clan_id))
       or (sb.target_type = 'migration_event' and not exists (select 1 from migration_event me where me.id = sb.target_id and me.clan_id = sb.clan_id))
       or (sb.target_type = 'culture_site' and not exists (select 1 from culture_site cs where cs.id = sb.target_id and cs.clan_id = sb.clan_id));
    if v_count > 0 then
        raise exception 'Source bindings reference a missing or cross-clan target: %', v_count;
    end if;

    select count(*) into v_count
    from clan_membership m
    left join person p on p.id = m.person_id
    where m.person_id is not null
      and (p.id is null or p.clan_id <> m.clan_id);
    if v_count > 0 then
        raise exception 'Membership person belongs to another clan: %', v_count;
    end if;

    select count(*) into v_count
    from member_role mr
    join clan_membership m on m.id = mr.membership_id
    where (mr.scope_type = 'clan' and mr.scope_id <> m.clan_id)
       or (mr.scope_type = 'branch' and not exists (
              select 1 from branch b where b.id = mr.scope_id and b.clan_id = m.clan_id
          ))
       or (mr.scope_type = 'self' and not exists (
              select 1 from person p where p.id = mr.scope_id and p.clan_id = m.clan_id
          ));
    if v_count > 0 then
        raise exception 'Member role scope is inconsistent: %', v_count;
    end if;

    select count(*) into v_count
    from review_task rt
    join revision rv on rv.id = rt.revision_id
    where rt.clan_id <> rv.clan_id
       or (rt.trace_id is not null and rv.trace_id is not null and rt.trace_id <> rv.trace_id)
       or rt.reviewer_id = rv.submitter_id;
    if v_count > 0 then
        raise exception 'Review task/revision consistency failure: %', v_count;
    end if;

    select count(distinct status) into v_count
    from revision rv
    join clan c on c.id = rv.clan_id
    where c.clan_code = 'SCN-ZHANG-CURRENT'
      and status in ('approved','pending','rejected');
    if v_count <> 3 then
        raise exception 'Revision state coverage is incomplete: expected 3, actual %', v_count;
    end if;

    select count(*) into v_count
    from migration_event
    where btrim(coalesce(from_location, '')) = ''
       or btrim(coalesce(to_location, '')) = ''
       or lower(regexp_replace(btrim(from_location), '\s+', '', 'g')) = lower(regexp_replace(btrim(to_location), '\s+', '', 'g'));
    if v_count > 0 then
        raise exception 'Migration event location constraint failure: %', v_count;
    end if;

    select count(*) into v_count
    from culture_site
    where (latitude is null) <> (longitude is null)
       or latitude not between -90 and 90
       or longitude not between -180 and 180;
    if v_count > 0 then
        raise exception 'Culture site coordinate constraint failure: %', v_count;
    end if;
end
$$;

\echo 'Verification passed. Current data volume:'
select 'clan' as object_type, count(*)::bigint as row_count from clan
union all select 'branch', count(*) from branch
union all select 'person', count(*) from person
union all select 'relationship', count(*) from relationship
union all select 'person_event', count(*) from person_event
union all select 'source', count(*) from source
union all select 'source_binding', count(*) from source_binding
union all select 'revision', count(*) from revision
union all select 'review_task', count(*) from review_task
union all select 'import_job', count(*) from import_job
union all select 'culture_item', count(*) from culture_item
union all select 'migration_event', count(*) from migration_event
union all select 'culture_site', count(*) from culture_site
order by object_type;

\echo 'Per-clan scale:'
select c.clan_code,
       count(distinct b.id) as branches,
       count(distinct p.id) as persons,
       count(distinct r.id) as relationships,
       count(distinct pe.id) as events
from clan c
left join branch b on b.clan_id = c.id
left join person p on p.clan_id = c.id
left join relationship r on r.clan_id = c.id
left join person_event pe on pe.clan_id = c.id
group by c.id, c.clan_code
order by c.clan_code;
