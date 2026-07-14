from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"expected fragment not found: {path}")
    target.write_text(text.replace(old, new, 1))


replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/auth/config/AuthProperties.java",
    "    private int loginWindowMinutes = 15;\n    private int accountMaxFailures = 5;\n    private int ipMaxFailures = 20;\n",
    "    private int loginWindowMinutes = 15;\n    private int loginCooldownMinutes = 15;\n"
    "    private int accountMaxFailures = 5;\n    private int ipMaxFailures = 20;\n"
    "    private long sessionCleanupIntervalMs = 3600000L;\n    private int sessionRetentionDays = 30;\n",
)

replace(
    "backend/genealogy-backend/src/main/resources/application.yml",
    "    login-window-minutes: ${GENEALOGY_AUTH_LOGIN_WINDOW_MINUTES:15}\n"
    "    account-max-failures: ${GENEALOGY_AUTH_ACCOUNT_MAX_FAILURES:5}\n"
    "    ip-max-failures: ${GENEALOGY_AUTH_IP_MAX_FAILURES:20}\n",
    "    login-window-minutes: ${GENEALOGY_AUTH_LOGIN_WINDOW_MINUTES:15}\n"
    "    login-cooldown-minutes: ${GENEALOGY_AUTH_LOGIN_COOLDOWN_MINUTES:15}\n"
    "    account-max-failures: ${GENEALOGY_AUTH_ACCOUNT_MAX_FAILURES:5}\n"
    "    ip-max-failures: ${GENEALOGY_AUTH_IP_MAX_FAILURES:20}\n"
    "    session-cleanup-interval-ms: ${GENEALOGY_AUTH_SESSION_CLEANUP_INTERVAL_MS:3600000}\n"
    "    session-retention-days: ${GENEALOGY_AUTH_SESSION_RETENTION_DAYS:30}\n",
)

Path("backend/genealogy-backend/src/main/java/com/genealogy/auth/repository/AuthLoginAttemptRepository.java").write_text(
    """package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface AuthLoginAttemptRepository extends JpaRepository<AuthLoginAttemptEntity, Long> {
    long countByAccountHashAndSuccessFalseAndCreatedAtAfter(String accountHash, LocalDateTime createdAt);
    long countByIpHashAndSuccessFalseAndCreatedAtAfter(String ipHash, LocalDateTime createdAt);
    Optional<AuthLoginAttemptEntity> findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(String accountHash);
    Optional<AuthLoginAttemptEntity> findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(String ipHash);
    long deleteByAccountHashAndSuccessFalse(String accountHash);
}
"""
)

replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/auth/application/AuthSecurityService.java",
    """    public void requireLoginAllowed(String account, String clientIp) {
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(properties.getLoginWindowMinutes());
        long accountFailures = loginAttemptRepository.countByAccountHashAndSuccessFalseAndCreatedAtAfter(
                accountHash(account), windowStart
        );
        long ipFailures = loginAttemptRepository.countByIpHashAndSuccessFalseAndCreatedAtAfter(
                ipHash(clientIp), windowStart
        );
        if (accountFailures >= properties.getAccountMaxFailures() || ipFailures >= properties.getIpMaxFailures()) {
            recordEvent(null, "login_throttled", "AUTH_LOGIN_THROTTLED", "high", clientIp, null, null,
                    "accountLimit=" + properties.getAccountMaxFailures() + ",ipLimit=" + properties.getIpMaxFailures());
            throw new BusinessException("AUTH_LOGIN_THROTTLED", "登录尝试过于频繁，请稍后再试");
        }
    }
""",
    """    public void requireLoginAllowed(String account, String clientIp) {
        LocalDateTime now = LocalDateTime.now();
        String accountHash = accountHash(account);
        String ipHash = ipHash(clientIp);
        var latestAccountFailure = loginAttemptRepository
                .findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(accountHash);
        var latestIpFailure = loginAttemptRepository
                .findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(ipHash);
        long accountFailures = latestAccountFailure
                .map(latest -> loginAttemptRepository.countByAccountHashAndSuccessFalseAndCreatedAtAfter(
                        accountHash, latest.getCreatedAt().minusMinutes(properties.getLoginWindowMinutes())))
                .orElse(0L);
        long ipFailures = latestIpFailure
                .map(latest -> loginAttemptRepository.countByIpHashAndSuccessFalseAndCreatedAtAfter(
                        ipHash, latest.getCreatedAt().minusMinutes(properties.getLoginWindowMinutes())))
                .orElse(0L);
        boolean accountCoolingDown = accountFailures >= properties.getAccountMaxFailures()
                && latestAccountFailure.orElseThrow().getCreatedAt()
                        .plusMinutes(properties.getLoginCooldownMinutes()).isAfter(now);
        boolean ipCoolingDown = ipFailures >= properties.getIpMaxFailures()
                && latestIpFailure.orElseThrow().getCreatedAt()
                        .plusMinutes(properties.getLoginCooldownMinutes()).isAfter(now);
        if (accountCoolingDown || ipCoolingDown) {
            recordEvent(null, "login_throttled", "AUTH_LOGIN_THROTTLED", "high", clientIp, null, null,
                    "accountLimited=" + accountCoolingDown + ",ipLimited=" + ipCoolingDown
                            + ",cooldownMinutes=" + properties.getLoginCooldownMinutes());
            throw new BusinessException("AUTH_LOGIN_THROTTLED", "登录尝试过于频繁，请稍后再试");
        }
    }
""",
)

