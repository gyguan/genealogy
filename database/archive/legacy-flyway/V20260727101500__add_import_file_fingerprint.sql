CREATE TABLE IF NOT EXISTS import_file_fingerprint (
    id BIGSERIAL PRIMARY KEY,
    clan_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    import_type VARCHAR(32) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    job_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_import_file_fingerprint_job
        FOREIGN KEY (job_id) REFERENCES import_job(id),
    CONSTRAINT uk_import_file_fingerprint_scope
        UNIQUE (clan_id, branch_id, import_type, file_hash),
    CONSTRAINT uk_import_file_fingerprint_job
        UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_import_file_fingerprint_job
    ON import_file_fingerprint(job_id);
