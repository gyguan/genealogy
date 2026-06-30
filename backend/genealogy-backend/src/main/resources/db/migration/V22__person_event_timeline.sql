-- Person key event timeline for archive detail pages.
-- Idempotent schema plus derived demo events from existing person and relationship data.

create table if not exists person_event (
    id bigserial primary key,
    clan_id bigint references clan(id),
    person_id bigint references person(id),
    event_type varchar(50),
    event_title varchar(200),
    event_date date,
    event_date_precision varchar(20) default 'day',
    event_place varchar(255),
    event_description text,
    source_type varchar(50),
    source_id bigint,
    sort_order int default 0,
    data_status varchar(32) default 'official',
    created_by bigint,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    deleted_at timestamp
);

alter table person_event add column if not exists clan_id bigint;
alter table person_event add column if not exists person_id bigint;
alter table person_event add column if not exists event_type varchar(50);
alter table person_event add column if not exists event_title varchar(200);
alter table person_event add column if not exists event_date date;
alter table person_event add column if not exists event_date_precision varchar(20) default 'day';
alter table person_event add column if not exists event_place varchar(255);
alter table person_event add column if not exists event_description text;
alter table person_event add column if not exists source_type varchar(50);
alter table person_event add column if not exists source_id bigint;
alter table person_event add column if not exists sort_order int default 0;
alter table person_event add column if not exists data_status varchar(32) default 'official';
alter table person_event add column if not exists created_by bigint;
alter table person_event add column if not exists created_at timestamp default now();
alter table person_event add column if not exists updated_at timestamp default now();
alter table person_event add column if not exists deleted_at timestamp;

create index if not exists idx_person_event_person_date on person_event(person_id, event_date, sort_order);
create index if not exists idx_person_event_clan on person_event(clan_id);
create index if not exists idx_person_event_type on person_event(event_type);

-- Birth events.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    p.clan_id,
    p.id,
    'birth',
    '出生',
    p.birth_date,
    coalesce(nullif(p.birth_date_precision, ''), 'day'),
    p.birth_place,
    p.name || '出生于' || coalesce(p.birth_place, '未详地点') || '。',
    'person',
    p.id,
    10,
    coalesce(p.data_status, 'official'),
    coalesce(p.created_by, 1),
    now(),
    now()
from person p
where p.deleted_at is null
  and p.birth_date is not null
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'birth'
        and e.source_type = 'person'
        and e.source_id = p.id
  );

-- Education / adulthood events.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    p.clan_id,
    p.id,
    'education',
    '教育经历',
    p.birth_date + interval '18 years',
    'year',
    p.residence_place,
    p.name || '接受' || p.education || '教育。',
    'person',
    p.id,
    20,
    coalesce(p.data_status, 'official'),
    coalesce(p.created_by, 1),
    now(),
    now()
from person p
where p.deleted_at is null
  and p.birth_date is not null
  and p.education is not null
  and trim(p.education) <> ''
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'education'
        and e.source_type = 'person'
        and e.source_id = p.id
  );

-- Career / title events.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    p.clan_id,
    p.id,
    'career',
    '职业经历',
    p.birth_date + interval '28 years',
    'year',
    p.residence_place,
    p.name || '从事' || p.occupation || coalesce('，' || nullif(p.title_or_honor, ''), '') || '。',
    'person',
    p.id,
    30,
    coalesce(p.data_status, 'official'),
    coalesce(p.created_by, 1),
    now(),
    now()
from person p
where p.deleted_at is null
  and p.birth_date is not null
  and p.occupation is not null
  and trim(p.occupation) <> ''
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'career'
        and e.source_type = 'person'
        and e.source_id = p.id
  );

-- Residence / migration events.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    p.clan_id,
    p.id,
    'migration',
    '居住迁徙',
    p.birth_date + interval '30 years',
    'year',
    p.residence_place,
    p.name || '长期居住于' || p.residence_place || '。',
    'person',
    p.id,
    40,
    coalesce(p.data_status, 'official'),
    coalesce(p.created_by, 1),
    now(),
    now()
