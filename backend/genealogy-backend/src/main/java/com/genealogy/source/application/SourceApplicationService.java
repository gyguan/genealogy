package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceResponse;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class SourceApplicationService {

    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_ARCHIVED = "archived";
    private static final String CONFIDENCE_UNKNOWN = "unknown";
    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String SENSITIVE_NORMAL = "normal";
    private static final String SOURCE_VIEW = "source:view";
    private static final String SOURCE_CREATE = "source:create";
    private static final String SOURCE_UPDATE = "source:update";
    private static final String SOURCE_DELETE = "source:delete";
    private static final String SOURCE_BIND = "source:bind";
    private static final Set<String> SOURCE_STATUSES = Set.of(STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_OFFICIAL, STATUS_REJECTED, STATUS_ARCHIVED);
    private static final Set<String> CONFIDENCE_LEVELS = Set.of("high", "medium", "low", CONFIDENCE_UNKNOWN);
    private static final Set<String> PRIVACY_LEVELS = Set.of("public", PRIVACY_CLAN_ONLY, "branch_only", "relatives_only", "private", "sealed");
    private static final Set<String> SENSITIVE_LEVELS = Set.of(SENSITIVE_NORMAL, "sensitive", "highly_sensitive");

    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final ClanRepository clanRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceApplicationService(
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            ClanRepository clanRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.clanRepository = clanRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request) {
        return create(clanId, request, null);
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request, Long actorId) {
        return create(clanId, request, actorId, null, null);
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request, Long actorId, String requestId, String clientIp) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_CREATE);
        SourceEntity entity = new SourceEntity();
        entity.setClanId(clanId);
        applyRequest(entity, request);
        LocalDateTime now = LocalDateTime.now();
        entity.setVerificationStatus(STATUS_DRAFT);
        entity.setCreatedBy(actorId);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        SourceEntity saved = sourceRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "source_create", "source", saved.getId(), "create source: " + saved.getSourceName(), null, requestId, clientIp);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SourceResponse get(Long id) {
        return toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public SourceResponse get(Long id, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_VIEW);
        return toResponse(entity);
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceResponse> listByClan(Long clanId, int pageNo, int pageSize) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<SourceResponse> page = sourceRepository.findByClanId(clanId, pageRequest).map(this::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceResponse> listByClan(Long clanId, int pageNo, int pageSize, Long actorId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_VIEW);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<SourceResponse> page = sourceRepository.findByClanId(clanId, pageRequest).map(this::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional
    public SourceResponse update(Long id, SourceCreateRequest request, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_UPDATE);
        ensureMutableSource(entity);
        String before = sourceSnapshot(entity);
        applyRequest(entity, request);
        entity.setUpdatedAt(LocalDateTime.now());
        SourceEntity saved = sourceRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), actorId, "source_update", "source", saved.getId(), "update source: " + saved.getSourceName(), "before=" + before + "; after=" + sourceSnapshot(saved));
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_DELETE);
        ensureMutableSource(entity);
        if (!sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(id).isEmpty()) {
            throw new BusinessException("SOURCE_HAS_BINDINGS", "资料来源已绑定业务对象，不能直接删除");
        }
        sourceRepository.delete(entity);
        operationLogApplicationService.record(entity.getClanId(), actorId, "source_delete", "source", entity.getId(), "delete source: " + entity.getSourceName(), null);
    }

    @Transactional
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, Long actorId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        SourceEntity source = getEntity(request.sourceId());
        if (!source.getClanId().equals(clanId)) {
            throw new BusinessException("SOURCE_CLAN_MISMATCH", "source is not in clan");
        }
        if (!STATUS_OFFICIAL.equals(source.getVerificationStatus())) {
            throw new BusinessException("SOURCE_NOT_OFFICIAL", "资料来源审核通过后才能绑定业务对象");
        }
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_BIND);
        if (sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetId(request.sourceId(), request.targetType(), request.targetId())) {
            throw new BusinessException("SOURCE_BINDING_DUPLICATED", "source binding already exists");
        }
        SourceBindingEntity entity = new SourceBindingEntity();
        entity.setClanId(clanId);
        entity.setSourceId(request.sourceId());
        entity.setTargetType(request.targetType());
        entity.setTargetId(request.targetId());
        entity.setBindingReason(request.bindingReason());
        entity.setExcerpt(request.excerpt());
        entity.setConfidenceLevel(normalizeConfidenceLevel(request.confidenceLevel(), source.getConfidenceLevel()));
        entity.setBindingStatus(STATUS_OFFICIAL);
        entity.setCreatedBy(actorId);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        SourceBindingEntity saved = sourceBindingRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "source_bind", "source_binding", saved.getId(), "bind source " + request.sourceId() + " to " + request.targetType() + ":" + request.targetId(), request.bindingReason());
        return toBindingResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBindingsBySource(Long sourceId, Long actorId) {
        SourceEntity source = getEntity(sourceId);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, SOURCE_VIEW);
        return sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(sourceId).stream().map(this::toBindingResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBindingsByTarget(String targetType, Long targetId, Long clanId, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_VIEW);
        return sourceBindingRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId).stream()
                .filter(binding -> clanId.equals(binding.getClanId()))
                .map(this::toBindingResponse)
                .toList();
    }

    private SourceEntity getEntity(Long id) {
        SourceEntity entity = sourceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
        normalizePersistedSource(entity);
        return entity;
    }

    private void ensureMutableSource(SourceEntity entity) {
        if (STATUS_OFFICIAL.equals(entity.getVerificationStatus()) || STATUS_ARCHIVED.equals(entity.getVerificationStatus())) {
            throw new BusinessException("SOURCE_OFFICIAL_REVIEW_REQUIRED", "正式来源变更需先提交变更审核");
        }
        if (STATUS_PENDING_REVIEW.equals(entity.getVerificationStatus())) {
            throw new BusinessException("SOURCE_PENDING_REVIEW", "来源正在审核中，不能直接修改");
        }
    }

    private void applyRequest(SourceEntity entity, SourceCreateRequest request) {
        entity.setSourceName(request.sourceName());
        entity.setSourceType(request.sourceType());
        entity.setProviderName(request.providerName());
        entity.setBookTitle(request.bookTitle());
        entity.setVolumeNo(request.volumeNo());
        entity.setPageNo(request.pageNo());
        entity.setSourceDate(request.sourceDate());
        entity.setExcerpt(request.excerpt());
        entity.setDescription(request.description());
        entity.setConfidenceLevel(normalizeConfidenceLevel(request.confidenceLevel(), CONFIDENCE_UNKNOWN));
        entity.setPrivacyLevel(normalizePrivacyLevel(request.privacyLevel()));
        entity.setSensitiveLevel(normalizeSensitiveLevel(request.sensitiveLevel()));
        if (entity.getVerificationStatus() == null || entity.getVerificationStatus().isBlank()) {
            entity.setVerificationStatus(STATUS_DRAFT);
        } else {
            entity.setVerificationStatus(normalizeSourceStatus(entity.getVerificationStatus()));
        }
    }

    private void normalizePersistedSource(SourceEntity entity) {
        entity.setVerificationStatus(normalizeSourceStatus(entity.getVerificationStatus()));
        entity.setConfidenceLevel(normalizeConfidenceLevel(entity.getConfidenceLevel(), CONFIDENCE_UNKNOWN));
        entity.setPrivacyLevel(normalizePrivacyLevel(entity.getPrivacyLevel()));
        entity.setSensitiveLevel(normalizeSensitiveLevel(entity.getSensitiveLevel()));
        if (entity.getUpdatedAt() == null) {
            entity.setUpdatedAt(entity.getCreatedAt());
        }
    }

    private String normalizeSourceStatus(String status) {
        if (status == null || status.isBlank()) {
            return STATUS_DRAFT;
        }
        String normalized = status.trim().toLowerCase();
        return switch (normalized) {
            case "unverified" -> STATUS_DRAFT;
            case "verified", "reviewed", "approved" -> STATUS_OFFICIAL;
            default -> {
                if (!SOURCE_STATUSES.contains(normalized)) {
                    throw new BusinessException("SOURCE_STATUS_INVALID", "来源状态不合法");
                }
                yield normalized;
            }
        };
    }

    private String normalizeConfidenceLevel(String value, String defaultValue) {
        String normalized = normalizeEnum(value, defaultValue);
        if (!CONFIDENCE_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_CONFIDENCE_INVALID", "来源可信度不合法");
        }
        return normalized;
    }

    private String normalizePrivacyLevel(String value) {
        String normalized = normalizeEnum(value, PRIVACY_CLAN_ONLY);
        if (!PRIVACY_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_PRIVACY_INVALID", "来源隐私级别不合法");
        }
        return normalized;
    }

    private String normalizeSensitiveLevel(String value) {
        String normalized = normalizeEnum(value, SENSITIVE_NORMAL);
        if (!SENSITIVE_LEVELS.contains(normalized)) {
            throw new BusinessException("SOURCE_SENSITIVE_INVALID", "来源敏感级别不合法");
        }
        return normalized;
    }

    private String normalizeEnum(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim().toLowerCase();
    }

    private SourceResponse toResponse(SourceEntity entity) {
        normalizePersistedSource(entity);
        return new SourceResponse(
                entity.getId(), entity.getClanId(), entity.getSourceName(), entity.getSourceType(), entity.getProviderName(),
                entity.getBookTitle(), entity.getVolumeNo(), entity.getPageNo(), entity.getSourceDate(), entity.getExcerpt(),
                entity.getDescription(), entity.getVerificationStatus(), entity.getConfidenceLevel(), entity.getPrivacyLevel(),
                entity.getSensitiveLevel(), null, null, entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }

    private SourceBindingResponse toBindingResponse(SourceBindingEntity entity) {
        if (entity.getConfidenceLevel() == null || entity.getConfidenceLevel().isBlank()) {
            entity.setConfidenceLevel(CONFIDENCE_UNKNOWN);
        }
        if (entity.getBindingStatus() == null || entity.getBindingStatus().isBlank()) {
            entity.setBindingStatus(STATUS_OFFICIAL);
        }
        if (entity.getUpdatedAt() == null) {
            entity.setUpdatedAt(entity.getCreatedAt());
        }
        return new SourceBindingResponse(
                entity.getId(), entity.getClanId(), entity.getSourceId(), entity.getTargetType(), entity.getTargetId(),
                entity.getBindingReason(), entity.getExcerpt(), entity.getConfidenceLevel(), entity.getBindingStatus(),
                entity.getCreatedBy(), entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }

    private String sourceSnapshot(SourceEntity entity) {
        return "name=" + entity.getSourceName()
                + ",type=" + entity.getSourceType()
                + ",verificationStatus=" + entity.getVerificationStatus()
                + ",confidenceLevel=" + entity.getConfidenceLevel()
                + ",privacyLevel=" + entity.getPrivacyLevel()
                + ",sensitiveLevel=" + entity.getSensitiveLevel();
    }
}
