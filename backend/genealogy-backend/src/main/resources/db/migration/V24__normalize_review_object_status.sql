-- Normalize business object lifecycle statuses to:
-- draft -> pending_review -> official
--                      -> rejected
--
-- Review task/audit statuses remain workflow statuses and are intentionally not changed here.

-- person.data_status historically used draft/pending_review/official/rejected, but also tolerate legacy aliases.
update person
set data_status = case
    when lower(coalesce(data_status, '')) in ('active', 'approved', 'verified') then 'official'
    when lower(coalesce(data_status, '')) in ('pending') then 'pending_review'
    when lower(coalesce(data_status, '')) in ('reject') then 'rejected'
    when data_status is null or trim(data_status) = '' then 'official'
    else lower(data_status)
end
where data_status is null
   or lower(coalesce(data_status, '')) in ('active', 'approved', 'verified', 'pending', 'reject', 'draft', 'pending_review', 'official', 'rejected');

-- relationship.data_status follows the same lifecycle as person.data_status.
update relationship
set data_status = case
    when lower(coalesce(data_status, '')) in ('active', 'approved', 'verified') then 'official'
    when lower(coalesce(data_status, '')) in ('pending') then 'pending_review'
    when lower(coalesce(data_status, '')) in ('reject') then 'rejected'
    when data_status is null or trim(data_status) = '' then 'official'
    else lower(data_status)
end
where data_status is null
   or lower(coalesce(data_status, '')) in ('active', 'approved', 'verified', 'pending', 'reject', 'draft', 'pending_review', 'official', 'rejected');

-- branch.status used active before; convert it to official.
update branch
set status = case
    when lower(coalesce(status, '')) in ('active', 'approved', 'verified') then 'official'
    when lower(coalesce(status, '')) in ('pending') then 'pending_review'
    when lower(coalesce(status, '')) in ('reject') then 'rejected'
    when status is null or trim(status) = '' then 'official'
    else lower(status)
end
where status is null
   or lower(coalesce(status, '')) in ('active', 'approved', 'verified', 'pending', 'reject', 'draft', 'pending_review', 'official', 'rejected');

-- generation_scheme.status used active before; convert it to official.
update generation_scheme
set status = case
    when lower(coalesce(status, '')) in ('active', 'approved', 'verified') then 'official'
    when lower(coalesce(status, '')) in ('pending') then 'pending_review'
    when lower(coalesce(status, '')) in ('reject') then 'rejected'
    when status is null or trim(status) = '' then 'official'
    else lower(status)
end
where status is null
   or lower(coalesce(status, '')) in ('active', 'approved', 'verified', 'pending', 'reject', 'draft', 'pending_review', 'official', 'rejected');

-- source.verification_status used verified/unverified before; map it into the unified object lifecycle.
update source
set verification_status = case
    when lower(coalesce(verification_status, '')) in ('active', 'approved', 'verified') then 'official'
    when lower(coalesce(verification_status, '')) in ('pending') then 'pending_review'
    when lower(coalesce(verification_status, '')) in ('unverified') then 'draft'
    when lower(coalesce(verification_status, '')) in ('reject') then 'rejected'
    when verification_status is null or trim(verification_status) = '' then 'official'
    else lower(verification_status)
end
where verification_status is null
   or lower(coalesce(verification_status, '')) in ('active', 'approved', 'verified', 'unverified', 'pending', 'reject', 'draft', 'pending_review', 'official', 'rejected');
