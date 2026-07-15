package com.genealogy.tree.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import com.genealogy.tree.dto.TreeAnomalySummary;
import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeEvidenceSummary;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeNodeResponse;
import com.genealogy.tree.dto.TreeReviewSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TreeSummaryApplicationService {

    private static final String TARGET_PERSON = "person";
    private static final String TARGET_RELATIONSHIP = "relationship";
    private static final Set<String> TARGET_TYPES = Set.of(TARGET_PERSON, TARGET_RELATIONSHIP);
    private static final Set<String> OFFICIAL_SOURCE_STATUSES = Set.of("official", "verified", "approved");

    private final AuthorizationApplicationService authorizationApplicationService;
    private final SourceBindingRepository sourceBindingRepository;
    private final SourceRepository sourceRepository;
    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final GenealogyQualityRuleService qualityRuleService;

    public TreeSummaryApplicationService(
            AuthorizationApplicationService authorizationApplicationService,
            SourceBindingRepository sourceBindingRepository,
            SourceRepository sourceRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            GenealogyQualityRuleService qualityRuleService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.sourceBindingRepository = sourceBindingRepository;
        this.sourceRepository = sourceRepository;
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.qualityRuleService = qualityRuleService;
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse enrich(Long clanId, Long actorId, TreeGraphResponse graph) {
        if (graph == null || graph.nodes().isEmpty()) {
            return graph;
        }

        Set<Long> personIds = graph.nodes().stream()
                .filter(node -> "visible".equals(node.visibility()))
                .map(TreeNodeResponse::personId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> relationshipIds = graph.edges().stream()
                .filter(edge -> "visible".equals(edge.visibility()))
                .map(TreeEdgeResponse::relationshipId)
                .filter(id -> id != null)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> allTargetIds = new LinkedHashSet<>(personIds);
        allTargetIds.addAll(relationshipIds);

        boolean canViewEvidence = hasPermission(clanId, actorId, "source:view");
        boolean canViewReview = hasPermission(clanId, actorId, "review_task:view");
        boolean canViewAnomalies = hasPermission(clanId, actorId, "workbench:view");

        Map<TargetKey, TreeEvidenceSummary> evidence = canViewEvidence
                ? loadEvidence(clanId, allTargetIds)
                : Map.of();
        Map<TargetKey, TreeReviewSummary> reviews = canViewReview
                ? loadReviews(clanId, allTargetIds)
                : Map.of();

        List<TreeEdgeResponse> normalizedEdges = graph.edges().stream()
                .map(this::normalizeSemantics)
                .toList();
        Map<String, Integer> incidentCounts = new HashMap<>();
        Map<String, Integer> duplicateCounts = new HashMap<>();
        for (TreeEdgeResponse edge : normalizedEdges) {
            incidentCounts.merge(edge.fromNodeId(), 1, Integer::sum);
            incidentCounts.merge(edge.toNodeId(), 1, Integer::sum);
            duplicateCounts.merge(semanticEdgeKey(edge), 1, Integer::sum);
        }

        List<TreeNodeResponse> enrichedNodes = graph.nodes().stream()
                .map(node -> enrichNode(
                        node,
                        evidence,
                        reviews,
                        canViewEvidence,
                        canViewReview,
                        canViewAnomalies,
                        incidentCounts.getOrDefault(node.nodeId(), 0) == 0
                ))
                .toList();
        Map<String, TreeNodeResponse> enrichedNodeMap = enrichedNodes.stream()
                .collect(Collectors.toMap(
                        TreeNodeResponse::nodeId,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        List<TreeEdgeResponse> enrichedEdges = normalizedEdges.stream()
                .map(edge -> enrichEdge(
                        edge,
                        enrichedNodeMap,
                        evidence,
                        reviews,
                        canViewEvidence,
                        canViewReview,
                        canViewAnomalies,
                        duplicateCounts.getOrDefault(semanticEdgeKey(edge), 0) > 1
                ))
                .toList();

        return new TreeGraphResponse(
                graph.rootNodeId(),
                graph.rootPersonId(),
                graph.direction(),
                graph.dataView(),
                enrichedNodes,
                enrichedEdges,
                graph.meta(),
                graph.warnings()
        );
    }

    private TreeNodeResponse enrichNode(
            TreeNodeResponse node,
            Map<TargetKey, TreeEvidenceSummary> evidence,
            Map<TargetKey, TreeReviewSummary> reviews,
            boolean canViewEvidence,
            boolean canViewReview,
            boolean canViewAnomalies,
            boolean isolated
    ) {
        if (node.personId() == null || !"visible".equals(node.visibility())) {
            return node.withSummaries(null, null, null);
        }
        TargetKey key = new TargetKey(TARGET_PERSON, node.personId());
        TreeEvidenceSummary evidenceSummary = canViewEvidence
                ? evidence.getOrDefault(key, TreeEvidenceSummary.empty())
                : null;
        TreeReviewSummary reviewSummary = canViewReview
                ? reviews.getOrDefault(key, TreeReviewSummary.empty())
                : null;
        TreeAnomalySummary anomalySummary = null;
        if (canViewAnomalies) {
            boolean missingEvidence = canViewEvidence && evidenceSummary.missingOfficialEvidence();
            List<String> codes = qualityRuleService.personAnomalyCodes(node, missingEvidence, isolated);
            anomalySummary = new TreeAnomalySummary(
                    codes,
                    codes.size(),
                    qualityRuleService.highestRisk(codes)
            );
        }
        return node.withSummaries(evidenceSummary, reviewSummary, anomalySummary);
    }

    private TreeEdgeResponse enrichEdge(
            TreeEdgeResponse edge,
            Map<String, TreeNodeResponse> nodesByNodeId,
            Map<TargetKey, TreeEvidenceSummary> evidence,
            Map<TargetKey, TreeReviewSummary> reviews,
            boolean canViewEvidence,
            boolean canViewReview,
            boolean canViewAnomalies,
            boolean possibleDuplicate
    ) {
        if (!"visible".equals(edge.visibility())) {
            return edge.withSummaries(null, null, null);
        }
        TargetKey key = edge.relationshipId() == null
                ? null
                : new TargetKey(TARGET_RELATIONSHIP, edge.relationshipId());
        TreeEvidenceSummary evidenceSummary = canViewEvidence
                ? key == null ? TreeEvidenceSummary.empty() : evidence.getOrDefault(key, TreeEvidenceSummary.empty())
                : null;
        TreeReviewSummary reviewSummary = canViewReview
                ? key == null ? TreeReviewSummary.empty() : reviews.getOrDefault(key, TreeReviewSummary.empty())
                : null;
        TreeAnomalySummary anomalySummary = null;
        if (canViewAnomalies) {
            boolean missingEvidence = canViewEvidence && evidenceSummary.missingOfficialEvidence();
            List<String> codes = qualityRuleService.relationshipAnomalyCodes(
                    edge,
                    nodesByNodeId.get(edge.fromNodeId()),
                    nodesByNodeId.get(edge.toNodeId()),
                    possibleDuplicate,
                    missingEvidence
            );
            anomalySummary = new TreeAnomalySummary(
                    codes,
                    codes.size(),
                    qualityRuleService.highestRisk(codes)
            );
        }
        return edge.withSummaries(evidenceSummary, reviewSummary, anomalySummary);
    }

    private Map<TargetKey, TreeEvidenceSummary> loadEvidence(Long clanId, Set<Long> targetIds) {
        if (targetIds.isEmpty()) {
            return Map.of();
        }
        List<SourceBindingEntity> bindings = sourceBindingRepository.findTreeBindingsByTargets(
                clanId, TARGET_TYPES, targetIds
        );
        Set<Long> sourceIds = bindings.stream()
                .map(SourceBindingEntity::getSourceId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<Long, SourceEntity> sources = sourceIds.isEmpty()
                ? Map.of()
                : sourceRepository.findTreeSourcesByIds(clanId, sourceIds).stream()
                .collect(Collectors.toMap(SourceEntity::getId, Function.identity()));

        Map<TargetKey, List<SourceBindingEntity>> grouped = bindings.stream()
                .filter(binding -> normalizeTargetType(binding.getTargetType()) != null)
                .collect(Collectors.groupingBy(
                        binding -> new TargetKey(
                                normalizeTargetType(binding.getTargetType()),
                                binding.getTargetId()
                        ),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        Map<TargetKey, TreeEvidenceSummary> result = new LinkedHashMap<>();
        grouped.forEach((key, values) -> {
            int official = 0;
            String confidence = "unknown";
            for (SourceBindingEntity binding : values) {
                SourceEntity source = sources.get(binding.getSourceId());
                if (isOfficialSource(source)) {
                    official++;
                }
                confidence = strongerConfidence(
                        confidence,
                        firstNonBlank(binding.getConfidenceLevel(), source == null ? null : source.getConfidenceLevel())
                );
            }
            result.put(key, new TreeEvidenceSummary(
                    values.size(),
                    official,
                    confidence,
                    official == 0
            ));
        });
        return result;
    }

    private Map<TargetKey, TreeReviewSummary> loadReviews(Long clanId, Set<Long> targetIds) {
        if (targetIds.isEmpty()) {
            return Map.of();
        }
        List<RevisionEntity> revisions = revisionRepository.findTreeRevisionsByTargets(
                clanId, TARGET_TYPES, targetIds
        );
        Set<Long> revisionIds = revisions.stream().map(RevisionEntity::getId).collect(Collectors.toSet());
        Map<Long, List<ReviewTaskEntity>> tasksByRevision = revisionIds.isEmpty()
                ? Map.of()
                : reviewTaskRepository.findTreeReviewTasksByRevisionIds(clanId, revisionIds).stream()
                .collect(Collectors.groupingBy(ReviewTaskEntity::getRevisionId));

        Map<TargetKey, ReviewAggregation> aggregates = new LinkedHashMap<>();
        for (RevisionEntity revision : revisions) {
            String type = normalizeTargetType(revision.getTargetType());
            if (type == null) {
                continue;
            }
            TargetKey key = new TargetKey(type, revision.getTargetId());
            ReviewAggregation aggregate = aggregates.computeIfAbsent(key, ignored -> new ReviewAggregation());
            aggregate.addState(normalizeReviewState(revision.getStatus()));
            for (ReviewTaskEntity task : tasksByRevision.getOrDefault(revision.getId(), List.of())) {
                String state = normalizeReviewState(task.getStatus());
                aggregate.addState(state);
                if ("pending".equals(state)) {
                    aggregate.pendingTaskCount++;
                }
                if ("rejected".equals(state)) {
                    aggregate.rejectedTaskCount++;
                }
            }
        }
        return aggregates.entrySet().stream().collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> entry.getValue().toSummary(),
                (left, right) -> left,
                LinkedHashMap::new
        ));
    }

    private TreeEdgeResponse normalizeSemantics(TreeEdgeResponse edge) {
        String rawType = normalize(edge.relationType());
        String category = normalize(edge.relationCategory());
        if (category.isBlank()) {
            category = switch (rawType) {
                case "spouse", "secondary_spouse", "concubine", "wife", "husband" -> "marriage";
                case "adoptive", "successor", "out_adoption", "in_adoption", "dual_successor", "heir_son" -> "ritual";
                case "no_descendant" -> "status";
                default -> "blood";
            };
        }
        String relationType = switch (rawType) {
            case "secondary_spouse", "concubine", "wife", "husband" -> "spouse";
            case "parent_child", "spouse", "adoptive", "successor", "out_adoption", "in_adoption",
                    "dual_successor", "heir_son", "no_descendant", "other" -> rawType;
            default -> "other";
        };
        String ritualType = normalize(edge.ritualRelationType());
        if ("ritual".equals(category) && ritualType.isBlank()) {
            ritualType = Set.of(
                    "adoptive", "successor", "out_adoption", "in_adoption",
                    "dual_successor", "heir_son"
            ).contains(rawType) ? rawType : "other";
        }
        Boolean biological = edge.isBiological();
        if (biological == null) {
            biological = "blood".equals(category) && "parent_child".equals(relationType);
        }
        Boolean primary = edge.isPrimary();
        if (primary == null && "marriage".equals(category)) {
            primary = !Set.of("secondary_spouse", "concubine").contains(rawType);
        }
        return new TreeEdgeResponse(
                edge.edgeId(),
                edge.relationshipId(),
                edge.fromNodeId(),
                edge.fromPersonId(),
                edge.toNodeId(),
                edge.toPersonId(),
                relationType,
                edge.relationLabel(),
                category,
                ritualType.isBlank() ? null : ritualType,
                edge.visibility(),
                edge.isLineageRelation(),
                biological,
                primary,
                edge.dataStatus(),
                edge.confidenceLevel(),
                edge.evidenceSummary(),
                edge.reviewSummary(),
                edge.anomalySummary()
        );
    }

    private boolean hasPermission(Long clanId, Long actorId, String permissionCode) {
        try {
            authorizationApplicationService.requirePermission(clanId, actorId, permissionCode);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private String semanticEdgeKey(TreeEdgeResponse edge) {
        return edge.fromNodeId() + "|" + edge.toNodeId() + "|"
                + normalize(edge.relationType()) + "|" + normalize(edge.ritualRelationType());
    }

    private boolean isOfficialSource(SourceEntity source) {
        return source != null
                && OFFICIAL_SOURCE_STATUSES.contains(normalize(source.getVerificationStatus()));
    }

    private String strongerConfidence(String left, String right) {
        return confidenceRank(right) > confidenceRank(left) ? normalizeConfidence(right) : normalizeConfidence(left);
    }

    private int confidenceRank(String value) {
        return switch (normalizeConfidence(value)) {
            case "high" -> 3;
            case "medium" -> 2;
            case "low" -> 1;
            default -> 0;
        };
    }

    private String normalizeConfidence(String value) {
        String normalized = normalize(value);
        return Set.of("high", "medium", "low").contains(normalized) ? normalized : "unknown";
    }

    private String normalizeReviewState(String value) {
        return switch (normalize(value)) {
            case "pending", "submitted", "assigned", "in_review" -> "pending";
            case "approved", "applied", "completed" -> "approved";
            case "rejected" -> "rejected";
            default -> "none";
        };
    }

    private String normalizeTargetType(String value) {
        String normalized = normalize(value);
        return TARGET_TYPES.contains(normalized) ? normalized : null;
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record TargetKey(String type, Long id) {
    }

    private static final class ReviewAggregation {
        private final Set<String> states = new HashSet<>();
        private int pendingTaskCount;
        private int rejectedTaskCount;

        private void addState(String state) {
            if (!"none".equals(state)) {
                states.add(state);
            }
        }

        private TreeReviewSummary toSummary() {
            String state = states.isEmpty() ? "none" : states.size() == 1
                    ? states.iterator().next()
                    : "mixed";
            return new TreeReviewSummary(state, pendingTaskCount, rejectedTaskCount);
        }
    }
}
