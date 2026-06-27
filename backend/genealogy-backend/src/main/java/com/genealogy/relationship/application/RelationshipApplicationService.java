package com.genealogy.relationship.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
import com.genealogy.relationship.dto.RelationshipUpdateRequest;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.mapper.RelationshipMapper;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class RelationshipApplicationService {

    private final RelationshipRepository relationshipRepository;
    private final PersonRepository personRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public RelationshipApplicationService(
            RelationshipRepository relationshipRepository,
            PersonRepository personRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.relationshipRepository = relationshipRepository;
        this.personRepository = personRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional
    public RelationshipResponse create(Long clanId, RelationshipCreateRequest request) {
        return create(clanId, request, null);
    }

    @Transactional
    public RelationshipResponse create(Long clanId, RelationshipCreateRequest request, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        validateCreate(clanId, request);
        RelationshipEntity entity = RelationshipMapper.toEntity(clanId, request);
        applyDefaults(entity);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        RelationshipEntity saved = relationshipRepository.save(entity);
        operationLogApplicationService.record(clanId, actorId, "relationship_create", "relationship", saved.getId(), "新增人物关系", null);
        return RelationshipMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public RelationshipResponse get(Long id) {
        return RelationshipMapper.toResponse(getActiveEntity(id));
    }

    @Transactional(readOnly = true)
    public List<RelationshipResponse> listByPerson(Long personId) {
        ensurePersonExists(personId);
        List<RelationshipEntity> relationships = new ArrayList<>();
        relationships.addAll(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(personId));
        relationships.addAll(relationshipRepository.findByToPersonIdAndDeletedAtIsNull(personId));
        return relationships.stream().map(RelationshipMapper::toResponse).toList();
    }

    @Transactional
    public RelationshipResponse update(Long id, RelationshipUpdateRequest request) {
        return update(id, request, null);
    }

    @Transactional
    public RelationshipResponse update(Long id, RelationshipUpdateRequest request, Long actorId) {
        RelationshipEntity entity = getActiveEntity(id);
        authorizationApplicationService.requireClanMember(entity.getClanId(), actorId);
        entity.setRelationType(request.relationType());
        entity.setRelationLabel(request.relationLabel());
        entity.setIsLineageRelation(request.isLineageRelation());
        entity.setIsBiological(request.isBiological());
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(request.description());
        entity.setConfidenceLevel(request.confidenceLevel());
        entity.setDataStatus(request.dataStatus() == null ? entity.getDataStatus() : request.dataStatus());
        entity.setUpdatedAt(LocalDateTime.now());
        RelationshipEntity saved = relationshipRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), actorId, "relationship_update", "relationship", saved.getId(), "更新人物关系", null);
        return RelationshipMapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        delete(id, null);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        RelationshipEntity entity = getActiveEntity(id);
        authorizationApplicationService.requireClanMember(entity.getClanId(), actorId);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        relationshipRepository.save(entity);
        operationLogApplicationService.record(entity.getClanId(), actorId, "relationship_delete", "relationship", entity.getId(), "删除人物关系", null);
    }

    private void validateCreate(Long clanId, RelationshipCreateRequest request) {
        if (request.fromPersonId().equals(request.toPersonId())) {
            throw new BusinessException(ErrorCode.SELF_RELATION_NOT_ALLOWED);
        }
        PersonEntity from = getActivePerson(request.fromPersonId());
        PersonEntity to = getActivePerson(request.toPersonId());
        if (!from.getClanId().equals(clanId) || !to.getClanId().equals(clanId)) {
            throw new BusinessException("RELATIONSHIP_CLAN_MISMATCH", "persons must belong to the clan");
        }
    }

    private PersonEntity getActivePerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private void ensurePersonExists(Long personId) {
        getActivePerson(personId);
    }

    private RelationshipEntity getActiveEntity(Long id) {
        return relationshipRepository.findById(id)
                .filter(entity -> entity.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.RELATIONSHIP_NOT_FOUND));
    }

    private void applyDefaults(RelationshipEntity entity) {
        if (entity.getIsLineageRelation() == null) {
            entity.setIsLineageRelation(false);
        }
        if (entity.getIsBiological() == null) {
            entity.setIsBiological(false);
        }
        if (entity.getIsPrimary() == null) {
            entity.setIsPrimary(true);
        }
        if (entity.getConfidenceLevel() == null) {
            entity.setConfidenceLevel("medium");
        }
        if (entity.getDataStatus() == null) {
            entity.setDataStatus("draft");
        }
    }
}
