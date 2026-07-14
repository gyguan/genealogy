from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:80]!r}")
    path.write_text(text.replace(old, new, 1))


root = Path(__file__).resolve().parents[1]

tracking_repository = root / "backend/genealogy-backend/src/main/java/com/genealogy/tracking/repository/TrackingObjectQueryRepository.java"
replace_once(
    tracking_repository,
    "import java.time.LocalDateTime;\nimport java.util.List;\n",
    "import java.time.LocalDateTime;\nimport java.util.Collection;\nimport java.util.LinkedHashSet;\nimport java.util.List;\nimport java.util.Optional;\n",
)
find_visible_methods = '''    public Optional<TrackingObjectResponse> findVisibleById(
            Long clanId,
            String objectType,
            Long targetId,
            boolean fullClanAccess,
            List<Long> visibleBranchIds
    ) {
        if (targetId == null) {
            return Optional.empty();
        }
        return findVisibleByIds(clanId, objectType, List.of(targetId), fullClanAccess, visibleBranchIds)
                .stream()
                .findFirst();
    }

    public List<TrackingObjectResponse> findVisibleByIds(
            Long clanId,
            String objectType,
            Collection<Long> targetIds,
            boolean fullClanAccess,
            List<Long> visibleBranchIds
    ) {
        LinkedHashSet<Long> normalizedIds = targetIds == null
                ? new LinkedHashSet<>()
                : targetIds.stream()
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (normalizedIds.isEmpty()) {
            return List.of();
        }
        SearchSql searchSql = switch (objectType) {
            case "person" -> personSql();
            case "relationship" -> relationshipSql();
            case "source" -> sourceSql();
            case "branch" -> branchSql();
            case "review_task" -> reviewTaskSql();
            default -> throw new IllegalArgumentException("unsupported tracking object type: " + objectType);
        };
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("clanId", clanId, Types.BIGINT)
                .addValue("keyword", "", Types.VARCHAR)
                .addValue("keywordPattern", "%%", Types.VARCHAR)
                .addValue("branchId", null, Types.BIGINT)
                .addValue("hasBranchId", false, Types.BOOLEAN)
                .addValue("status", "", Types.VARCHAR)
                .addValue("changedFrom", null, Types.TIMESTAMP)
                .addValue("hasChangedFrom", false, Types.BOOLEAN)
                .addValue("changedTo", null, Types.TIMESTAMP)
                .addValue("hasChangedTo", false, Types.BOOLEAN)
                .addValue("fullClanAccess", fullClanAccess, Types.BOOLEAN)
                .addValue("visibleBranchIds", visibleBranchIds == null || visibleBranchIds.isEmpty() ? List.of(-1L) : visibleBranchIds)
                .addValue("targetIds", normalizedIds);
        String sql = "select * from (" + searchSql.selectClause() + searchSql.fromWhereClause()
                + ") visible_object where object_id in (:targetIds) order by object_id";
        return jdbcTemplate.query(sql, parameters, (resultSet, rowNumber) -> {
            Timestamp changedAt = resultSet.getTimestamp("changed_at");
            return new TrackingObjectResponse(
                    resultSet.getString("object_type"),
                    resultSet.getLong("object_id"),
                    resultSet.getString("display_name"),
                    resultSet.getString("secondary_label"),
                    resultSet.getString("branch_name"),
                    resultSet.getString("summary"),
                    resultSet.getString("result_status"),
                    changedAt == null ? null : changedAt.toLocalDateTime()
            );
        });
    }

'''
replace_once(tracking_repository, "    private SearchSql personSql() {\n", find_visible_methods + "    private SearchSql personSql() {\n")

