create index if not exists idx_revision_source_binding_pending
    on revision (target_type, target_id, status)
    where target_type = 'source_binding';

create index if not exists idx_review_task_revision_status
    on review_task (revision_id, status);

create index if not exists idx_source_binding_active_target
    on source_binding (source_id, target_type, target_id, binding_status);
