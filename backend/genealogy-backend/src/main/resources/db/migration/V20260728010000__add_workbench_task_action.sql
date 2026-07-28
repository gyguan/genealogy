CREATE TABLE IF NOT EXISTS workbench_task_action (
    id BIGSERIAL PRIMARY KEY,
    clan_id BIGINT NOT NULL,
    task_key VARCHAR(255) NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    comment_text VARCHAR(500),
    actor_id BIGINT NOT NULL,
    expected_updated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_workbench_task_action
        UNIQUE (clan_id, task_key, action_type)
);

CREATE INDEX IF NOT EXISTS idx_workbench_task_action_clan_created
    ON workbench_task_action(clan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workbench_task_action_actor
    ON workbench_task_action(actor_id, created_at DESC);
