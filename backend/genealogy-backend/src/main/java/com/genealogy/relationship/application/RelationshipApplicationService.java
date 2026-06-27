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

    private static final String TYPE_PARENT_CHILD = "parent_child";
    private static final String TYPE_SPOUSE = "spouse";
    private static final String TYPE_ADOPTIVE = "adoptive";
    private static final String LABEL_FATHER = "father";
    private static final String LABEL_MOTHER = "mother";

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
        RelationshipEntity entity = RelationshipMapper.toEntity(clanId, normalizeRequest(request));
        applyDefaults(entity);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        RelationshipEntity saved = relationshipRepository.save(entity);
        if (TYPE_SPOUSE.equals(saved.getRelationType())) {
            ensureReverseSpouse(saved, now);
        }
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
        String oldType = entity.getRelationType();
        entity.setRelationType(normalizeType(request.relationType()));
        entity.setRelationLabel(normalizeLabel(request.relationLabel(), entity.getRelationType(), entity.getFromPersonId()));
        entity.setIsLineageRelation(request.isLineageRelation());
        entity.setIsBiological(request.isBiological());
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(request.description());
        entity.setConfidenceLevel(request.confidenceLevel());
        entity.setDataStatus(request.dataStatus() == null ? entity.getDataStatus() : request.dataStatus());
        validateRelationshipRules(entity.getClanId(), entity.getFromPersonId(), entity.getToPersonId(), entity.getRelationType(), entity.getRelationLabel(), entity.getId());
        entity.setUpdatedAt(LocalDateTime.now());
        RelationshipEntity saved = relationshipRepository.save(entity);
        if (TYPE_SPOUSE.equals(saved.getRelationType()) && !TYPE_SPOUSE.equals(oldType)) {
            ensureReverseSpouse(saved, saved.getUpdatedAt());
        }
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
        String relationType = normalizeType(request.relationType());
        String relationLabel = normalizeLabel(request.relationLabel(), relationType, request.fromPersonId());
        validateGenerationOrder(from, to, relationType);
        validateRelationshipRules(clanId, request.fromPersonId(), request.toPersonId(), relationType, relationLabel, null);
    }

    private void validateRelationshipRules(Long clanId, Long fromPersonId, Long toPersonId, String relationType, String relationLabel, Long currentId) {
        if (hasSameRelation(clanId, fromPersonId, toPersonId, relationType, currentId)) {
            throw new BusinessException("RELATIONSHIP_DUPLICATED", "相同人物关系已存在");
        }
        if (TYPE_SPOUSE.equals(relationType)) {
            if (hasSameRelation(clanId, toPersonId, fromPersonId, relationType, currentId)) {
                throw new BusinessException("RELATIONSHIP_SPOUSE_DUPLICATED", "配偶关系已存在");
            }
            return;
        }
        if (TYPE_PARENT_CHILD.equals(relationType) && (LABEL_FATHER.equals(relationLabel) || LABEL_MOTHER.equals(relationLabel))) {
            long count = relationshipRepository.findActiveToRelations(clanId, toPersonId, TYPE_PARENT_CHILD).stream()
                    .filter(item -> currentId == null || !item.getId().equals(currentId))
                    .filter(item -> relationLabel.equals(item.getRelationLabel()))
                    .count();
            if (count > 0) {
                throw new BusinessException("RELATIONSHIP_PARENT_DUPLICATED", "父亲或母亲关系已存在");
            }
        }
    }

    private boolean hasSameRelation(Long clanId, Long fromPersonId, Long toPersonId, String relationType, Long currentId) {
        return relationshipRepository.findActiveSameRelation(clanId, fromPersonId, toPersonId, relationType).stream()
                .anyMatch(item -> currentId == null || !item.getId().equals(currentId));
    }

    private void validateGenerationOrder(PersonEntity from, PersonEntity to, String relationType) {
        if (!TYPE_PARENT_CHILD.equals(relationType) && !TYPE_ADOPTIVE.equals(relationType)) {
            return;
        }
        if (from.getGenerationNo() != null && to.getGenerationNo() != null && from.getGenerationNo() >= to.getGenerationNo()) {
            throw new BusinessException("RELATIONSHIP_GENERATION_CONFLICT", "亲子关系中父辈代次必须小于子辈代次");
        }
    }

    private RelationshipCreateRequest normalizeRequest(RelationshipCreateRequest request) {
        String relationType = normalizeType(request.relationType());
        return new RelationshipCreateRequest(
                request.fromPersonId(), request.toPersonId(), relationType,
                normalizeLabel(request.relationLabel(), relationType, request.fromPersonId()),
                request.isLineageRelation(), request.isBiological(), request.isPrimary(), request.description(), request.confidenceLevel()
        );
    }

    private String normalizeType(String relationType) {
        if (relationType == null || relationType.isBlank()) {
            throw new BusinessException("RELATIONSHIP_TYPE_REQUIRED", "关系类型不能为空");
        }
        return relationType.trim().toLowerCase();
    }

    private String normalizeLabel(String relationLabel, String relationType, Long fromPersonId) {
        if (relationLabel != null && !relationLabel.isBlank()) {
            return relationLabel.trim().toLowerCase();
        }
        if (TYPE_PARENT_CHILD.equals(relationType)) {
            PersonEntity from = getActivePerson(fromPersonId);
            if ("female".equalsIgnoreCase(from.getGender())) {
                return LABEL_MOTHER;
            }
            if ("male".equalsIgnoreCase(from.getGender())) {
                return LABEL_FATHER;
            }
            return "parent";
        }
        return relationLabel;
    }

    private void ensureReverseSpouse(RelationshipEntity saved, LocalDateTime now) {
        if (hasSameRelation(saved.getClanId(), saved.getToPersonId(), saved.getFromPersonId(), TYPE_SPOUSE, null)) {
            return;
        }
        RelationshipEntity reverse = new RelationshipEntity();
        reverse.setClanId(saved.getClanId());
        reverse.setFromPersonId(saved.getToPersonId());
        reverse.setToPersonId(saved.getFromPersonId());
        reverse.setRelationType(TYPE_SPOUSE);
        reverse.setRelationLabel(saved.getRelationLabel());
        reverse.setIsLineageRelation(false);
        reverse.setIsBiological(false);
        reverse.setIsPrimary(false);
        reverse.setConfidenceLevel(saved.getConfidenceLevel());
        reverse.setDataStatus(saved.getDataStatus());
        reverse.setDescription("自动生成的反向配偶关系");
        reverse.setCreatedAt(now);
        reverse.setUpdatedAt(now);
        relationshipRepository.save(reverse);
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
