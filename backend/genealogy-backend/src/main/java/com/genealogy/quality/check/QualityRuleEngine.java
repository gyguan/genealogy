package com.genealogy.quality.check;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.quality.domain.GenealogyQualityRuleService;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public class QualityRuleEngine {

    private final ObjectMapper objectMapper;
    private final GenealogyQualityRuleService genealogyQualityRuleService;
    private final QualityRuleRegistry registry;

    public QualityRuleEngine(ObjectMapper objectMapper, GenealogyQualityRuleService genealogyQualityRuleService, QualityRuleRegistry registry) {
        this.objectMapper = objectMapper;
        this.genealogyQualityRuleService = genealogyQualityRuleService;
        this.registry = registry;
    }

    public QualityCheckEvaluation evaluate(List<QualityCheckSubject> subjects, List<String> requestedRules, String mode) {
        List<String> enabledRules = requestedRules == null || requestedRules.isEmpty()
                ? registry.defaultRules(mode)
                : requestedRules;
        Map<String, LinkedHashSet<String>> affected = new LinkedHashMap<>();
        for (QualityCheckSubject subject : subjects) {
            for (String code : evaluateSubject(subject)) {
                if (enabledRules.contains(code)) {
                    affected.computeIfAbsent(code, ignored -> new LinkedHashSet<>()).add(subject.subjectId());
                }
            }
        }

        List<QualityCheckEvaluation.QualityCheckRuleResult> results = new ArrayList<>();
        for (String code : enabledRules) {
            QualityRuleRegistry.RuleDefinition definition = registry.get(code);
            List<String> ids = List.copyOf(affected.getOrDefault(code, new LinkedHashSet<>()));
            results.add(new QualityCheckEvaluation.QualityCheckRuleResult(
                    code,
                    definition.name(),
                    ids.isEmpty() ? "PASSED" : "ISSUE",
                    definition.blockLevel(),
                    ids.size(),
                    ids.isEmpty() ? null : definition.message(),
                    ids
            ));
        }

        int issueCount = results.stream().mapToInt(QualityCheckEvaluation.QualityCheckRuleResult::affectedSubjectCount).sum();
        int blocking = results.stream().filter(item -> "BLOCKING".equals(item.blockLevel())).mapToInt(QualityCheckEvaluation.QualityCheckRuleResult::affectedSubjectCount).sum();
        int warnings = results.stream().filter(item -> "WARNING".equals(item.blockLevel())).mapToInt(QualityCheckEvaluation.QualityCheckRuleResult::affectedSubjectCount).sum();
        int passed = (int) results.stream().filter(item -> "PASSED".equals(item.outcome())).count();
        QualityCheckEvaluation.QualityCheckSummary summary = new QualityCheckEvaluation.QualityCheckSummary(
                subjects.size(), results.size(), passed, issueCount, blocking, warnings, blocking > 0
        );
        return new QualityCheckEvaluation(summary, List.copyOf(results));
    }

    private Set<String> evaluateSubject(QualityCheckSubject subject) {
        Set<String> codes = new LinkedHashSet<>();
        if (subject.payload() == null || subject.payload().isBlank()) {
            codes.add(QualityRuleRegistry.PAYLOAD_INVALID);
            return codes;
        }
        final JsonNode node;
        try {
            node = objectMapper.readTree(subject.payload());
        } catch (JsonProcessingException ex) {
            codes.add(QualityRuleRegistry.PAYLOAD_INVALID);
            return codes;
        }
        String targetType = lower(subject.targetType());
        if ("relationship".equals(targetType)) {
            Long from = longValue(node, "fromPersonId", "from_person_id");
            Long to = longValue(node, "toPersonId", "to_person_id");
            if (from != null && Objects.equals(from, to)) codes.add(QualityRuleRegistry.RELATIONSHIP_CONFLICT);
        }
        if ("person".equals(targetType)) {
            JsonNode generationNo = first(node, "generationNo", "generation_no");
            JsonNode generationWord = first(node, "generationWord", "generation_word");
            if (generationNo == null || generationNo.isNull() || generationWord == null || generationWord.asText("").isBlank()) {
                codes.add(QualityRuleRegistry.GENERATION_MISMATCH);
            }
        }
        if (("person".equals(targetType) || "relationship".equals(targetType)) && !hasEvidence(node)) {
            codes.add(QualityRuleRegistry.MISSING_SOURCE);
        }
        genealogyQualityRuleService.highestRisk(codes.stream().map(value -> value.toLowerCase(Locale.ROOT)).toList());
        return codes;
    }

    private boolean hasEvidence(JsonNode node) {
        for (String key : List.of("sourceId", "source_id", "sourceBindings", "source_bindings", "evidence", "attachments")) {
            JsonNode value = node.get(key);
            if (value != null && !value.isNull() && (!(value.isArray() || value.isObject()) || value.size() > 0)) return true;
        }
        return false;
    }

    private JsonNode first(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value != null) return value;
        }
        return null;
    }

    private Long longValue(JsonNode node, String... names) {
        JsonNode value = first(node, names);
        return value != null && value.canConvertToLong() ? value.longValue() : null;
    }

    private String lower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