Path("backend/genealogy-backend/src/main/java/com/genealogy/auth/repository/AuthSessionRepository.java").write_text(
    """package com.genealogy.auth.repository;

import com.genealogy.auth.entity.AuthSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, Long> {

    Optional<AuthSessionEntity> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(String tokenHash, LocalDateTime now);

    Optional<AuthSessionEntity> findByTokenHash(String tokenHash);

    List<AuthSessionEntity> findByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByLastAccessAtDesc(
            Long userId,
            LocalDateTime now
    );

    @Modifying
    @Query("delete from AuthSessionEntity s where s.expiresAt < :cutoff or (s.revokedAt is not null and s.revokedAt < :cutoff)")
    int deleteRetiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
"""
)

replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/auth/application/AuthApplicationService.java",
    """    @Transactional(readOnly = true)
    public AuthUserResponse currentUser(String authorization) {
        AuthSessionEntity session = getActiveSession(authorization);
        AppUserEntity user = requireActiveUser(session.getUserId());
        return toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public Long currentUserIdOrNull(String authorization) {
        if (authorization == null || authorization.isBlank()) return null;
        return getActiveSession(authorization).getUserId();
    }
""",
    """    @Transactional
    public AuthUserResponse currentUser(String authorization) {
        SessionUser context = requireActiveSessionUser(authorization);
        return toUserResponse(context.user());
    }

    @Transactional
    public Long currentUserIdOrNull(String authorization) {
        if (authorization == null || authorization.isBlank()) return null;
        return requireActiveSessionUser(authorization).user().getId();
    }
""",
)

replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/auth/application/AuthApplicationService.java",
    """        AuthSessionEntity current = getActiveSession(authorization);
        AppUserEntity user = requireActiveUser(current.getUserId());
""",
    """        SessionUser context = requireActiveSessionUser(authorization);
        AuthSessionEntity current = context.session();
        AppUserEntity user = context.user();
""",
)

replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/auth/application/AuthApplicationService.java",
    """    private AuthSessionEntity findActiveSession(String rawToken) {
        return authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                        PasswordHashUtil.sha256(rawToken), LocalDateTime.now())
                .orElseThrow(() -> new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期"));
    }

    private AppUserEntity requireActiveUser(Long userId) {
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("AUTH_USER_NOT_FOUND", "用户不存在"));
        if (!USER_STATUS_ACTIVE.equals(user.getStatus()) || user.getDeletedAt() != null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期");
        }
        return user;
    }
""",
    """    private AuthSessionEntity findActiveSession(String rawToken) {
        String tokenHash = PasswordHashUtil.sha256(rawToken);
        return authSessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                        tokenHash, LocalDateTime.now())
                .orElseGet(() -> {
                    authSessionRepository.findByTokenHash(tokenHash).ifPresent(session -> authSecurityService.recordEvent(
                            session.getUserId(), "session_replay_rejected", "AUTH_SESSION_REPLAYED", "high",
                            session.getClientIp(), session.getUserAgent(), null,
                            "sessionId=" + session.getId() + ",state="
                                    + (session.getRevokedAt() == null ? "expired" : "revoked")
                    ));
                    throw new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期");
                });
    }

    private SessionUser requireActiveSessionUser(String authorization) {
        AuthSessionEntity session = getActiveSession(authorization);
        AppUserEntity user = appUserRepository.findById(session.getUserId()).orElse(null);
        if (user == null || !USER_STATUS_ACTIVE.equals(user.getStatus()) || user.getDeletedAt() != null) {
            session.setRevokedAt(LocalDateTime.now());
            authSessionRepository.save(session);
            authSecurityService.recordEvent(
                    session.getUserId(), "session_revoked_account_inactive", "AUTH_UNAUTHORIZED", "high",
                    session.getClientIp(), session.getUserAgent(), null, "sessionId=" + session.getId()
            );
            throw new BusinessException("AUTH_UNAUTHORIZED", "登录状态无效或已过期");
        }
        return new SessionUser(session, user);
    }
""",
)

replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/auth/application/AuthApplicationService.java",
    """    public record AuthLoginResult(LoginResponse response, String sessionToken, int maxAgeSeconds) {
    }
""",
    """    private record SessionUser(AuthSessionEntity session, AppUserEntity user) {
    }

    public record AuthLoginResult(LoginResponse response, String sessionToken, int maxAgeSeconds) {
    }
""",
)

Path("backend/genealogy-backend/src/main/java/com/genealogy/auth/application/AuthSessionMaintenanceService.java").write_text(
    """package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.repository.AuthSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthSessionMaintenanceService {

    private final AuthSessionRepository authSessionRepository;
    private final AuthProperties properties;

    public AuthSessionMaintenanceService(AuthSessionRepository authSessionRepository, AuthProperties properties) {
        this.authSessionRepository = authSessionRepository;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${genealogy.auth.session-cleanup-interval-ms:3600000}")
    @Transactional
    public int cleanupRetiredSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(1, properties.getSessionRetentionDays()));
        return authSessionRepository.deleteRetiredBefore(cutoff);
    }
}
"""
)

replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/GenealogyApplication.java",
    "import org.springframework.boot.context.properties.EnableConfigurationProperties;\n",
    "import org.springframework.boot.context.properties.EnableConfigurationProperties;\n"
    "import org.springframework.scheduling.annotation.EnableScheduling;\n",
)
replace(
    "backend/genealogy-backend/src/main/java/com/genealogy/GenealogyApplication.java",
    "@SpringBootApplication\n@EnableConfigurationProperties",
    "@SpringBootApplication\n@EnableScheduling\n@EnableConfigurationProperties",
)

replace(
    "backend/genealogy-backend/pom.xml",
    "    <build>\n        <plugins>\n",
    """    <build>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <excludes>
                    <!-- Immutable duplicate versions stay in Git; runtime packages canonical V3/V4/V5 plus forward compensation. -->
                    <exclude>db/migration/V3__source_library_status_and_fields.sql</exclude>
                    <exclude>db/migration/V4__source_attachment_access_fields.sql</exclude>
                    <exclude>db/migration/V5__schema_validation_compat_tables.sql</exclude>
                    <exclude>db/migration/V5__source_binding_review_indexes.sql</exclude>
                </excludes>
            </resource>
        </resources>
        <plugins>
""",
)

