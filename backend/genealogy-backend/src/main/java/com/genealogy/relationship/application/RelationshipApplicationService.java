package com.genealogy.relationship.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.dto.RelationshipConflictCheckResponse;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
import com.genealogy.relationship.dto.RelationshipUpdateRequest;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.mapper.RelationshipMapper;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class RelationshipApplicationService {

    private static final String TYPE_PARENT_CHILD = "parent_child";
    private static final String TYPE_SPOUSE = "spouse";
    private static final String TYPE_ADOPTIVE = "adoptive";
    private static final String TYPE_SUCCESSOR = "successor";
    private static final String TYPE_OUT_ADOPTION = "out_adoption";

    private static final String LABEL_FATHER = "father";
    private static final String LABEL_MOTHER = "mother";
    private static final String LABEL_PARENT = "parent";
    private static final String LABEL_SPOUSE = "spouse";
    private static final String LABEL_ADOPTIVE_FATHER = "adoptive_father";
    private static final String LABEL_ADOPTIVE_MOTHER = "adoptive_mother";
    private static final String LABEL_ADOPTIVE_PARENT = "adoptive_parent";
    private static final String LABEL_HEIR_SUCCESSOR = "heir_successor";
    private static final String LABEL_OUT_ADOPTED = "out_adopted";

    private static final String PRIVACY_PUBLIC = "public";
    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String PRIVACY_BRANCH_ONLY = "branch_only";
    private static final String PRIVACY_RELATIVES_ONLY = "relatives_only";
    private static final String PRIVACY_PRIVATE = "private";
    private static final String PRIVACY_SEALED = "sealed";
    private static final String DEFAULT_PRIVACY_LEVEL = "clan_only";
    private static final String DEFAULT_LIVING_PRIVACY_LEVEL = "branch_only";

    private static final String RELATIONSHIP_VIEW = "relationship:view";
    private static final String RELATIONSHIP_CREATE = "relationship:create";
    private static final String RELATIONSHIP_UPDATE = "relationship:update";
    private static final String RELATIONSHIP_DELETE = "relationship:delete";
    private static final String RELATIONSHIP_CHECK_CONFLICT = "relationship:check_conflict";
    private static final String PERSON_VIEW = "person:view";
    private static final String PERSON_UPDATE = "person:update";
    private static final String PERSON_DELETE = "person:delete";

    private static final Set<String> ALLOWED_RELATION_TYPES = Set.of(
            TYPE_PARENT_CHILD, TYPE_SPOUSE, TYPE_ADOPTIVE, TYPE_SUCCESSOR, TYPE_OUT_ADOPTION
    );

    private final RelationshipRepository relationshipRepository;
    private final PersonRepository personRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public RelationshipApplicationService(RelationshipRepository relationshipRepository, PersonRepository personRepository, AuthorizationApplicationService authorizationApplicationService, OperationLogApplicationService operationLogApplicationService) {
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
        requireRelationshipBranchPermission(clanId, actorId, request.fromPersonId(), request.toPersonId(), RELATIONSHIP_CREATE);
        RelationshipCreateRequest normalizedRequest = normalizeRequest(request);
        validateCreate(clanId, normalizedRequest);
        RelationshipEntity entity = RelationshipMapper.toEntity(clanId, normalizedRequest);
        applyDefaults(entity);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        RelationshipEntity saved = relationshipRepository.save(entity);
        if (TYPE_SPOUSE.equals(saved.getRelationType())) {
            ensureReverseSpouse(saved, now);
        }
        operationLogApplicationService.record(clanId, actorId, "relationship_create", "relationship", saved.getId(), "create relationship", null);
        return RelationshipMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public RelationshipConflictCheckResponse checkConflict(Long clanId, RelationshipCreateRequest request, Long actorId) {
        try {
            requireRelationshipBranchPermission(clanId, actorId, request.fromPersonId(), request.toPersonId(), RELATIONSHIP_CHECK_CONFLICT);
            validateCreate(clanId, normalizeRequest(request));
            return RelationshipConflictCheckResponse.passed();
        } catch (BusinessException ex) {
            return RelationshipConflictCheckResponse.failed(ex.getCode(), ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public RelationshipResponse get(Long id) {
        return RelationshipMapper.toResponse(getActiveEntity(id));
    }

    @Transactional(readOnly = true)
    public RelationshipResponse get(Long id, Long actorId) {
        RelationshipEntity entity = getActiveEntity(id);
        PersonEntity from = getActivePerson(entity.getFromPersonId());
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, from.getBranchId(), RELATIONSHIP_VIEW);
        if (!canExposeRelationship(entity, actorId)) {
            throw new BusinessException("RELATIONSHIP_PRIVACY_FORBIDDEN", "该亲属关系涉及受保护人物，当前用户无权查看");
        }
        return RelationshipMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<RelationshipResponse> listByPerson(Long personId) {
        ensurePersonExists(personId);
        return listActiveRelationships(personId).stream().map(RelationshipMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RelationshipResponse> listByPerson(Long personId, Long actorId) {
        PersonEntity person = getActivePerson(personId);
        authorizationApplicationService.requireBranchPermission(person.getClanId(), actorId, person.getBranchId(), RELATIONSHIP_VIEW);
        return listActiveRelationships(personId).stream()
                .filter(relationship -> canExposeRelationship(relationship, actorId))
                .map(RelationshipMapper::toResponse)
                .toList();
    }

    @Transactional
    public RelationshipResponse update(Long id, RelationshipUpdateRequest request) {
        return update(id, request, null);
    }

    @Transactional
    public RelationshipResponse update(Long id, RelationshipUpdateRequest request, Long actorId) {
        RelationshipEntity entity = getActiveEntity(id);
        requireRelationshipBranchPermission(entity.getClanId(), actorId, entity.getFromPersonId(), entity.getToPersonId(), RELATIONSHIP_UPDATE);
        String oldType = entity.getRelationType();
        String relationType = normalizeType(request.relationType());
        String relationLabel = normalizeLabel(request.relationLabel(), relationType, entity.getFromPersonId());
        entity.setRelationType(relationType);
        entity.setRelationLabel(relationLabel);
        entity.setIsLineageRelation(normalizeLineageRelation(relationType, request.isLineageRelation()));
        entity.setIsBiological(normalizeBiological(relationType, request.isBiological()));
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(request.description());
        entity.setConfidenceLevel(request.confidenceLevel());
        entity.setDataStatus(request.dataStatus() == null ? entity.getDataStatus() : request.dataStatus());
        PersonEntity from = getActivePerson(entity.getFromPersonId());
        PersonEntity to = getActivePerson(entity.getToPersonId());
        validateGenerationOrder(from, to, relationType);
        validateRelationshipRules(entity.getClanId(), entity.getFromPersonId(), entity.getToPersonId(), relationType, relationLabel, entity.getId());
        entity.setUpdatedAt(LocalDateTime.now());
        RelationshipEntity saved = relationshipRepository.save(entity);
        if (TYPE_SPOUSE.equals(saved.getRelationType()) && !TYPE_SPOUSE.equals(oldType)) {
            ensureReverseSpouse(saved, saved.getUpdatedAt());
        }
        operationLogApplicationService.record(saved.getClanId(), actorId, "relationship_update", "relationship", saved.getId(), "update relationship", null);
        return RelationshipMapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        delete(id, null);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        RelationshipEntity entity = getActiveEntity(id);
        requireRelationshipBranchPermission(entity.getClanId(), actorId, entity.getFromPersonId(), entity.getToPersonId(), RELATIONSHIP_DELETE);
        LocalDateTime now = LocalDateTime.now();
        entity.setDeletedAt(now);
        entity.setUpdatedAt(now);
        relationshipRepository.save(entity);
        if (TYPE_SPOUSE.equals(entity.getRelationType())) {
            softDeleteReverseSpouse(entity, now);
        }
        operationLogApplicationService.record(entity.getClanId(), actorId, "relationship_delete", "relationship", entity.getId(), "delete relationship", null);
    }

    private List<RelationshipEntity> listActiveRelationships(Long personId) {
        List<RelationshipEntity> relationships = new ArrayList<>();
        relationships.addAll(relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(personId));
        relationships.addAll(relationshipRepository.findByToPersonIdAndDeletedAtIsNull(personId));
        return relationships;
    }

    private boolean canExposeRelationship(RelationshipEntity relationship, Long actorId) {
        if (!isSensitiveFamilyRelation(relationship)) {
            return true;
        }
        PersonEntity from = getActivePerson(relationship.getFromPersonId());
        PersonEntity to = getActivePerson(relationship.getToPersonId());
        return canViewFamilyRelationForPerson(from, actorId) && canViewFamilyRelationForPerson(to, actorId);
    }

    private boolean isSensitiveFamilyRelation(RelationshipEntity relationship) {
        return TYPE_SPOUSE.equals(relationship.getRelationType())
                || TYPE_PARENT_CHILD.equals(relationship.getRelationType())
                || TYPE_ADOPTIVE.equals(relationship.getRelationType())
                || TYPE_SUCCESSOR.equals(relationship.getRelationType());
    }

    private boolean canViewFamilyRelationForPerson(PersonEntity person, Long actorId) {
        String privacyLevel = normalizePrivacyLevel(person);
        if (PRIVACY_PUBLIC.equals(privacyLevel)) {
            return true;
        }
        if (actorOwnsRecord(person, actorId)) {
            return true;
        }
        if (PRIVACY_SEALED.equals(privacyLevel)) {
            return authorizationApplicationService.can(person.getClanId(), actorId, PERSON_DELETE);
        }
        if (PRIVACY_PRIVATE.equals(privacyLevel) || PRIVACY_RELATIVES_ONLY.equals(privacyLevel)) {
            return authorizationApplicationService.can(person.getClanId(), actorId, PERSON_UPDATE);
        }
        if (PRIVACY_BRANCH_ONLY.equals(privacyLevel)) {
            try {
                authorizationApplicationService.requireBranchPermission(person.getClanId(), actorId, person.getBranchId(), PERSON_VIEW);
                return true;
            } catch (BusinessException ignored) {
                return false;
            }
        }
        return PRIVACY_CLAN_ONLY.equals(privacyLevel) && authorizationApplicationService.isActiveClanMember(person.getClanId(), actorId);
    }

    private String normalizePrivacyLevel(PersonEntity person) {
        String privacyLevel = person.getPrivacyLevel();
        if (privacyLevel == null || privacyLevel.isBlank()) {
            return Boolean.TRUE.equals(person.getIsLiving()) ? DEFAULT_LIVING_PRIVACY_LEVEL : DEFAULT_PRIVACY_LEVEL;
        }
        return privacyLevel.trim().toLowerCase(Locale.ROOT);
    }

    private boolean actorOwnsRecord(PersonEntity person, Long actorId) {
        return actorId != null && (actorId.equals(person.getCreatedBy()) || actorId.equals(person.getUpdatedBy()));
    }

    private void requireRelationshipBranchPermission(Long clanId, Long actorId, Long fromPersonId, Long toPersonId, String permissionCode) {
        PersonEntity from = getActivePerson(fromPersonId);
        PersonEntity to = getActivePerson(toPersonId);
        if (!from.getClanId().equals(clanId) || !to.getClanId().equals(clanId)) {
            throw new BusinessException("RELATIONSHIP_CLAN_MISMATCH", "persons must belong to the clan");
        }
        authorizationApplicationService.requireBranchPermission(clanId, actorId, from.getBranchId(), permissionCode);
        authorizationApplicationService.requireBranchPermission(clanId, actorId, to.getBranchId(), permissionCode);
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
            throw new BusinessException("RELATIONSHIP_DUPLICATED", "same relationship already exists");
        }
        if (TYPE_SPOUSE.equals(relationType)) {
            if (hasSameRelation(clanId, toPersonId, fromPersonId, relationType, currentId)) {
                throw new BusinessException("RELATIONSHIP_SPOUSE_DUPLICATED", "spouse relationship already exists");
            }
            return;
        }
        if (isLineageType(relationType)) {
            validateNoAncestryCycle(clanId, fromPersonId, toPersonId, currentId);
        }
        if (TYPE_PARENT_CHILD.equals(relationType) && isPrimaryParentLabel(relationLabel)) {
            validateUniqueParentByLabel(clanId, toPersonId, TYPE_PARENT_CHILD, relationLabel, currentId, "parent relationship already exists");
        }
        if (TYPE_ADOPTIVE.equals(relationType) && isAdoptiveParentLabel(relationLabel)) {
            validateUniqueParentByLabel(clanId, toPersonId, TYPE_ADOPTIVE, relationLabel, currentId, "adoptive parent relationship already exists");
        }
    }

    private void validateUniqueParentByLabel(Long clanId, Long toPersonId, String relationType, String relationLabel, Long currentId, String message) {
        long count = relationshipRepository.findActiveToRelations(clanId, toPersonId, relationType).stream()
                .filter(item -> currentId == null || !item.getId().equals(currentId))
                .filter(item -> relationLabel.equals(item.getRelationLabel()))
                .count();
        if (count > 0) {
            throw new BusinessException("RELATIONSHIP_PARENT_DUPLICATED", message);
        }
    }

    private boolean hasSameRelation(Long clanId, Long fromPersonId, Long toPersonId, String relationType, Long currentId) {
        return relationshipRepository.findActiveSameRelation(clanId, fromPersonId, toPersonId, relationType).stream()
                .anyMatch(item -> currentId == null || !item.getId().equals(currentId));
    }

    private void validateGenerationOrder(PersonEntity from, PersonEntity to, String relationType) {
        if (!isLineageType(relationType)) {
            return;
        }
        if (from.getGenerationNo() != null && to.getGenerationNo() != null && from.getGenerationNo() >= to.getGenerationNo()) {
            throw new BusinessException("RELATIONSHIP_GENERATION_CONFLICT", "ancestor generation must be before descendant generation");
        }
    }

    private void validateNoAncestryCycle(Long clanId, Long parentId, Long childId, Long currentId) {
        Deque<Long> queue = new ArrayDeque<>();
        Set<Long> visited = new HashSet<>();
        queue.add(childId);
        while (!queue.isEmpty()) {
            Long current = queue.removeFirst();
            if (!visited.add(current)) {
                continue;
            }
            if (current.equals(parentId)) {
                throw new BusinessException("RELATIONSHIP_CYCLE_DETECTED", "relationship cycle detected");
            }
            relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(current).stream()
                    .filter(item -> currentId == null || !item.getId().equals(currentId))
                    .filter(item -> clanId.equals(item.getClanId()))
                    .filter(item -> isLineageType(item.getRelationType()))
                    .map(RelationshipEntity::getToPersonId)
                    .forEach(queue::addLast);
        }
    }

    private boolean isLineageType(String relationType) {
        return TYPE_PARENT_CHILD.equals(relationType) || TYPE_ADOPTIVE.equals(relationType) || TYPE_SUCCESSOR.equals(relationType);
    }

    private RelationshipCreateRequest normalizeRequest(RelationshipCreateRequest request) {
        String relationType = normalizeType(request.relationType());
        return new RelationshipCreateRequest(
                request.fromPersonId(), request.toPersonId(), relationType,
                normalizeLabel(request.relationLabel(), relationType, request.fromPersonId()),
                normalizeLineageRelation(relationType, request.isLineageRelation()),
                normalizeBiological(relationType, request.isBiological()),
                request.isPrimary(), request.description(), request.confidenceLevel()
        );
    }

    private String normalizeType(String relationType) {
        if (relationType == null || relationType.isBlank()) {
            throw new BusinessException("RELATIONSHIP_TYPE_REQUIRED", "relationship type is required");
        }
        String normalized = relationType.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        if (!ALLOWED_RELATION_TYPES.contains(normalized)) {
            throw new BusinessException("RELATIONSHIP_TYPE_UNSUPPORTED", "unsupported relationship type: " + relationType);
        }
        return normalized;
    }

    private String normalizeLabel(String relationLabel, String relationType, Long fromPersonId) {
        String normalized = normalizeLabelText(relationLabel);
        if (TYPE_PARENT_CHILD.equals(relationType)) {
            return normalized == null ? defaultParentLabel(fromPersonId) : normalizeParentLabel(normalized);
        }
        if (TYPE_SPOUSE.equals(relationType)) {
            return normalized == null ? LABEL_SPOUSE : normalized;
        }
        if (TYPE_ADOPTIVE.equals(relationType)) {
            return normalized == null ? defaultAdoptiveLabel(fromPersonId) : normalizeAdoptiveLabel(normalized);
        }
        if (TYPE_SUCCESSOR.equals(relationType)) {
            return normalized == null ? LABEL_HEIR_SUCCESSOR : normalizeSuccessorLabel(normalized);
        }
        if (TYPE_OUT_ADOPTION.equals(relationType)) {
            return normalized == null ? LABEL_OUT_ADOPTED : normalizeOutAdoptionLabel(normalized);
        }
        return normalized;
    }

    private String normalizeLabelText(String relationLabel) {
        if (relationLabel == null || relationLabel.isBlank()) {
            return null;
        }
        return relationLabel.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private String defaultParentLabel(Long fromPersonId) {
        PersonEntity from = getActivePerson(fromPersonId);
        if ("female".equalsIgnoreCase(from.getGender())) {
            return LABEL_MOTHER;
        }
        if ("male".equalsIgnoreCase(from.getGender())) {
            return LABEL_FATHER;
        }
        return LABEL_PARENT;
    }

    private String defaultAdoptiveLabel(Long fromPersonId) {
        PersonEntity from = getActivePerson(fromPersonId);
        if ("female".equalsIgnoreCase(from.getGender())) {
            return LABEL_ADOPTIVE_MOTHER;
        }
        if ("male".equalsIgnoreCase(from.getGender())) {
            return LABEL_ADOPTIVE_FATHER;
        }
        return LABEL_ADOPTIVE_PARENT;
    }

    private String normalizeParentLabel(String label) {
        return switch (label) {
            case "father" -> LABEL_FATHER;
            case "mother" -> LABEL_MOTHER;
            case "parent" -> LABEL_PARENT;
            default -> label;
        };
    }

    private String normalizeAdoptiveLabel(String label) {
        return switch (label) {
            case "adoptive_father" -> LABEL_ADOPTIVE_FATHER;
            case "adoptive_mother" -> LABEL_ADOPTIVE_MOTHER;
            case "adoptive_parent", "adoptive_child" -> LABEL_ADOPTIVE_PARENT;
            default -> label;
        };
    }

    private String normalizeSuccessorLabel(String label) {
        return switch (label) {
            case "successor", "heir", "heir_successor" -> LABEL_HEIR_SUCCESSOR;
            default -> label;
        };
    }

    private String normalizeOutAdoptionLabel(String label) {
        return switch (label) {
            case "out_adoption", "out_adopted" -> LABEL_OUT_ADOPTED;
            default -> label;
        };
    }

    private Boolean normalizeLineageRelation(String relationType, Boolean value) {
        if (value != null) {
            return value;
        }
        return isLineageType(relationType);
    }

    private Boolean normalizeBiological(String relationType, Boolean value) {
        if (TYPE_ADOPTIVE.equals(relationType) || TYPE_SUCCESSOR.equals(relationType) || TYPE_OUT_ADOPTION.equals(relationType)) {
            return false;
        }
        return value;
    }

    private boolean isPrimaryParentLabel(String label) {
        return LABEL_FATHER.equals(label) || LABEL_MOTHER.equals(label);
    }

    private boolean isAdoptiveParentLabel(String label) {
        return LABEL_ADOPTIVE_FATHER.equals(label) || LABEL_ADOPTIVE_MOTHER.equals(label);
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
        reverse.setDescription("auto reverse spouse relationship");
        reverse.setConfidenceLevel(saved.getConfidenceLevel());
        reverse.setDataStatus(saved.getDataStatus());
        reverse.setDescription("auto reverse spouse relationship");
        reverse.setCreatedAt(now);
        reverse.setUpdatedAt(now);
        relationshipRepository.save(reverse);
    }

    private void softDeleteReverseSpouse(RelationshipEntity deleted, LocalDateTime now) {
        relationshipRepository.findActiveSameRelation(deleted.getClanId(), deleted.getToPersonId(), deleted.getFromPersonId(), TYPE_SPOUSE)
                .forEach(reverse -> {
                    reverse.setDeletedAt(now);
                    reverse.setUpdatedAt(now);
                    relationshipRepository.save(reverse);
                });
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
