package com.genealogy.integration;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.dto.SourceSearchCriteria;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class MemberReviewSourceMybatisPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_member_review_source_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.task.scheduling.enabled", () -> false);
    }

    @Autowired ClanRepository clanRepository;
    @Autowired ClanMembershipRepository membershipRepository;
    @Autowired MemberRoleRepository memberRoleRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired RevisionRepository revisionRepository;
    @Autowired CheckTaskRepository checkTaskRepository;
    @Autowired SourceRepository sourceRepository;
    @Autowired SourceBindingRepository sourceBindingRepository;
    @Autowired SourceAttachmentRepository sourceAttachmentRepository;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void memberSearchAppliesVisibilityBeforeCountAndClanLockIsDeterministic() {
        ClanEntity clan = clan();
        RoleEntity role = new RoleEntity();
        role.setRoleCode("viewer-" + token());
        role.setRoleName("Viewer");
        role.setSystemRole(false);
        role.setCreatedAt(LocalDateTime.now());
        role.setUpdatedAt(LocalDateTime.now());
        roleRepository.save(role);

        ClanMembershipEntity visible = membership(clan.getId(), appUser("visible"));
        ClanMembershipEntity hidden = membership(clan.getId(), appUser("hidden"));
        grant(visible.getId(), role.getId(), 11L);
        grant(hidden.getId(), role.getId(), 20L);

        Page<ClanMembershipEntity> page = membershipRepository.searchMembers(
                clan.getId(), null, false, List.of(), false, List.of(), false, List.of(), false,
                MemberRoleScopeType.branch, MemberRoleScopeType.branch_subtree,
                List.of(11L), List.of(11L, 12L), PageRequest.of(0, 10)
        );
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).extracting(ClanMembershipEntity::getId).containsExactly(visible.getId());

        Long personId = jdbcTemplate.queryForObject(
                "insert into person(clan_id,name,gender,lineage_status,privacy_level,data_status,created_at,updated_at) "
                        + "values (?,?,'unknown','normal','clan_only','draft',now(),now()) returning id",
                Long.class, clan.getId(), "成员关联人物-" + token());
        visible.setPersonId(personId);
        membershipRepository.save(visible);
        visible.setPersonId(null);
        membershipRepository.save(visible);
        assertThat(membershipRepository.findById(visible.getId()).orElseThrow().getPersonId()).isNull();

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> assertThat(membershipRepository.lockByClanId(clan.getId()))
                .extracting(ClanMembershipEntity::getId).isSorted());
    }

    @Test
    void reviewDecisionLockSerializesCompetingDecisionsAndJsonPayloadRollsBack() throws Exception {
        ClanEntity clan = clan();
        RevisionEntity revision = revision(clan.getId());
        revisionRepository.save(revision);
        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clan.getId()); task.setRevisionId(revision.getId()); task.setTraceId(revision.getTraceId());
        task.setReviewLevel(1); task.setStatus("pending"); task.setCreatedAt(LocalDateTime.now());
        checkTaskRepository.save(task);

        AtomicInteger success = new AtomicInteger();
        CountDownLatch start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first = pool.submit(() -> decide(task.getId(), "approved", start, success));
            var second = pool.submit(() -> decide(task.getId(), "rejected", start, success));
            start.countDown();
            first.get(20, TimeUnit.SECONDS); second.get(20, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
        assertThat(success.get()).isEqualTo(1);
        assertThat(checkTaskRepository.findById(task.getId()).orElseThrow().getStatus()).isIn("approved", "rejected");

        String before = revisionRepository.findById(revision.getId()).orElseThrow().getAfterData();
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            RevisionEntity current = revisionRepository.findById(revision.getId()).orElseThrow();
            current.setAfterData("{\"name\":\"rolled-back\"}");
            revisionRepository.save(current);
            throw new IllegalStateException("rollback");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(revisionRepository.findById(revision.getId()).orElseThrow().getAfterData()).isEqualTo(before);
    }

    @Test
    void sourceSearchBindingEvidenceAndExplicitNullRemainCompatible() {
        ClanEntity clan = clan();
        SourceEntity source = source(clan.getId(), "族谱卷一");
        source.setDescription("clear-me");
        sourceRepository.save(source);
        source.setDescription(null);
        sourceRepository.save(source);
        assertThat(sourceRepository.findById(source.getId()).orElseThrow().getDescription()).isNull();

        SourceBindingEntity binding = new SourceBindingEntity();
        binding.setClanId(clan.getId()); binding.setSourceId(source.getId()); binding.setTargetType("person"); binding.setTargetId(101L);
        binding.setConfidenceLevel("high"); binding.setBindingStatus("official"); binding.setCreatedAt(LocalDateTime.now()); binding.setUpdatedAt(LocalDateTime.now());
        sourceBindingRepository.save(binding);
        SourceAttachmentEntity attachment = new SourceAttachmentEntity();
        attachment.setClanId(clan.getId()); attachment.setSourceId(source.getId()); attachment.setOriginalFilename("evidence.pdf");
        attachment.setStoredFilename("evidence-" + token() + ".pdf"); attachment.setFileSize(10L); attachment.setStoragePath("/tmp/evidence");
        attachment.setUploadStatus("uploaded"); attachment.setPrivacyLevel("clan_only"); attachment.setSensitiveLevel("normal"); attachment.setCreatedAt(LocalDateTime.now());
        sourceAttachmentRepository.save(attachment);

        SourceSearchCriteria criteria = new SourceSearchCriteria("族谱", null, null, null, "person", true, true, "updatedAt,desc");
        Page<SourceEntity> page = sourceRepository.search(clan.getId(), criteria, 1, 10);
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).extracting(SourceEntity::getId).containsExactly(source.getId());
        assertThat(sourceBindingRepository.countActiveByTargets(clan.getId(), "person", List.of(101L), "revoked"))
                .singleElement().satisfies(row -> assertThat(row.getCount()).isEqualTo(1));
        assertThat(sourceAttachmentRepository.countActiveByTargets(clan.getId(), "person", List.of(101L), "revoked"))
                .singleElement().satisfies(row -> assertThat(row.getCount()).isEqualTo(1));
    }

    private void decide(Long taskId, String target, CountDownLatch start, AtomicInteger success) {
        try { start.await(5, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            CheckTaskEntity locked = checkTaskRepository.findByIdForDecision(taskId).orElseThrow();
            if (!"pending".equals(locked.getStatus())) return;
            locked.setStatus(target); locked.setReviewedAt(LocalDateTime.now()); checkTaskRepository.save(locked); success.incrementAndGet();
        });
    }

    private ClanEntity clan() {
        ClanEntity clan = new ClanEntity(); String t = token(); clan.setClanCode("MRS-" + t); clan.setClanName("迁移宗族-" + t);
        clan.setSurname("黄"); clan.setStatus("official"); clan.setCreatedAt(LocalDateTime.now()); clan.setUpdatedAt(LocalDateTime.now());
        return clanRepository.save(clan);
    }
    private Long appUser(String prefix) {
        String t = token();
        return jdbcTemplate.queryForObject("insert into app_user(username,password_hash,display_name,status,created_at,updated_at) values (?,?,?,?,now(),now()) returning id", Long.class, prefix + "-" + t, "test", prefix, "active");
    }
    private ClanMembershipEntity membership(Long clanId, Long userId) { ClanMembershipEntity e=new ClanMembershipEntity();e.setClanId(clanId);e.setUserId(userId);e.setJoinStatus("joined");e.setMemberStatus(MemberStatus.active);e.setJoinedAt(LocalDateTime.now());e.setCreatedAt(LocalDateTime.now());e.setUpdatedAt(LocalDateTime.now());return membershipRepository.save(e); }
    private void grant(Long membershipId,Long roleId,Long scopeId){MemberRoleEntity e=new MemberRoleEntity();e.setMembershipId(membershipId);e.setRoleId(roleId);e.setScopeType(MemberRoleScopeType.branch_subtree);e.setScopeId(scopeId);e.setStatus("active");e.setGrantedAt(LocalDateTime.now());e.setCreatedAt(LocalDateTime.now());e.setUpdatedAt(LocalDateTime.now());memberRoleRepository.save(e);}
    private RevisionEntity revision(Long clanId){RevisionEntity e=new RevisionEntity();e.setClanId(clanId);e.setTraceId(UUID.randomUUID());e.setTargetType("person");e.setTargetId(1L);e.setChangeType("replace");e.setBeforeData("{\"name\":\"old\"}");e.setAfterData("{\"name\":\"new\"}");e.setSubmitTime(LocalDateTime.now());e.setStatus("pending");return e;}
    private SourceEntity source(Long clanId,String name){SourceEntity e=new SourceEntity();e.setClanId(clanId);e.setSourceName(name);e.setSourceType("genealogy_book");e.setVerificationStatus("official");e.setConfidenceLevel("high");e.setPrivacyLevel("clan_only");e.setSensitiveLevel("normal");e.setCreatedAt(LocalDateTime.now());e.setUpdatedAt(LocalDateTime.now());return e;}
    private String token(){return UUID.randomUUID().toString().replace("-","").substring(0,10);}
}