Path("backend/genealogy-backend/src/main/resources/db/migration/V20260714070000__rebuild_legacy_duplicate_migrations.sql").write_text(
    r"""-- Forward compensation for immutable legacy duplicate V3/V4/V5 files.
-- Runtime packaging keeps permission V3/V4 and import-foundation V5 as canonical.

alter table source
    add column if not exists source_date varchar(100),
    add column if not exists confidence_level varchar(32) not null default 'unknown',
    add column if not exists privacy_level varchar(32) not null default 'clan_only',
    add column if not exists sensitive_level varchar(32) not null default 'normal',
    add column if not exists updated_at timestamp not null default now();

update source
set verification_status = case
        when verification_status is null or trim(verification_status) = '' then 'draft'
        when lower(verification_status) = 'unverified' then 'draft'
        when lower(verification_status) in ('verified', 'reviewed', 'approved') then 'official'
        else lower(verification_status)
    end,
    confidence_level = coalesce(nullif(trim(confidence_level), ''), 'unknown'),
    privacy_level = coalesce(nullif(trim(privacy_level), ''), 'clan_only'),
    sensitive_level = coalesce(nullif(trim(sensitive_level), ''), 'normal'),
    updated_at = coalesce(updated_at, created_at, now());

update source set source_type = 'oral_history' where source_type = 'oral_record';

alter table source
    alter column verification_status set default 'draft',
    alter column confidence_level set default 'unknown',
    alter column privacy_level set default 'clan_only',
    alter column sensitive_level set default 'normal',
    alter column updated_at set default now();

alter table source_binding
    add column if not exists confidence_level varchar(32) not null default 'unknown',
    add column if not exists binding_status varchar(32) not null default 'official',
    add column if not exists updated_at timestamp not null default now();

update source_binding
set confidence_level = coalesce(nullif(trim(confidence_level), ''), 'unknown'),
    binding_status = case
        when binding_status is null or trim(binding_status) = '' then 'official'
        when lower(binding_status) = 'unverified' then 'draft'
        when lower(binding_status) in ('verified', 'reviewed', 'approved') then 'official'
        else lower(binding_status)
    end,
    updated_at = coalesce(updated_at, created_at, now());

alter table source_binding
    alter column confidence_level set default 'unknown',
    alter column binding_status set default 'official',
    alter column updated_at set default now();

alter table source_attachment
    add column if not exists privacy_level varchar(32) not null default 'clan_only',
    add column if not exists sensitive_level varchar(32) not null default 'normal';

update source_attachment
set privacy_level = coalesce(nullif(privacy_level, ''), 'clan_only'),
    sensitive_level = coalesce(nullif(sensitive_level, ''), 'normal');

alter table source_attachment
    alter column privacy_level set default 'clan_only',
    alter column sensitive_level set default 'normal';

create table if not exists attachment (
    id bigserial primary key,
    clan_id bigint,
    source_id bigint,
    file_name varchar(255),
    file_type varchar(120),
    file_size bigint,
    storage_path varchar(1000),
    thumbnail_path varchar(1000),
    checksum varchar(128),
    uploaded_by bigint,
    uploaded_at timestamp,
    access_level varchar(32)
);

create table if not exists user_account (
    id bigserial primary key,
    username varchar(100),
    phone varchar(50),
    email varchar(100),
    display_name varchar(100),
    password_hash varchar(255),
    status varchar(32) default 'active',
    created_at timestamp default now(),
    last_login_at timestamp
);

create table if not exists role (
    id bigserial primary key,
    role_code varchar(64),
    role_name varchar(100),
    description varchar(255)
);

create table if not exists member_role (
    id bigserial primary key,
    member_id bigint,
    role_id bigint,
    scope_type varchar(32) default 'clan',
    scope_id bigint,
    created_at timestamp default now()
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'chk_source_verification_status') then
        alter table source add constraint chk_source_verification_status
            check (verification_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_confidence_level') then
        alter table source add constraint chk_source_confidence_level
            check (confidence_level in ('high', 'medium', 'low', 'unknown'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_privacy_level') then
        alter table source add constraint chk_source_privacy_level
            check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_sensitive_level') then
        alter table source add constraint chk_source_sensitive_level
            check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_binding_confidence_level') then
        alter table source_binding add constraint chk_source_binding_confidence_level
            check (confidence_level in ('high', 'medium', 'low', 'unknown'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_binding_status') then
        alter table source_binding add constraint chk_source_binding_status
            check (binding_status in ('draft', 'pending_review', 'official', 'rejected', 'archived'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_attachment_privacy_level') then
        alter table source_attachment add constraint chk_source_attachment_privacy_level
            check (privacy_level in ('public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'chk_source_attachment_sensitive_level') then
        alter table source_attachment add constraint chk_source_attachment_sensitive_level
            check (sensitive_level in ('normal', 'sensitive', 'highly_sensitive'));
    end if;
end $$;

create unique index if not exists uk_source_binding_target on source_binding(source_id, target_type, target_id);
create index if not exists idx_source_clan_status on source(clan_id, verification_status);
create index if not exists idx_source_clan_privacy on source(clan_id, privacy_level);
create index if not exists idx_source_attachment_source_created on source_attachment(source_id, created_at desc) where deleted_at is null;
create index if not exists idx_attachment_clan on attachment(clan_id);
create index if not exists idx_attachment_source on attachment(source_id);
create index if not exists idx_user_account_username on user_account(username);
create index if not exists idx_role_code on role(role_code);
create index if not exists idx_member_role_member on member_role(member_id);
create index if not exists idx_member_role_role on member_role(role_id);
create index if not exists idx_revision_source_binding_pending on revision(target_type, target_id, status) where target_type = 'source_binding';
create index if not exists idx_review_task_revision_status on review_task(revision_id, status);
create index if not exists idx_source_binding_active_target on source_binding(source_id, target_type, target_id, binding_status);
"""
)

