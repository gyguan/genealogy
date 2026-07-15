package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.MigrationEventCreateRequest;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

@Service
public class MigrationEventDomainService {

    public static final String STATUS_DRAFT = CultureDataStatus.DRAFT.value();
    public static final String STATUS_REJECTED = CultureDataStatus.REJECTED.value();
    public static final String STATUS_PENDING_REVIEW = CultureDataStatus.PENDING_REVIEW.value();
    public static final String STATUS_OFFICIAL = CultureDataStatus.OFFICIAL.value();
    public static final String STATUS_ARCHIVED = CultureDataStatus.ARCHIVED.value();
    public static final int MAX_PAGE_SIZE = 100;
    public static final int MAX_DESCRIPTION_LENGTH = 200000;

    private static final Set<String> MUTABLE_STATUSES = Set.of(STATUS_DRAFT, STATUS_REJECTED);
    private static final Set<String> SORT_FIELDS = Set.of(
            "id", "branchId", "sequenceNo", "fromLocation", "toLocation",
            "migrationTimeText", "dataStatus", "privacyLevel", "createdAt", "updatedAt"
    );

    public NormalizedMigrationEventInput normalize(MigrationEventCreateRequest request) {
        if (request == null) throw requestRequired();
        return normalize(
                request.branchId(), request.sequenceNo(), request.fromLocation(), request.toLocation(),
                request.migrationTimeText(), request.founderPersonId(), request.reason(), request.description(),
                request.confidenceLevel(), request.privacyLevel(), request.sensitiveLevel()
        );
    }

    public NormalizedMigrationEventInput normalize(MigrationEventUpdateRequest request) {
        if (request == null) throw requestRequired();
        return normalize(
                request.branchId(), request.sequenceNo(), request.fromLocation(), request.toLocation(),
                request.migrationTimeText(), request.founderPersonId(), request.reason(), request.description(),
                request.confidenceLevel(), request.privacyLevel(), request.sensitiveLevel()
        );
    }

    public MigrationEventSearchCriteria normalize(MigrationEventSearchCriteria criteria) {
        MigrationEventSearchCriteria safe = criteria == null
                ? new MigrationEventSearchCriteria(null, null, null, null, null, null, null, null, null, null)
                : criteria;
        return new MigrationEventSearchCriteria(
                optionalText(safe.keyword(), 100, "MIGRATION_EVENT_KEYWORD_TOO_LONG", "搜索关键词不能超过100字"),
                safe.branchId(),
                optionalText(safe.fromLocation(), 100, "MIGRATION_EVENT_FROM_FILTER_TOO_LONG", "迁出地筛选不能超过100字"),
                optionalText(safe.toLocation(), 100, "MIGRATION_EVENT_TO_FILTER_TOO_LONG", "迁入地筛选不能超过100字"),
                optionalText(safe.migrationTimeText(), 100, "MIGRATION_EVENT_TIME_FILTER_TOO_LONG", "历史时期筛选不能超过100字"),
                safe.founderPersonId(),
                optionalEnum(safe.dataStatus(), this::normalizeStatus),
                optionalEnum(safe.privacyLevel(), this::normalizePrivacy),
                safe.hasSource(),
                normalizeSort(safe.sort())
        );
    }

    public void apply(MigrationEventEntity entity, NormalizedMigrationEventInput input) {
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

    public boolean isDirectlyMutable(MigrationEventEntity entity) {
        return entity != null && MUTABLE_STATUSES.contains(normalizeStatus(entity.getDataStatus()));
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

    private NormalizedMigrationEventInput normalize(
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
            throw new BusinessException("MIGRATION_EVENT_BRANCH_REQUIRED", "迁徙事件必须选择有效支派");
        }
        if (sequenceNo == null || sequenceNo <= 0) {
            throw new BusinessException("MIGRATION_EVENT_SEQUENCE_INVALID", "迁徙顺序必须大于0");
        }
        String from = requiredText(fromLocation, 500, "MIGRATION_EVENT_FROM_REQUIRED", "迁出地不能为空且不能超过500字");
        String to = requiredText(toLocation, 500, "MIGRATION_EVENT_TO_REQUIRED", "迁入地不能为空且不能超过500字");
        if (locationKey(from).equals(locationKey(to))) {
            throw new BusinessException("MIGRATION_EVENT_SELF_ROUTE", "迁出地和迁入地不能相同");
        }
        if (founderPersonId != null && founderPersonId <= 0) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_INVALID", "始迁祖标识不合法");
        }
        return new NormalizedMigrationEventInput(
                branchId,
                sequenceNo,
                from,
                to,
                optionalText(migrationTimeText, 200, "MIGRATION_EVENT_TIME_TOO_LONG", "历史时期不能超过200字"),
                founderPersonId,
                optionalText(reason, 1000, "MIGRATION_EVENT_REASON_TOO_LONG", "迁徙原因不能超过1000字"),
                optionalText(description, MAX_DESCRIPTION_LENGTH, "MIGRATION_EVENT_DESCRIPTION_TOO_LONG", "迁徙说明不能超过200000字"),
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

    private String optionalEnum(String value, Function<String, String> normalizer) {
        return value == null || value.isBlank() ? null : normalizer.apply(value);
    }

    private String normalizeEnum(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String locationKey(String value) {
        return value.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
    }

    private BusinessException requestRequired() {
        return new BusinessException("MIGRATION_EVENT_REQUEST_REQUIRED", "迁徙事件请求不能为空");
    }

    public record NormalizedMigrationEventInput(
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