from person p
where p.deleted_at is null
  and p.birth_date is not null
  and p.residence_place is not null
  and trim(p.residence_place) <> ''
  and coalesce(p.residence_place, '') <> coalesce(p.birth_place, '')
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'migration'
        and e.source_type = 'person'
        and e.source_id = p.id
  );

-- Marriage events for both spouses.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    r.clan_id,
    p.id,
    'marriage',
    '婚配',
    coalesce(p.birth_date, other.birth_date) + interval '24 years',
    'year',
    coalesce(p.residence_place, other.residence_place),
    p.name || '与' || other.name || '结为配偶。',
    'relationship',
    r.id,
    50,
    coalesce(r.data_status, 'official'),
    coalesce(r.created_by, 1),
    now(),
    now()
from relationship r
join person p on p.id in (r.from_person_id, r.to_person_id)
join person other on other.id = case when p.id = r.from_person_id then r.to_person_id else r.from_person_id end
where r.deleted_at is null
  and p.deleted_at is null
  and other.deleted_at is null
  and r.relation_type = 'spouse'
  and coalesce(p.birth_date, other.birth_date) is not null
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'marriage'
        and e.source_type = 'relationship'
        and e.source_id = r.id
  );

-- Child birth events for parents.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    r.clan_id,
    parent.id,
    'child_birth',
    '子女出生',
    child.birth_date,
    coalesce(nullif(child.birth_date_precision, ''), 'day'),
    child.birth_place,
    parent.name || '之子女' || child.name || '出生。',
    'relationship',
    r.id,
    60,
    coalesce(r.data_status, 'official'),
    coalesce(r.created_by, 1),
    now(),
    now()
from relationship r
join person parent on parent.id = r.from_person_id
join person child on child.id = r.to_person_id
where r.deleted_at is null
  and parent.deleted_at is null
  and child.deleted_at is null
  and r.relation_type = 'parent_child'
  and child.birth_date is not null
  and not exists (
      select 1 from person_event e
      where e.person_id = parent.id
        and e.event_type = 'child_birth'
        and e.source_type = 'relationship'
        and e.source_id = r.id
  );

-- Death events.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    p.clan_id,
    p.id,
    'death',
    '逝世',
    p.death_date,
    coalesce(nullif(p.death_date_precision, ''), 'day'),
    p.residence_place,
    p.name || '逝世。',
    'person',
    p.id,
    90,
    coalesce(p.data_status, 'official'),
    coalesce(p.created_by, 1),
    now(),
    now()
from person p
where p.deleted_at is null
  and p.death_date is not null
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'death'
        and e.source_type = 'person'
        and e.source_id = p.id
  );

-- Burial / epitaph events.
insert into person_event (
    clan_id, person_id, event_type, event_title, event_date, event_date_precision,
    event_place, event_description, source_type, source_id, sort_order, data_status,
    created_by, created_at, updated_at
)
select
    p.clan_id,
    p.id,
    'burial',
    '墓葬记载',
    p.death_date,
    coalesce(nullif(p.death_date_precision, ''), 'day'),
    p.tomb_place,
    coalesce(nullif(p.epitaph, ''), p.name || '墓葬地记录为' || p.tomb_place || '。'),
    'person',
    p.id,
    100,
    coalesce(p.data_status, 'official'),
    coalesce(p.created_by, 1),
    now(),
    now()
from person p
where p.deleted_at is null
  and p.death_date is not null
  and p.tomb_place is not null
  and trim(p.tomb_place) <> ''
  and p.tomb_place <> '在世人员暂未维护墓葬地'
  and not exists (
      select 1 from person_event e
      where e.person_id = p.id
        and e.event_type = 'burial'
        and e.source_type = 'person'
        and e.source_id = p.id
  );