Path("backend/genealogy-backend/src/test/java/com/genealogy/auth/application/AuthSecurityServiceTest.java").write_text(
    """package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import com.genealogy.auth.entity.AuthSecurityEventEntity;
import com.genealogy.auth.repository.AuthLoginAttemptRepository;
import com.genealogy.auth.repository.AuthSecurityEventRepository;
import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthSecurityServiceTest {

    @Test
    void blocksAccountDuringConfiguredCooldownAndPersistsAudit() {
        Fixture fixture = new Fixture();
        fixture.properties.setAccountMaxFailures(3);
        AuthLoginAttemptEntity latest = failure(LocalDateTime.now().minusMinutes(1));
        when(fixture.attempts.findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.of(latest));
        when(fixture.attempts.findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());
        when(fixture.attempts.countByAccountHashAndSuccessFalseAndCreatedAtAfter(anyString(), any())).thenReturn(3L);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> fixture.service.requireLoginAllowed("member", "10.0.0.1"));
        assertEquals("AUTH_LOGIN_THROTTLED", exception.getCode());
        verify(fixture.events).save(any(AuthSecurityEventEntity.class));
    }

    @Test
    void blocksIpDuringConfiguredCooldown() {
        Fixture fixture = new Fixture();
        fixture.properties.setIpMaxFailures(2);
        AuthLoginAttemptEntity latest = failure(LocalDateTime.now().minusMinutes(1));
        when(fixture.attempts.findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());
        when(fixture.attempts.findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.of(latest));
        when(fixture.attempts.countByIpHashAndSuccessFalseAndCreatedAtAfter(anyString(), any())).thenReturn(2L);
        assertThrows(BusinessException.class, () -> fixture.service.requireLoginAllowed("member", "10.0.0.1"));
    }

    @Test
    void cooldownAutomaticallyExpiresWithoutPermanentLock() {
        Fixture fixture = new Fixture();
        fixture.properties.setAccountMaxFailures(3);
        fixture.properties.setLoginCooldownMinutes(15);
        AuthLoginAttemptEntity latest = failure(LocalDateTime.now().minusMinutes(16));
        when(fixture.attempts.findTopByAccountHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.of(latest));
        when(fixture.attempts.findTopByIpHashAndSuccessFalseOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());
        when(fixture.attempts.countByAccountHashAndSuccessFalseAndCreatedAtAfter(anyString(), any())).thenReturn(3L);
        assertDoesNotThrow(() -> fixture.service.requireLoginAllowed("member", "10.0.0.1"));
    }

    @Test
    void failedAttemptStoresOnlyAccountAndIpHashes() {
        Fixture fixture = new Fixture();
        fixture.service.recordLoginAttempt("SensitiveUser", "192.168.10.20", null, false, "AUTH_LOGIN_FAILED", "agent");
        var captor = org.mockito.ArgumentCaptor.forClass(AuthLoginAttemptEntity.class);
        verify(fixture.attempts).save(captor.capture());
        assertEquals(fixture.service.accountHash("sensitiveuser"), captor.getValue().getAccountHash());
        assertEquals(fixture.service.ipHash("192.168.10.20"), captor.getValue().getIpHash());
    }

    @Test
    void successfulLoginClearsOnlyAccountFailureCounterRows() {
        Fixture fixture = new Fixture();
        fixture.service.recordLoginAttempt("member", "192.168.10.20", 7L, true, "SUCCESS", "agent");
        verify(fixture.attempts).deleteByAccountHashAndSuccessFalse(fixture.service.accountHash("member"));
        verify(fixture.attempts).save(any(AuthLoginAttemptEntity.class));
    }

    private static AuthLoginAttemptEntity failure(LocalDateTime createdAt) {
        AuthLoginAttemptEntity entity = new AuthLoginAttemptEntity();
        entity.setCreatedAt(createdAt);
        entity.setSuccess(false);
        return entity;
    }

    private static final class Fixture {
        final AuthLoginAttemptRepository attempts = mock(AuthLoginAttemptRepository.class);
        final AuthSecurityEventRepository events = mock(AuthSecurityEventRepository.class);
        final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        final AuthProperties properties = new AuthProperties();
        final AuthSecurityService service;

        Fixture() {
            when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
            service = new AuthSecurityService(attempts, events, properties, transactionManager);
        }
    }
}
"""
)

