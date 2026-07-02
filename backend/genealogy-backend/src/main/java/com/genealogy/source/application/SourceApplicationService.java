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

@Service
public class SourceApplicationService {

    private static final String SOURCE_VIEW = "source:view";
    private static final String SOURCE_CREATE = "source:create";
    private static final String SOURCE_UPDATE = "source:update";
    private static final String SOURCE_DELETE = "source:delete";
    private static final String SOURCE_BIND = "source:bind";

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
        entity.setCreatedBy(actorId);
        entity.setCreatedAt(LocalDateTime.now());
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
        String before = sourceSnapshot(entity);
        applyRequest(entity, request);
        SourceEntity saved = sourceRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), actorId, "source_update", "source", saved.getId(), "update source: " + saved.getSourceName(), "before=" + before + "; after=" + sourceSnapshot(saved));
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        SourceEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(entity.getClanId(), actorId, SOURCE_DELETE);
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
        entity.setCreatedBy(actorId);
        entity.setCreatedAt(LocalDateTime.now());
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
        return sourceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
    }

    private void applyRequest(SourceEntity entity, SourceCreateRequest request) {
        entity.setSourceName(request.sourceName());
        entity.setSourceType(request.sourceType());
        entity.setProviderName(request.providerName());
        entity.setBookTitle(request.bookTitle());
        entity.setVolumeNo(request.volumeNo());
        entity.setPageNo(request.pageNo());
        entity.setExcerpt(request.excerpt());
        entity.setVerificationStatus(request.verificationStatus() == null ? "unverified" : request.verificationStatus());
        entity.setDescription(request.description());
    }

    private SourceResponse toResponse(SourceEntity entity) {
        return new SourceResponse(
                entity.getId(), entity.getClanId(), entity.getSourceName(), entity.getSourceType(), entity.getProviderName(),
                entity.getBookTitle(), entity.getVolumeNo(), entity.getPageNo(), entity.getExcerpt(), entity.getVerificationStatus(),
                entity.getCreatedAt()
        );
    }

    private SourceBindingResponse toBindingResponse(SourceBindingEntity entity) {
        return new SourceBindingResponse(
                entity.getId(), entity.getClanId(), entity.getSourceId(), entity.getTargetType(), entity.getTargetId(),
                entity.getBindingReason(), entity.getExcerpt(), entity.getCreatedBy(), entity.getCreatedAt()
        );
    }

    private String sourceSnapshot(SourceEntity entity) {
        return "name=" + entity.getSourceName()
                + ",type=" + entity.getSourceType()
                + ",verificationStatus=" + entity.getVerificationStatus();
    }
}
