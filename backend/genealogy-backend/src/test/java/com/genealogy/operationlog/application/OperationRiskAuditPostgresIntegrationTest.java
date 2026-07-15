package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_INTEGRATION_TESTS", matches = "true")
class OperationRiskAuditPostgresIntegrationTest {

    @Autowired private ClanRepository clanRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private PersonRepository personRepository;
    @Autowired private OperationLogRepository operationLogRepository;
    @Autowired private OperationRiskAuditApplicationService operationRiskAuditApplicationService;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void appliesRiskSchemaAndExecutesBranchScopedRiskQuery() {
        assertColumn("risk_level", "character varying", "YES");
        assertColumn("risk_event_type", "character varying", "YES");
        assertColumn("disposition_status", "character varying", "YES");
        assertColumn("branch_id", "bigint", "YES");

        Set<String> indexes = Set.copyOf(jdbcTemplate.queryForList(
                "select indexname from pg_indexes where schemaname = current_schema() "
                        + "and tablename = 'operation_log'",
                String.class
        ));
        assertThat(indexes).contains(
                "idx_operation_log__risk_recent",
                "idx_operation_log__risk_level_recent",
                "idx_operation_log__risk_type_recent",
                "idx_operation_log__risk_branch_recent"
        );

        ClanEntity clan = new ClanEntity();
        clan.setClanCode("risk-it-" + System.nanoTime());
        clan.setClanName("风险审计集成测试宗族");
        clan.setSurname("张");
        clan.setStatus("active");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clan = clanRepository.saveAndFlush(clan);

        BranchEntity branch = new BranchEntity();
        branch.setClanId(clan.getId());
        branch.setBranchName("测试支派");
        branch.setStatus("active");
        branch.setCreatedAt(LocalDateTime.now());
        branch.setUpdatedAt(LocalDateTime.now());
        branch = branchRepository.saveAndFlush(branch);

        PersonEntity person = new PersonEntity();
        person.setClanId(clan.getId());
        person.setBranchId(branch.getId());
        person.setName("风险审计测试人物");
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("official");
        person.setCreatedAt(LocalDateTime.now());
        person.setUpdatedAt(LocalDateTime.now());
        person = personRepository.saveAndFlush(person);

        OperationLogEntity visibleRisk = riskLog(clan.getId(), "person_delete", "person", person.getId());
        operationLogRepository.saveAndFlush(visibleRisk);

        OperationLogEntity clanWideRisk = riskLog(clan.getId(), "operation_log_export", "operation_log", null);
        operationLogRepository.saveAndFlush(clanWideRisk);

        PageResponse<RiskAuditEventResponse> page = operationRiskAuditApplicationService.search(
                clan.getId(),
                null,
                null,
                null,
                branch.getId(),
                null,
                null,
                null,
                1,
                20,
                false,
                PermissionDataScope.branches(Set.of(branch.getId()))
        );

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.records()).extracting(RiskAuditEventResponse::id)
                .containsExactly(visibleRisk.getId());
    }

    private OperationLogEntity riskLog(Long clanId, String actionType, String targetType, Long targetId) {
        OperationLogEntity log = new OperationLogEntity();
        log.setClanId(clanId);
        log.setActorId(9001L);
        log.setActionType(actionType);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setRiskLevel("high");
        log.setRiskEventType("formal_data_change");
        log.setDispositionStatus("resolved");
        log.setSummary("集成测试风险事件");
        log.setCreatedAt(LocalDateTime.now());
        return log;
    }

    private void assertColumn(String columnName, String dataType, String nullable) {
        var row = jdbcTemplate.queryForMap(
                "select data_type, is_nullable from information_schema.columns "
                        + "where table_schema = current_schema() and table_name = 'operation_log' and column_name = ?",
                columnName
        );
        assertThat(row.get("data_type")).isEqualTo(dataType);
        assertThat(row.get("is_nullable")).isEqualTo(nullable);
    }
}
