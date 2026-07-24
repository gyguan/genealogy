package com.genealogy.quality.check;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class QualityRuleRegistry {

    public static final String PAYLOAD_INVALID = "PAYLOAD_INVALID";
    public static final String RELATIONSHIP_CONFLICT = "RELATIONSHIP_CONFLICT";
    public static final String GENERATION_MISMATCH = "GENERATION_MISMATCH";
    public static final String MISSING_SOURCE = "MISSING_SOURCE";

    private static final Set<String> GATE_RULES = Set.of(PAYLOAD_INVALID, RELATIONSHIP_CONFLICT);
    private final Map<String, RuleDefinition> definitions = new LinkedHashMap<>();

    public QualityRuleRegistry() {
        register(new RuleDefinition(PAYLOAD_INVALID, "审核快照完整性", "BLOCKING", "审核快照缺失或无法解析"));
        register(new RuleDefinition(RELATIONSHIP_CONFLICT, "人物关系冲突", "BLOCKING", "关系起点和终点不能是同一人物"));
        register(new RuleDefinition(GENERATION_MISMATCH, "字辈与世次一致性", "WARNING", "人物字辈或世次信息不完整"));
        register(new RuleDefinition(MISSING_SOURCE, "来源证据覆盖", "WARNING", "变更对象缺少可识别的来源证据"));
    }

    public void register(RuleDefinition definition) {
        definitions.put(definition.code(), definition);
    }

    public RuleDefinition get(String code) {
        return definitions.getOrDefault(code, new RuleDefinition(code, code, "WARNING", "发现数据质量问题"));
    }

    public List<String> defaultRules(String mode) {
        return "REVIEW_GATE".equals(mode) ? List.copyOf(GATE_RULES) : List.copyOf(definitions.keySet());
    }

    public Set<String> gateRules() {
        return GATE_RULES;
    }

    public record RuleDefinition(String code, String name, String blockLevel, String message) {
    }
}
