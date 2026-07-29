package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.quality.check.QualityCheckEvaluation;
import com.genealogy.quality.check.QualityCheckScopeAdapter;
import com.genealogy.quality.check.QualityRuleEngine;
import com.genealogy.quality.check.QualityRuleRegistry;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import com.genealogy.review.dto.ReviewQualityCheckSummary;
import com.genealogy.review.dto.ReviewQualityRuleResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class ReviewQualityCheckExecutor {

    private final QualityRuleRegistry ruleRegistry;
    private final QualityRuleEngine ruleEngine;

    public ReviewQualityCheckExecutor(
            ObjectMapper objectMapper,
            GenealogyQualityRuleService genealogyQualityRuleService
    ) {
        this.ruleRegistry = new QualityRuleRegistry();
        this.ruleEngine = new QualityRuleEngine(objectMapper, genealogyQualityRuleService, ruleRegistry);
    }

    public ExecutionResult execute(
            QualityCheckScopeAdapter.ResolvedQualityScope scope,
            List<String> requestedRules,
            String mode
    ) {
        QualityCheckEvaluation evaluation = ruleEngine.evaluate(scope.subjects(), requestedRules, mode);
        ReviewQualityCheckSummary summary = new ReviewQualityCheckSummary(
                evaluation.summary().subjectCount(),
                evaluation.summary().ruleCount(),
                evaluation.summary().passedRuleCount(),
                evaluation.summary().issueCount(),
                evaluation.summary().blockingIssueCount(),
                evaluation.summary().warningIssueCount(),
                evaluation.summary().blocked()
        );
        List<ReviewQualityRuleResult> rules = evaluation.rules().stream()
                .map(item -> new ReviewQualityRuleResult(
                        item.code(),
                        item.name(),
                        item.outcome(),
                        item.blockLevel(),
                        item.affectedSubjectCount(),
                        item.message(),
                        item.affectedSubjectIds().stream().map(Long::valueOf).toList()
                ))
                .toList();
        return new ExecutionResult(summary, rules);
    }

    public Set<String> gateRules() {
        return Set.copyOf(ruleRegistry.gateRules());
    }

    public record ExecutionResult(
            ReviewQualityCheckSummary summary,
            List<ReviewQualityRuleResult> rules
    ) {
        public ExecutionResult {
            rules = List.copyOf(rules);
        }
    }
}
