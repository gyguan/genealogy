package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.MigrationEventCreateRequest;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

@Service
public class MigrationEventDomainService {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_DESCRIPTION_LENGTH = 200000;
    public static final String STATUS_DRAFT = CultureDataStatus.DRAFT.value();
    public static final String STATUS_REJECTED = CultureDataStatus.REJECTED.value();
    public static final String STATUS_PENDING_REVIEW = CultureDataStatus.PENDING_REVIEW.value();
    public static final String STATUS_OFFICIAL = CultureDataStatus.OFFICIAL.value();
    public static final String STATUS_ARCHIVED = CultureDataStatus.ARCHIVED.value();

    private static final Set<String> MUTABLE_STATUSES = Set.of(STATUS_DRAFT, STATUS_REJECTED);
    private static final Set<String> SORT_FIELDS = Set.of("sequenceNo", "migrationTimeText", "fromLocation", "toLocation", "createdAt", "updatedAt", "id");

    public NormalizedMigrationInput normalize(MigrationEventCreateRequest request) {
        if (request == null) throw new BusinessException("MIGRATION_EVENT_REQUEST_REQUIRED", "迁徙事件请求不能为空");
        return normalizeInput(
                request.branchId(), request.sequenceNo(), request.fromLocation(), request.toLocation(),
                request.migrationTimeText(), request.founderPersonId(), request.reason(), request.description(),
                request.confidenceLevel(), request.privacyLevel(), request.sensitiveLevel()
        );
    }

    public NormalizedMigrationInput normalize(MigrationEventUpdateRequest request) {
        if (request == null) throw new BusinessException("MIGRATION_EVENT_REQUEST_REQUIRED", "迁徙事件请求不能为空");
        return normalizeInput(
                request.branchId(), request.sequenceNo(), request.fromLocation(), request.toLocation(),
                request.migrationTimeText(), request.founderPersonId(), request.reason(), request.description(),
                request.confidenceLevel(), request.privacyLevel(), request.sensitiveLevel()
        );
    }