Path("backend/genealogy-backend/src/test/java/com/genealogy/auth/application/AuthSessionMaintenanceServiceTest.java").write_text(
    """package com.genealogy.auth.application;

import com.genealogy.auth.config.AuthProperties;
import com.genealogy.auth.repository.AuthSessionRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthSessionMaintenanceServiceTest {

    @Test
    void removesOnlySessionsOlderThanConfiguredRetention() {
        AuthSessionRepository repository = mock(AuthSessionRepository.class);
        AuthProperties properties = new AuthProperties();
        properties.setSessionRetentionDays(30);
        when(repository.deleteRetiredBefore(any(LocalDateTime.class))).thenReturn(4);
        AuthSessionMaintenanceService service = new AuthSessionMaintenanceService(repository, properties);
        assertEquals(4, service.cleanupRetiredSessions());
        verify(repository).deleteRetiredBefore(any(LocalDateTime.class));
    }
}
"""
)

test_path = Path("backend/genealogy-backend/src/test/java/com/genealogy/auth/application/AuthApplicationServiceCommercialTest.java")
test_text = test_path.read_text()
marker = "\n    private AppUserEntity activeUser(String username, String password) {"
addition = r'''
    @Test
    void disabledAccountRevokesExistingSessionOnNextRequest() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthSessionRepository sessionRepository = mock(AuthSessionRepository.class);
        AuthSecurityService securityService = mock(AuthSecurityService.class);
        AuthApplicationService service = new AuthApplicationService(
                userRepository, sessionRepository, securityService, new AuthProperties()
        );
        String rawToken = "disabled-session-token";
        AuthSessionEntity session = new AuthSessionEntity();
        session.setId(55L);
        session.setUserId(7L);
        session.setTokenHash(PasswordHashUtil.sha256(rawToken));
        session.setExpiresAt(LocalDateTime.now().plusHours(1));
        AppUserEntity user = activeUser("disabled", "Password@123");
        user.setStatus("disabled");
        when(sessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                org.mockito.ArgumentMatchers.eq(PasswordHashUtil.sha256(rawToken)), any(LocalDateTime.class)))
                .thenReturn(Optional.of(session));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.currentUserIdOrNull("Bearer " + rawToken));
        assertEquals("AUTH_UNAUTHORIZED", exception.getCode());
        assertNotNull(session.getRevokedAt());
        verify(sessionRepository).save(session);
        verify(securityService).recordEvent(
                org.mockito.ArgumentMatchers.eq(7L),
                org.mockito.ArgumentMatchers.eq("session_revoked_account_inactive"),
                org.mockito.ArgumentMatchers.eq("AUTH_UNAUTHORIZED"),
                org.mockito.ArgumentMatchers.eq("high"),
                any(), any(), any(), any()
        );
    }

    @Test
    void replayOfKnownRevokedSessionIsRejectedAndAudited() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthSessionRepository sessionRepository = mock(AuthSessionRepository.class);
        AuthSecurityService securityService = mock(AuthSecurityService.class);
        AuthApplicationService service = new AuthApplicationService(
                userRepository, sessionRepository, securityService, new AuthProperties()
        );
        String rawToken = "revoked-session-token";
        String tokenHash = PasswordHashUtil.sha256(rawToken);
        AuthSessionEntity revoked = new AuthSessionEntity();
        revoked.setId(56L);
        revoked.setUserId(7L);
        revoked.setTokenHash(tokenHash);
        revoked.setRevokedAt(LocalDateTime.now().minusMinutes(1));
        when(sessionRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                org.mockito.ArgumentMatchers.eq(tokenHash), any(LocalDateTime.class))).thenReturn(Optional.empty());
        when(sessionRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(revoked));

        assertThrows(BusinessException.class, () -> service.currentUserIdOrNull("Bearer " + rawToken));
        verify(securityService).recordEvent(
                org.mockito.ArgumentMatchers.eq(7L),
                org.mockito.ArgumentMatchers.eq("session_replay_rejected"),
                org.mockito.ArgumentMatchers.eq("AUTH_SESSION_REPLAYED"),
                org.mockito.ArgumentMatchers.eq("high"),
                any(), any(), any(), any()
        );
    }
'''
if marker not in test_text:
    raise SystemExit("commercial auth test marker missing")
test_path.write_text(test_text.replace(marker, "\n" + addition + marker, 1))
