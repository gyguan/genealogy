package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.domain.ApprovedStatusPolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.source.dto.AttachmentCreateRequest;
import com.genealogy.source.dto.AttachmentResponse;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.entity.AttachmentEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.AttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class SourceEvidenceApplicationService {

    private static final Set<String> TARGET_TYPES = Set.of("person", "relationship", "branch", "clan");
    private static final String SOURCE_VIEW = "source:view";
    private static final String SOURCE_BIND = "source:bind";

    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final AttachmentRepository attachmentRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final BranchRepository branchRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceEvidenceApplicationService(
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            AttachmentRepository attachmentRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.attachmentRepository = attachmentRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.branchRepository = branchRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public SourceBindingResponse bind(SourceBindingCreateRequest request) {
        String targetType = normalizeTargetType(request.targetType());
        SourceEntity source = getSource(request.sourceId());
        ApprovedStatusPolicy.requireApproved(source.getVerificationStatus(), "SOURCE_NOT_OFFICIAL", "来源审核通过后才能绑定业务对象");
        authorizationApplicationService.requirePermission(source.getClanId(), request.createdBy(), SOURCE_BIND);
        validateTargetAndScope(source, targetType, request.targetId(), request.createdBy(), SOURCE_BIND);
        if (sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetId(source.getId(), targetType, request.targetId())) {
            throw new BusinessException("SOURCE_BINDING_DUPLICATED", "该来源已绑定到目标对象");
        }

        SourceBindingEntity entity = new SourceBindingEntity();
        entity.setClanId(source.getClanId());
        entity.setSourceId(source.getId());
        entity.setTargetType(targetType);
        entity.setTargetId(request.targetId());
        entity.setBindingReason(trimToNull(request.bindingReason()));
        entity.setExcerpt(trimToNull(request.excerpt()));
        entity.setCreatedBy(request.createdBy());
        entity.setCreatedAt(LocalDateTime.now());
        SourceBindingEntity saved = sourceBindingRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), saved.getCreatedBy(), "source_binding_create", saved.getTargetType(), saved.getTargetId(), "绑定资料来源：" + source.getSourceName(), "sourceId=" + saved.getSourceId() + ", bindingId=" + saved.getId());
        return toBindingResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listByTarget(String targetType, Long targetId) {
        String normalizedTargetType = normalizeTargetType(targetType);
        return sourceBindingRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(normalizedTargetType, targetId).stream()
                .map(this::toBindingResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listByTarget(String targetType, Long targetId, Long actorId) {
        String normalizedTargetType = normalizeTargetType(targetType);
        requireTargetViewPermission(normalizedTargetType, targetId, actorId);
        return sourceBindingRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(normalizedTargetType, targetId).stream()
                .map(this::toBindingResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBySource(Long sourceId) {
        getSource(sourceId);
        return sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(sourceId).stream()
                .map(this::toBindingResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBySource(Long sourceId, Long actorId) {
        SourceEntity source = getSource(sourceId);
        authorizationApplicationService.requirePermission(source.getClanId(), actorId, SOURCE_VIEW);
        return sourceBindingRepository.findBySourceIdOrderByCreatedAtDesc(sourceId).stream()
                .map(this::toBindingResponse)
                .toList();
    }

    @Transactional
    public void unbind(Long bindingId) {
        unbind(bindingId, null);
    }

    @Transactional
    public void unbind(Long bindingId, Long actorId) {
        SourceBindingEntity binding = sourceBindingRepository.findById(bindingId)
                .orElseThrow(() -> new BusinessException("SOURCE_BINDING_NOT_FOUND", "来源绑定不存在"));
        SourceEntity source = getSource(binding.getSourceId());
        authorizationApplicationService.requirePermission(binding.getClanId(), actorId, SOURCE_BIND);
        validateTargetAndScope(source, binding.getTargetType(), binding.getTargetId(), actorId, SOURCE_BIND);
        sourceBindingRepository.deleteById(bindingId);
        operationLogApplicationService.record(binding.getClanId(), actorId, "source_binding_delete", binding.getTargetType(), binding.getTargetId(), "解除资料来源绑定：" + source.getSourceName(), "sourceId=" + binding.getSourceId() + ", bindingId=" + binding.getId());
    }

    @Transactional
    public AttachmentResponse createAttachment(AttachmentCreateRequest request) {
        authorizationApplicationService.requireClanMember(request.clanId(), request.uploadedBy());
        SourceEntity source = null;
        if (request.sourceId() != null) {
            source = getSource(request.sourceId());
            if (!source.getClanId().equals(request.clanId())) {
                throw new BusinessException("ATTACHMENT_SOURCE_CLAN_MISMATCH", "附件宗族与来源宗族不一致");
            }
        }

        AttachmentEntity entity = new AttachmentEntity();
        entity.setClanId(request.clanId());
        entity.setSourceId(request.sourceId());
        entity.setFileName(request.fileName().trim());
        entity.setFileType(trimToNull(request.fileType()));
        entity.setFileSize(request.fileSize());
        entity.setStoragePath(request.storagePath().trim());
        entity.setThumbnailPath(trimToNull(request.thumbnailPath()));
        entity.setChecksum(trimToNull(request.checksum()));
        entity.setUploadedBy(request.uploadedBy());
        entity.setUploadedAt(LocalDateTime.now());
        entity.setAccessLevel(defaultIfBlank(request.accessLevel(), "clan_only"));
        AttachmentEntity saved = attachmentRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), saved.getUploadedBy(), "attachment_create", saved.getSourceId() == null ? "attachment" : "source", saved.getSourceId() == null ? saved.getId() : saved.getSourceId(), "登记附件：" + saved.getFileName(), source == null ? "attachmentId=" + saved.getId() : "sourceId=" + source.getId() + ", attachmentId=" + saved.getId());
        return toAttachmentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> listAttachmentsBySource(Long sourceId) {
        getSource(sourceId);
        return attachmentRepository.findBySourceIdOrderByUploadedAtDesc(sourceId).stream()
                .map(this::toAttachmentResponse)
                .toList();
    }

    private SourceEntity getSource(Long sourceId) {
        return sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "资料来源不存在"));
    }

    private void validateTargetAndScope(SourceEntity source, String targetType, Long targetId, Long actorId, String permissionCode) {
        if (targetId == null) {
            throw new BusinessException("SOURCE_BINDING_TARGET_REQUIRED", "绑定目标ID不能为空");
        }
        switch (targetType) {
            case "person" -> {
                PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(targetId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
                if (!source.getClanId().equals(person.getClanId())) {
                    throw new BusinessException("SOURCE_BINDING_CLAN_MISMATCH", "来源与目标人物不属于同一宗族");
                }
                ApprovedStatusPolicy.requireApproved(person.getDataStatus(), "PERSON_NOT_OFFICIAL", "人物审核通过后才能绑定来源资料");
                authorizationApplicationService.requireBranchPermission(source.getClanId(), actorId, person.getBranchId(), permissionCode);
            }
            case "relationship" -> {
                RelationshipEntity relationship = relationshipRepository.findById(targetId)
                        .filter(item -> item.getDeletedAt() == null)
                        .orElseThrow(() -> new BusinessException(ErrorCode.RELATIONSHIP_NOT_FOUND));
                if (!source.getClanId().equals(relationship.getClanId())) {
                    throw new BusinessException("SOURCE_BINDING_CLAN_MISMATCH", "来源与目标关系不属于同一宗族");
                }
                ApprovedStatusPolicy.requireApproved(relationship.getDataStatus(), "RELATIONSHIP_NOT_OFFICIAL", "关系审核通过后才能绑定来源资料");
                PersonEntity from = personRepository.findByIdAndDeletedAtIsNull(relationship.getFromPersonId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
                PersonEntity to = personRepository.findByIdAndDeletedAtIsNull(relationship.getToPersonId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
                authorizationApplicationService.requireBranchPermission(source.getClanId(), actorId, from.getBranchId(), permissionCode);
                authorizationApplicationService.requireBranchPermission(source.getClanId(), actorId, to.getBranchId(), permissionCode);
            }
            case "branch" -> {
                BranchEntity branch = branchRepository.findByIdAndClanId(targetId, source.getClanId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
                ApprovedStatusPolicy.requireApproved(branch.getStatus(), "BRANCH_NOT_OFFICIAL", "支派审核通过后才能绑定来源资料");
                authorizationApplicationService.requireBranchPermission(source.getClanId(), actorId, branch.getId(), permissionCode);
            }
            case "clan" -> {
                if (!source.getClanId().equals(targetId)) {
                    throw new BusinessException("SOURCE_BINDING_CLAN_MISMATCH", "来源不属于目标宗族");
                }
                authorizationApplicationService.requirePermission(source.getClanId(), actorId, permissionCode);
            }
            default -> throw new BusinessException("SOURCE_BINDING_TARGET_TYPE_INVALID", "不支持的绑定目标类型");
        }
    }

    private void requireTargetViewPermission(String targetType, Long targetId, Long actorId) {
        if (targetId == null) {
            throw new BusinessException("SOURCE_BINDING_TARGET_REQUIRED", "绑定目标ID不能为空");
        }
        switch (targetType) {
            case "person" -> {
                PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(targetId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
                authorizationApplicationService.requireBranchPermission(person.getClanId(), actorId, person.getBranchId(), SOURCE_VIEW);
            }
            case "relationship" -> {
                RelationshipEntity relationship = relationshipRepository.findById(targetId)
                        .filter(item -> item.getDeletedAt() == null)
                        .orElseThrow(() -> new BusinessException(ErrorCode.RELATIONSHIP_NOT_FOUND));
                PersonEntity from = personRepository.findByIdAndDeletedAtIsNull(relationship.getFromPersonId())
                        .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
                authorizationApplicationService.requireBranchPermission(relationship.getClanId(), actorId, from.getBranchId(), SOURCE_VIEW);
            }
            case "branch" -> {
                BranchEntity branch = branchRepository.findById(targetId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
                authorizationApplicationService.requireBranchPermission(branch.getClanId(), actorId, branch.getId(), SOURCE_VIEW);
            }
            case "clan" -> authorizationApplicationService.requirePermission(targetId, actorId, SOURCE_VIEW);
            default -> throw new BusinessException("SOURCE_BINDING_TARGET_TYPE_INVALID", "不支持的绑定目标类型");
        }
    }

    private String normalizeTargetType(String targetType) {
        String normalized = trimToNull(targetType);
        if (normalized == null) {
            throw new BusinessException("SOURCE_BINDING_TARGET_TYPE_REQUIRED", "绑定目标类型不能为空");
        }
        normalized = normalized.toLowerCase();
        if (!TARGET_TYPES.contains(normalized)) {
            throw new BusinessException("SOURCE_BINDING_TARGET_TYPE_INVALID", "不支持的绑定目标类型");
        }
        return normalized;
    }

    private SourceBindingResponse toBindingResponse(SourceBindingEntity entity) {
        return new SourceBindingResponse(entity.getId(), entity.getClanId(), entity.getSourceId(), entity.getTargetType(), entity.getTargetId(), entity.getBindingReason(), entity.getExcerpt(), entity.getCreatedBy(), entity.getCreatedAt());
    }

    private AttachmentResponse toAttachmentResponse(AttachmentEntity entity) {
        return new AttachmentResponse(entity.getId(), entity.getClanId(), entity.getSourceId(), entity.getFileName(), entity.getFileType(), entity.getFileSize(), entity.getStoragePath(), entity.getThumbnailPath(), entity.getChecksum(), entity.getUploadedBy(), entity.getUploadedAt(), entity.getAccessLevel());
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        String trimmed = trimToNull(value);
        return trimmed == null ? defaultValue : trimmed;
    }
}