    public MigrationEventSearchCriteria normalize(MigrationEventSearchCriteria criteria) {
        MigrationEventSearchCriteria safe = criteria == null
                ? MigrationEventSearchCriteria.multi(null, List.of(), null, null, null, null, List.of(), null, null)
                : criteria;
        return MigrationEventSearchCriteria.multi(
                optionalText(safe.keyword(), 100, "MIGRATION_EVENT_KEYWORD_TOO_LONG", "搜索关键词不能超过 100 字"),
                normalizeValues(safe.branchIds(), this::normalizeBranchId),
                optionalText(safe.fromLocation(), 500, "MIGRATION_EVENT_FROM_TOO_LONG", "迁出地不能超过 500 字"),
                optionalText(safe.toLocation(), 500, "MIGRATION_EVENT_TO_TOO_LONG", "迁入地不能超过 500 字"),
                optionalText(safe.migrationTimeText(), 200, "MIGRATION_EVENT_TIME_TOO_LONG", "迁徙时间不能超过 200 字"),
                safe.founderPersonId(),
                normalizeValues(safe.dataStatuses(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                normalizeSort(safe.sort())
        );
    }

    public void apply(MigrationEventEntity entity, NormalizedMigrationInput input) {
        entity.setBranchId(input.branchId());
        entity.setSequenceNo(input.sequenceNo());
        entity.setFromLocation(input.fromLocation());
        entity.setToLocation(input.toLocation());
        entity.setMigrationTimeText(input.migrationTimeText());
        entity.setFounderPersonId(input.founderPersonId());
        entity.setReason(input.reason());
        entity.setDescription(input.description());
        entity.setConfidenceLevel(input.confidenceLevel());
        entity.setPrivacyLevel(input.privacyLevel());
        entity.setSensitiveLevel(input.sensitiveLevel());
    }

    public void requireDirectlyMutable(MigrationEventEntity entity) {
        String status = normalizeStatus(entity.getDataStatus());
        if (MUTABLE_STATUSES.contains(status)) return;
        if (STATUS_PENDING_REVIEW.equals(status)) {
            throw new BusinessException("MIGRATION_EVENT_PENDING_REVIEW", "迁徙事件正在审核中，不能直接修改");
        }
        throw new BusinessException("MIGRATION_EVENT_REVIEW_REQUIRED", "正式或归档迁徙事件不能直接修改，需提交审核变更");
    }

    public void requireExpectedVersion(MigrationEventEntity entity, Long expectedVersion) {
        if (expectedVersion == null || entity.getVersion() == null || !entity.getVersion().equals(expectedVersion)) {
            throw new BusinessException("MIGRATION_EVENT_VERSION_CONFLICT", "迁徙事件版本已变化，请刷新后重试");
        }
    }

    public String normalizeStatus(String value) {
        try {
            return CultureDataStatus.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MIGRATION_EVENT_STATUS_INVALID", "迁徙事件状态不合法");
        }
    }

    public String sortField(String sort) {
        String normalized = normalizeSort(sort);
        return normalized == null ? "sequenceNo" : normalized.split(",", 2)[0];
    }

    public boolean sortAscending(String sort) {
        String normalized = normalizeSort(sort);
        return normalized == null || normalized.endsWith(",asc");
    }

    private NormalizedMigrationInput normalizeInput(
            Long branchId,
            Integer sequenceNo,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            String reason,
            String description,
            String confidenceLevel,
            String privacyLevel,
            String sensitiveLevel
    ) {
        if (branchId == null || branchId <= 0) {
            throw new BusinessException("MIGRATION_EVENT_BRANCH_REQUIRED", "迁徙事件必须关联有效支派");
        }
        if (sequenceNo == null || sequenceNo <= 0 || sequenceNo > 100000) {
            throw new BusinessException("MIGRATION_EVENT_SEQUENCE_INVALID", "迁徙顺序必须在 1 到 100000 之间");
        }
        String from = requiredText(fromLocation, 500, "MIGRATION_EVENT_FROM_REQUIRED", "迁出地不能为空且不能超过 500 字");
        String to = requiredText(toLocation, 500, "MIGRATION_EVENT_TO_REQUIRED", "迁入地不能为空且不能超过 500 字");
        if (normalizeLocation(from).equals(normalizeLocation(to))) {
            throw new BusinessException("MIGRATION_EVENT_SELF_MOVE", "迁出地和迁入地不能相同");
        }
        return new NormalizedMigrationInput(
                branchId,
                sequenceNo,
                from,
                to,
                optionalText(migrationTimeText, 200, "MIGRATION_EVENT_TIME_TOO_LONG", "迁徙时间不能超过 200 字"),
                founderPersonId,
                optionalText(reason, 1000, "MIGRATION_EVENT_REASON_TOO_LONG", "迁徙原因不能超过 1000 字"),
                optionalText(description, MAX_DESCRIPTION_LENGTH, "MIGRATION_EVENT_DESCRIPTION_TOO_LONG", "迁徙说明不能超过 200000 字"),
                normalizeConfidence(confidenceLevel),
                normalizePrivacy(privacyLevel),
                normalizeSensitive(sensitiveLevel)
        );
    }

    private String normalizeConfidence(String value) {
        try {
            return CultureConfidenceLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MIGRATION_EVENT_CONFIDENCE_INVALID", "迁徙事件可信度不合法");
        }
    }

    private String normalizePrivacy(String value) {
        try {
            return CulturePrivacyLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MIGRATION_EVENT_PRIVACY_INVALID", "迁徙事件隐私级别不合法");
        }
    }

    private String normalizeSensitive(String value) {
        try {
            return CultureSensitiveLevel.fromValue(normalizeEnum(value)).value();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("MIGRATION_EVENT_SENSITIVE_INVALID", "迁徙事件敏感级别不合法");
        }
    }

    private String normalizeSort(String value) {
        if (value == null || value.isBlank()) return null;
        String[] parts = value.trim().split(",", 2);
        String field = SORT_FIELDS.contains(parts[0]) ? parts[0] : "sequenceNo";
        String direction = parts.length > 1 && "desc".equalsIgnoreCase(parts[1]) ? "desc" : "asc";
        return field + "," + direction;
    }

    private String normalizeLocation(String value) {
        return value.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }

    private String requiredText(String value, int maxLength, String code, String message) {
        String normalized = optionalText(value, maxLength, code, message);
        if (normalized == null) throw new BusinessException(code, message);
        return normalized;
    }

    private String optionalText(String value, int maxLength, String code, String message) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > maxLength) throw new BusinessException(code, message);
        return normalized;
    }

    private Long normalizeBranchId(Long value) {
        if (value == null || value <= 0) {
            throw new BusinessException("MIGRATION_EVENT_BRANCH_INVALID", "迁徙事件支派不合法");
        }
        return value;
    }

    private <T, R> List<R> normalizeValues(List<T> values, Function<T, R> normalizer) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream().filter(Objects::nonNull).map(normalizer).distinct().toList();
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String optionalEnum(String value, java.util.function.Function<String, String> normalizer) {
        return value == null || value.isBlank() ? null : normalizer.apply(value);
    }

    public record NormalizedMigrationInput(
            Long branchId,
            Integer sequenceNo,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            String reason,
            String description,
            String confidenceLevel,
            String privacyLevel,
            String sensitiveLevel
    ) {
    }
}
