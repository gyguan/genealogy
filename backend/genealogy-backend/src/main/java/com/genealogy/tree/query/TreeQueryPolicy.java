package com.genealogy.tree.query;

import com.genealogy.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class TreeQueryPolicy {
    private static final Set<RelationCategory> DEFAULT_CATEGORIES = Set.of(
            RelationCategory.BLOOD, RelationCategory.RITUAL, RelationCategory.MARRIAGE
    );

    private final TreeQueryProperties properties;

    public TreeQueryPolicy(TreeQueryProperties properties) {
        this.properties = properties;
        validateConfiguration();
    }

    public PersonLineageQuery person(
            Long personId, String direction, List<String> relationScopes, String dataView,
            Integer maxDepth, Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        requirePositive(personId, "TREE_PERSON_ID_INVALID", "人员 ID 必须为正数");
        requirePositive(actorId, "AUTH_REQUIRED", "登录用户无效");
        TreeDirection parsedDirection = TreeDirection.fromApiValue(direction);
        int requestedDepth = parsedDirection == TreeDirection.FAMILY ? 1 : defaulted(maxDepth, properties.getDefaultDepth());
        return new PersonLineageQuery(
                personId, parsedDirection, categories(relationScopes), normalizeDataView(dataView),
                requestedDepth, bounded(requestedDepth, properties.getMaxDepth(), "TREE_MAX_DEPTH_INVALID"),
                bounded(defaulted(maxNodes, properties.getDefaultNodes()), properties.getMaxNodes(), "TREE_MAX_NODES_INVALID"),
                bounded(defaulted(maxEdges, properties.getDefaultEdges()), properties.getMaxEdges(), "TREE_MAX_EDGES_INVALID"),
                actorId
        );
    }

    public BranchLineageQuery branch(
            Long clanId, Long branchId, boolean includeSubBranches, List<String> relationScopes,
            String dataView, Integer maxDepth, Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        requirePositive(clanId, "TREE_CLAN_ID_INVALID", "宗族 ID 必须为正数");
        requirePositive(branchId, "TREE_BRANCH_ID_INVALID", "分支 ID 必须为正数");
        requirePositive(actorId, "AUTH_REQUIRED", "登录用户无效");
        int requestedDepth = defaulted(maxDepth, properties.getDefaultDepth());
        return new BranchLineageQuery(
                clanId, branchId, includeSubBranches, categories(relationScopes), normalizeDataView(dataView),
                requestedDepth, bounded(requestedDepth, properties.getMaxDepth(), "TREE_MAX_DEPTH_INVALID"),
                bounded(defaulted(maxNodes, properties.getDefaultNodes()), properties.getMaxNodes(), "TREE_MAX_NODES_INVALID"),
                bounded(defaulted(maxEdges, properties.getDefaultEdges()), properties.getMaxEdges(), "TREE_MAX_EDGES_INVALID"),
                actorId
        );
    }

    private Set<RelationCategory> categories(List<String> values) {
        if (values == null || values.isEmpty()) return DEFAULT_CATEGORIES;
        LinkedHashSet<RelationCategory> result = new LinkedHashSet<>();
        values.forEach(value -> result.add(RelationCategory.fromApiValue(value)));
        return Set.copyOf(result);
    }

    private String normalizeDataView(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase();
    }

    private int defaulted(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private int bounded(int value, int maximum, String code) {
        if (value <= 0 || value > maximum) {
            throw new BusinessException(code, "图谱查询参数必须在 1 到 " + maximum + " 之间");
        }
        return value;
    }

    private void requirePositive(Long value, String code, String message) {
        if (value == null || value <= 0) throw new BusinessException(code, message);
    }

    private void validateConfiguration() {
        if (properties.getMaxDepth() > TreeQueryProperties.HARD_MAX_DEPTH
                || properties.getMaxNodes() > TreeQueryProperties.HARD_MAX_NODES
                || properties.getMaxEdges() > TreeQueryProperties.HARD_MAX_EDGES) {
            throw new IllegalStateException("Tree query limits exceed the system hard limits");
        }
        bounded(properties.getDefaultDepth(), properties.getMaxDepth(), "TREE_QUERY_CONFIG_INVALID");
        bounded(properties.getDefaultNodes(), properties.getMaxNodes(), "TREE_QUERY_CONFIG_INVALID");
        bounded(properties.getDefaultEdges(), properties.getMaxEdges(), "TREE_QUERY_CONFIG_INVALID");
    }
}
