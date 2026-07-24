package com.genealogy.quality.check;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class QualityRuleEngineTest {

    @Test
    void evaluatesSubjectsWithoutReviewDomainTypes() {
        GenealogyQualityRuleService riskService = mock(GenealogyQualityRuleService.class);
        when(riskService.highestRisk(anyList())).thenReturn("high");
        QualityRuleEngine engine = new QualityRuleEngine(new ObjectMapper(), riskService, new QualityRuleRegistry());

        QualityCheckEvaluation result = engine.evaluate(List.of(
                new QualityCheckSubject("draft-1", "relationship", "{\"fromPersonId\":9,\"toPersonId\":9}"),
                new QualityCheckSubject("draft-2", "person", "{\"generationNo\":3,\"generationWord\":\"承\",\"sourceId\":7}")
        ), List.of(), "FULL");

        assertTrue(result.summary().blocked());
        assertEquals(1, result.summary().blockingIssueCount());
        assertEquals(List.of("draft-1"), result.rules().stream()
                .filter(item -> QualityRuleRegistry.RELATIONSHIP_CONFLICT.equals(item.code()))
                .findFirst().orElseThrow().affectedSubjectIds());
    }

    @Test
    void exposesAllUnifiedScopeTypesAndLegacyAlias() {
        assertEquals(QualityCheckScopeType.REVIEW_TASK, QualityCheckScopeType.parse("TASK_IDS"));
        assertEquals(QualityCheckScopeType.REVIEW_TASK, QualityCheckScopeType.parse("REVIEW_TASK"));
        assertEquals(QualityCheckScopeType.WORKBENCH_SESSION, QualityCheckScopeType.parse("WORKBENCH_SESSION"));
        assertEquals(QualityCheckScopeType.DRAFT_IDS, QualityCheckScopeType.parse("DRAFT_IDS"));
        assertEquals(QualityCheckScopeType.QUERY, QualityCheckScopeType.parse("QUERY"));
    }
}
