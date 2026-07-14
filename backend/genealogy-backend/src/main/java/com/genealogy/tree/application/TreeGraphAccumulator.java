package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeGraphWarning;
import com.genealogy.tree.dto.TreeNodeResponse;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class TreeGraphAccumulator {

    enum EdgeAddResult {
        ADDED,
        ALREADY_PRESENT,
        LIMIT_REACHED
    }

    private static final Map<String, String> WARNING_MESSAGES = Map.ofEntries(
            Map.entry("cycle_detected", "检测到异常环或回边，已停止沿该路径继续遍历"),
            Map.entry("duplicate_edge", "检测到重复关系边，响应中仅保留一条"),
            Map.entry("depth_limit_reached", "已达到查询深度边界，结果已安全截断"),
            Map.entry("node_limit_reached", "已达到节点容量边界，结果已安全截断"),
            Map.entry("edge_limit_reached", "已达到关系边容量边界，结果已安全截断"),
            Map.entry("root_filtered", "根人物不可见或已被安全过滤"),
            Map.entry("partial_visibility", "部分人物或关系因权限、隐私或状态规则未返回"),
            Map.entry("isolated_nodes", "图中存在无可见关系边的孤立节点")
    );

    private final int requestedDepth;
    private final int appliedDepth;
    private final int maxNodes;
    private final int maxEdges;
    private final Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
    private final Map<String, TreeEdgeResponse> edges = new LinkedHashMap<>();
    private final Map<String, Integer> warningCounts = new LinkedHashMap<>();
    private final Set<String> truncationReasons = new LinkedHashSet<>();

    private boolean cycleDetected;
    private boolean capacityReached;
    private int duplicateEdgeCount;

    TreeGraphAccumulator(int requestedDepth, int appliedDepth, int maxNodes, int maxEdges) {
        this.requestedDepth = requestedDepth;
        this.appliedDepth = appliedDepth;
        this.maxNodes = maxNodes;
        this.maxEdges = maxEdges;
    }

    boolean addNode(Long personId, TreeNodeResponse node) {
        if (personId == null || node == null) {
            return false;
        }
        if (nodes.containsKey(personId)) {
            return true;
        }
        if (nodes.size() >= maxNodes) {
            recordTruncation("max_nodes", "node_limit_reached");
            capacityReached = true;
            return false;
        }
        nodes.put(personId, node);
        return true;
    }

    EdgeAddResult addEdge(String edgeKey, TreeEdgeResponse edge) {
        if (edgeKey == null || edge == null) {
            return EdgeAddResult.ALREADY_PRESENT;
        }
        if (edges.containsKey(edgeKey)) {
            return EdgeAddResult.ALREADY_PRESENT;
        }
        if (edges.size() >= maxEdges) {
            recordTruncation("max_edges", "edge_limit_reached");
            capacityReached = true;
            return EdgeAddResult.LIMIT_REACHED;
        }
        edges.put(edgeKey, edge);
        return EdgeAddResult.ADDED;
    }

    boolean containsNode(Long personId) {
        return nodes.containsKey(personId);
    }

    boolean containsEdge(String edgeKey) {
        return edges.containsKey(edgeKey);
    }

    boolean capacityReached() {
        return capacityReached;
    }

    Set<Long> nodeIds() {
        return Set.copyOf(nodes.keySet());
    }

    List<TreeEdgeResponse> edgeValues() {
        return List.copyOf(edges.values());
    }

    void recordDuplicateEdge() {
        duplicateEdgeCount++;
        incrementWarning("duplicate_edge", 1);
    }

    void recordCycle() {
        cycleDetected = true;
        incrementWarning("cycle_detected", 1);
    }

    void recordDepthLimit() {
        recordTruncation("max_depth", "depth_limit_reached");
    }

    void recordRootFiltered() {
        incrementWarning("root_filtered", 1);
    }

    void recordPartialVisibility(int count) {
        incrementWarning("partial_visibility", count);
    }

    void recordIsolatedNodes(int count) {
        incrementWarning("isolated_nodes", count);
    }

    TreeGraphResponse build(Long rootPersonId, String direction, String dataView) {
        String rootNodeId = rootPersonId != null && nodes.containsKey(rootPersonId)
                ? "person-" + rootPersonId
                : null;
        TreeGraphMeta meta = new TreeGraphMeta(
                requestedDepth,
                appliedDepth,
                nodes.size(),
                edges.size(),
                !truncationReasons.isEmpty(),
                new ArrayList<>(truncationReasons),
                cycleDetected,
                duplicateEdgeCount,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        List<TreeGraphWarning> warnings = warningCounts.entrySet().stream()
                .map(entry -> new TreeGraphWarning(
                        entry.getKey(),
                        WARNING_MESSAGES.getOrDefault(entry.getKey(), entry.getKey()),
                        entry.getValue()
                ))
                .toList();
        return new TreeGraphResponse(
                rootNodeId,
                rootNodeId == null ? null : rootPersonId,
                direction,
                dataView,
                new ArrayList<>(nodes.values()),
                new ArrayList<>(edges.values()),
                meta,
                warnings
        );
    }

    private void recordTruncation(String reason, String warningCode) {
        truncationReasons.add(reason);
        incrementWarning(warningCode, 1);
    }

    private void incrementWarning(String code, int count) {
        if (count <= 0) {
            return;
        }
        warningCounts.merge(code, count, Integer::sum);
    }
}