operation_service = root / "backend/genealogy-backend/src/main/java/com/genealogy/operationlog/application/OperationLogApplicationService.java"
replace_once(operation_service, "import java.util.ArrayList;\nimport java.util.Comparator;\n", "import java.util.ArrayList;\nimport java.util.Collection;\nimport java.util.Comparator;\n")
search_by_targets = '''    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> searchByTargets(
            Long clanId,
            Map<String, ? extends Collection<Long>> targetIdsByType,
            int limit,
            boolean includeTechnicalFields
    ) {
        Map<String, List<Long>> normalizedTargets = new LinkedHashMap<>();
        if (targetIdsByType != null) {
            targetIdsByType.forEach((type, ids) -> {
                String normalizedType = normalize(type);
                if (normalizedType == null || ids == null) {
                    return;
                }
                List<Long> normalizedIds = ids.stream()
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .toList();
                if (!normalizedIds.isEmpty()) {
                    normalizedTargets.put(normalizedType, normalizedIds);
                }
            });
        }
        int normalizedLimit = Math.max(1, Math.min(limit, 500));
        if (clanId == null || normalizedTargets.isEmpty()) {
            return PageResponse.of(List.of(), 0L, 1, normalizedLimit);
        }
        Specification<OperationLogEntity> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> targetPredicates = new ArrayList<>();
            normalizedTargets.forEach((type, ids) -> targetPredicates.add(criteriaBuilder.and(
                    criteriaBuilder.equal(root.get("targetType"), type),
                    root.get("targetId").in(ids)
            )));
            return criteriaBuilder.and(
                    criteriaBuilder.equal(root.get("clanId"), clanId),
                    criteriaBuilder.or(targetPredicates.toArray(new Predicate[0]))
            );
        };
        PageRequest pageRequest = PageRequest.of(0, normalizedLimit,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<OperationLogEntity> page = operationLogRepository.findAll(specification, pageRequest);
        return PageResponse.of(
                page.map(entity -> toResponse(entity, includeTechnicalFields)).getContent(),
                page.getTotalElements(),
                1,
                normalizedLimit
        );
    }

'''
replace_once(operation_service, "    /**\n     * Compatibility overload with secure-by-default response minimization.\n", search_by_targets + "    /**\n     * Compatibility overload with secure-by-default response minimization.\n")

controller = root / "backend/genealogy-backend/src/main/java/com/genealogy/tracking/controller/TrackingController.java"
replace_once(controller, "import com.genealogy.tracking.application.TrackingObjectSearchApplicationService;\nimport com.genealogy.tracking.dto.TrackingObjectResponse;\n", "import com.genealogy.tracking.application.TrackingObjectSearchApplicationService;\nimport com.genealogy.tracking.application.TrackingTraceApplicationService;\nimport com.genealogy.tracking.dto.TrackingObjectResponse;\nimport com.genealogy.tracking.dto.TrackingTraceDetailResponse;\n")
replace_once(controller, "import org.springframework.web.bind.annotation.GetMapping;\n", "import org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.PathVariable;\n")
replace_once(controller, "    private final TrackingObjectSearchApplicationService trackingObjectSearchApplicationService;\n    private final AuthorizationApplicationService authorizationApplicationService;\n", "    private final TrackingObjectSearchApplicationService trackingObjectSearchApplicationService;\n    private final TrackingTraceApplicationService trackingTraceApplicationService;\n    private final AuthorizationApplicationService authorizationApplicationService;\n")
replace_once(controller, "            TrackingObjectSearchApplicationService trackingObjectSearchApplicationService,\n            AuthorizationApplicationService authorizationApplicationService\n    ) {\n        this.trackingObjectSearchApplicationService = trackingObjectSearchApplicationService;\n        this.authorizationApplicationService = authorizationApplicationService;\n", "            TrackingObjectSearchApplicationService trackingObjectSearchApplicationService,\n            TrackingTraceApplicationService trackingTraceApplicationService,\n            AuthorizationApplicationService authorizationApplicationService\n    ) {\n        this.trackingObjectSearchApplicationService = trackingObjectSearchApplicationService;\n        this.trackingTraceApplicationService = trackingTraceApplicationService;\n        this.authorizationApplicationService = authorizationApplicationService;\n")
trace_endpoint = '''
    @GetMapping("/objects/{targetType}/{targetId}/trace")
    public ApiResponse<TrackingTraceDetailResponse> traceObject(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @PathVariable String targetType,
            @PathVariable Long targetId
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(
                clanId,
                actorId,
                TrackingTraceApplicationService.PERMISSION_VIEW
        );
        boolean includeTechnicalFields = authorizationApplicationService.hasDirectClanPermission(
                clanId,
                actorId,
                "operation_log.export"
        );
        return ApiResponse.success(trackingTraceApplicationService.trace(
                clanId,
                actorId,
                targetType,
                targetId,
                includeTechnicalFields
        ));
    }
'''
replace_once(controller, "\n}\n", trace_endpoint + "\n}\n")
