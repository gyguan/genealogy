package com.genealogy.relationship.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.domain.ApprovedStatusPolicy;
import com.genealogy.common.domain.DraftDeletePolicy;
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
    private static final String TYPE_IN_ADOPTION = "in_adoption";
    private static final String TYPE_DUAL_SUCCESSOR = "dual_successor";
    private static final String TYPE_HEIR_SON = "heir_son";
    private static final String TYPE_NO_DESCENDANT = "no_descendant";

    private static final String CATEGORY_BLOOD = "blood";
    private static final String CATEGORY_RITUAL = "ritual";
    private static final String CATEGORY_MARRIAGE = "marriage";
    private static final String CATEGORY_STATUS = "status";

    private static final String LABEL_FATHER = "father";
    private static final String LABEL_MOTHER = "mother";
    private static final String LABEL_PARENT = "parent";
    private static final String LABEL_BIOLOGICAL_FATHER = "biological_father";
    private static final String LABEL_BIOLOGICAL_MOTHER = "biological_mother";
    private static final String LABEL_BIOLOGICAL_PARENT = "biological_parent";
    private static final String LABEL_LEGAL_FATHER = "legal_father";
    private static final String LABEL_LEGAL_MOTHER = "legal_mother";
    private static final String LABEL_LEGAL_PARENT = "legal_parent";
    private static final String LABEL_SPOUSE = "spouse";
    private static final String LABEL_SECOND_SPOUSE = "second_spouse";
    private static final String LABEL_CONCUBINE = "concubine";
    private static final String LABEL_ADOPTIVE_FATHER = "adoptive_father";
    private static final String LABEL_ADOPTIVE_MOTHER = "adoptive_mother";
    private static final String LABEL_ADOPTIVE_PARENT = "adoptive_parent";
    private static final String LABEL_HEIR_SUCCESSOR = "heir_successor";
    private static final String LABEL_DUAL_SUCCESSOR = "dual_successor";
    private static final String LABEL_HEIR_SON = "heir_son";
    private static final String LABEL_IN_ADOPTED = "in_adopted";
    private static final String LABEL_OUT_ADOPTED = "out_adopted";
    private static final String LABEL_NO_DESCENDANT = "no_descendant";

    private static final String PRIVACY_PUBLIC = "public";
    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String PRIVACY_BRANCH_ONLY = "branch_only";
    private static final String PRIVACY_RELATIVES_ONLY = "relatives_only";
    private static final String PRIVACY_PRIVATE = "private";
    private static final String PRIVACY_SEALED = "sealed";
    private static final String DEFAULT_PRIVACY_LEVEL = "clan_only";
    private static final String DEFAULT_LIVING_PRIVACY_LEVEL = "branch_only";
    private static final String RELATIONSHIP_STATUS_OFFICIAL = "official";

    private static final String RELATIONSHIP_VIEW = "relationship:view";
    private static final String RELATIONSHIP_CREATE = "relationship:create";
    private static final String RELATIONSHIP_UPDATE = "relationship:update";
    private static final String RELATIONSHIP_DELETE = "relationship:delete";
    private static final String RELATIONSHIP_CHECK_CONFLICT = "relationship:check_conflict";
    private static final String PERSON_VIEW = "person:view";
    private static final String PERSON_UPDATE = "person:update";
    private static final String PERSON_DELETE = "person:delete";
    private static final String REVIEW_APPROVE = "review_task:approve";

    private static final Set<String> ALLOWED_RELATION_TYPES = Set.of(
            TYPE_PARENT_CHILD, TYPE_SPOUSE, TYPE_ADOPTIVE, TYPE_SUCCESSOR, TYPE_OUT_ADOPTION,
            TYPE_IN_ADOPTION, TYPE_DUAL_SUCCESSOR, TYPE_HEIR_SON, TYPE_NO_DESCENDANT
    );

    private static final Set<String> ALLOWED_RELATION_CATEGORIES = Set.of(
            CATEGORY_BLOOD, CATEGORY_RITUAL, CATEGORY_MARRIAGE, CATEGORY_STATUS
    );

    private final RelationshipRepository relationshipRepository;
    private final PersonRepository personRepository;
    private final BranchRepository branchRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public RelationshipApplicationService(
            RelationshipRepository relationshipRepository,
            PersonRepository personRepository,
            BranchRepository branchRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.relationshipRepository = relationshipRepository;
        this.personRepository = personRepository;
        this.branchRepository = branchRepository;
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
        entity.setCreatedBy(actorId);
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
        requireReviewForOfficialRelationship(entity, actorId);
        String oldType = entity.getRelationType();
        String relationType = normalizeType(request.relationType());
        String relationLabel = normalizeLabel(request.relationLabel(), relationType, entity.getFromPersonId());
        String relationCategory = normalizeCategory(request.relationCategory(), relationType);
        String ritualRelationType = normalizeRitualRelationType(request.ritualRelationType(), relationType, relationCategory);
        validateSuccessorBranch(entity.getClanId(), request.successorBranchId());
        entity.setRelationType(relationType);
        entity.setRelationLabel(relationLabel);
        entity.setRelationCategory(relationCategory);
        entity.setRitualRelationType(ritualRelationType);
        entity.setSuccessionReason(trimToNull(request.successionReason()));
        entity.setSuccessorBranchId(request.successorBranchId());
        entity.setIsLineageRelation(normalizeLineageRelation(relationType, request.isLineageRelation()));
        entity.setIsBiological(normalizeBiological(relationType, relationCategory, request.isBiological()));
        entity.setIsPrimary(request.isPrimary());
        entity.setDescription(trimToNull(request.description()));
        entity.setConfidenceLevel(trimToNull(request.confidenceLevel()));
        entity.setDataStatus(request.dataStatus() == null ? entity.getDataStatus() : request.dataStatus());
        PersonEntity from = getActivePerson(entity.getFromPersonId());
        PersonEntity to = getActivePerson(entity.getToPersonId());
        ApprovedStatusPolicy.requireApproved(from.getDataStatus(), "RELATIONSHIP_PERSON_NOT_OFFICIAL", "关系两端人物审核通过后才能编辑关系");
        ApprovedStatusPolicy.requireApproved(to.getDataStatus(), "RELATIONSHIP_PERSON_NOT_OFFICIAL", "关系两端人物审核通过后才能编辑关系");
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
        DraftDeletePolicy.requireDraft(
                entity.getDataStatus(),
                "RELATIONSHIP_DELETE_DRAFT_ONLY",
                "仅草稿关系可直接删除"
        );
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
                || isRitualType(relationship.getRelationType());
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

    private void requireReviewForOfficialRelationship(RelationshipEntity entity, Long actorId) {
        if (!RELATIONSHIP_STATUS_OFFICIAL.equals(entity.getDataStatus())) {
            return;
        }
        if (authorizationApplicationService.can(entity.getClanId(), actorId, REVIEW_APPROVE)) {
            return;
        }
        throw new BusinessException("RELATIONSHIP_OFFICIAL_REVIEW_REQUIRED", "正式关系变更需先提交审核");
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
        String relationType = normalizeType(request.relationType());
        if (request.fromPersonId().equals(request.toPersonId()) && !TYPE_NO_DESCENDANT.equals(relationType)) {
            throw new BusinessException(ErrorCode.SELF_RELATION_NOT_ALLOWED);
        }
        PersonEntity from = getActivePerson(request.fromPersonId());
        PersonEntity to = getActivePerson(request.toPersonId());
        if (!from.getClanId().equals(clanId) || !to.getClanId().equals(clanId)) {
            throw new BusinessException("RELATIONSHIP_CLAN_MISMATCH", "persons must belong to the clan");
        }
        ApprovedStatusPolicy.requireApproved(from.getDataStatus(), "RELATIONSHIP_PERSON_NOT_OFFICIAL", "关系两端人物审核通过后才能建立关系");
        ApprovedStatusPolicy.requireApproved(to.getDataStatus(), "RELATIONSHIP_PERSON_NOT_OFFICIAL", "关系两端人物审核通过后才能建立关系");
        String relationLabel = normalizeLabel(request.relationLabel(), relationType, request.fromPersonId());
        validateGenerationOrder(from, to, relationType);
        validateSuccessorBranch(clanId, request.successorBranchId());
        validateRelationshipRules(clanId, request.fromPersonId(), request.toPersonId(), relationType, relationLabel, null);
    }

    private void validateRelationshipRules(Long clanId, Long fromPersonId, Long toPersonId, String relationType, String relationLabel, Long currentId) {
        if (hasSameRelation(clanId, fromPersonId, toPersonId, relationType, currentId)) {
            throw new BusinessException("RELATIONSHIP_DUPLICATED", "same relationship already exists");
        }
        if (TYPE_NO_DESCENDANT.equals(relationType)) {
            return;
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
        if (TYPE_PARENT_CHILD.equals(relationType) && isBiologicalParentLabel(relationLabel)) {
            validateUniqueParentByLabel(clanId, toPersonId, TYPE_PARENT_CHILD, relationLabel, currentId, "biological parent relationship already exists");
        }
        if ((TYPE_ADOPTIVE.equals(relationType) || TYPE_IN_ADOPTION.equals(relationType) || TYPE_SUCCESSOR.equals(relationType)) && isLegalParentLabel(relationLabel)) {
            validateUniqueParentByLabel(clanId, toPersonId, relationType, relationLabel, currentId, "legal parent relationship already exists");
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
        if (!isLineageType(relationType) || TYPE_OUT_ADOPTION.equals(relationType) || TYPE_NO_DESCENDANT.equals(relationType)) {
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
        return TYPE_PARENT_CHILD.equals(relationType)
                || TYPE_ADOPTIVE.equals(relationType)
                || TYPE_SUCCESSOR.equals(relationType)
                || TYPE_IN_ADOPTION.equals(relationType)
                || TYPE_OUT_ADOPTION.equals(relationType)
                || TYPE_DUAL_SUCCESSOR.equals(relationType)
                || TYPE_HEIR_SON.equals(relationType);
    }

    private boolean isRitualType(String relationType) {
        return TYPE_ADOPTIVE.equals(relationType)
                || TYPE_SUCCESSOR.equals(relationType)
                || TYPE_OUT_ADOPTION.equals(relationType)
                || TYPE_IN_ADOPTION.equals(relationType)
                || TYPE_DUAL_SUCCESSOR.equals(relationType)
                || TYPE_HEIR_SON.equals(relationType)
                || TYPE_NO_DESCENDANT.equals(relationType);
    }

    private RelationshipCreateRequest normalizeRequest(RelationshipCreateRequest request) {
        String relationType = normalizeType(request.relationType());
        String relationCategory = normalizeCategory(request.relationCategory(), relationType);
        String ritualRelationType = normalizeRitualRelationType(request.ritualRelationType(), relationType, relationCategory);
        return new RelationshipCreateRequest(
                request.fromPersonId(), request.toPersonId(), relationType,
                normalizeLabel(request.relationLabel(), relationType, request.fromPersonId()),
                relationCategory,
                ritualRelationType,
                trimToNull(request.successionReason()),
                request.successorBranchId(),
                normalizeLineageRelation(relationType, request.isLineageRelation()),
                normalizeBiological(relationType, relationCategory, request.isBiological()),
                request.isPrimary(), trimToNull(request.description()), trimToNull(request.confidenceLevel())
        );
    }

    private String normalizeType(String relationType) {
        if (relationType == null || relationType.isBlank()) {
            throw new BusinessException("RELATIONSHIP_TYPE_REQUIRED", "relationship type is required");
        }
        String normalized = relationType.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        normalized = switch (normalized) {
            case "继嗣", "入继" -> TYPE_IN_ADOPTION;
            case "出继", "出嗣" -> TYPE_OUT_ADOPTION;
            case "承祧" -> TYPE_SUCCESSOR;
            case "兼祧" -> TYPE_DUAL_SUCCESSOR;
            case "嗣子" -> TYPE_HEIR_SON;
            case "无嗣" -> TYPE_NO_DESCENDANT;
            case "继配", "侧室" -> TYPE_SPOUSE;
            default -> normalized;
        };
        if (!ALLOWED_RELATION_TYPES.contains(normalized)) {
            throw new BusinessException("RELATIONSHIP_TYPE_UNSUPPORTED", "unsupported relationship type: " + relationType);
        }
        return normalized;
    }

    private String normalizeCategory(String relationCategory, String relationType) {
        String normalized = normalizeLabelText(relationCategory);
        if (normalized == null) {
            if (TYPE_PARENT_CHILD.equals(relationType)) {
                return CATEGORY_BLOOD;
            }
            if (TYPE_SPOUSE.equals(relationType)) {
                return CATEGORY_MARRIAGE;
            }
            if (TYPE_NO_DESCENDANT.equals(relationType)) {
                return CATEGORY_STATUS;
            }
            return CATEGORY_RITUAL;
        }
        normalized = switch (normalized) {
            case "血缘", "blood_relation" -> CATEGORY_BLOOD;
            case "礼法", "宗法", "承嗣", "ritual_relation", "succession" -> CATEGORY_RITUAL;
            case "婚配", "marital", "marriage_relation" -> CATEGORY_MARRIAGE;
            case "状态", "status_marker" -> CATEGORY_STATUS;
            default -> normalized;
        };
        if (!ALLOWED_RELATION_CATEGORIES.contains(normalized)) {
            throw new BusinessException("RELATIONSHIP_CATEGORY_UNSUPPORTED", "unsupported relationship category: " + relationCategory);
        }
        return normalized;
    }

    private String normalizeRitualRelationType(String ritualRelationType, String relationType, String relationCategory) {
        String normalized = normalizeLabelText(ritualRelationType);
        if (!CATEGORY_RITUAL.equals(relationCategory) && !CATEGORY_STATUS.equals(relationCategory)) {
            return normalized;
        }
        if (normalized == null) {
            return relationType;
        }
        return switch (normalized) {
            case "入继", "继嗣" -> TYPE_IN_ADOPTION;
            case "出继", "出嗣" -> TYPE_OUT_ADOPTION;
            case "承祧" -> TYPE_SUCCESSOR;
            case "兼祧" -> TYPE_DUAL_SUCCESSOR;
            case "嗣子" -> TYPE_HEIR_SON;
            case "无嗣" -> TYPE_NO_DESCENDANT;
            default -> normalized;
        };
    }

    private String normalizeLabel(String relationLabel, String relationType, Long fromPersonId) {
        String normalized = normalizeLabelText(relationLabel);
        if (TYPE_PARENT_CHILD.equals(relationType)) {
            return normalized == null ? defaultBiologicalParentLabel(fromPersonId) : normalizeParentLabel(normalized);
        }
        if (TYPE_SPOUSE.equals(relationType)) {
            return normalized == null ? LABEL_SPOUSE : normalizeSpouseLabel(normalized);
        }
        if (TYPE_ADOPTIVE.equals(relationType) || TYPE_IN_ADOPTION.equals(relationType)) {
            return normalized == null ? defaultLegalParentLabel(fromPersonId) : normalizeLegalParentLabel(normalized);
        }
        if (TYPE_SUCCESSOR.equals(relationType)) {
            return normalized == null ? LABEL_HEIR_SUCCESSOR : normalizeSuccessorLabel(normalized);
        }
        if (TYPE_DUAL_SUCCESSOR.equals(relationType)) {
            return normalized == null ? LABEL_DUAL_SUCCESSOR : normalized;
        }
        if (TYPE_HEIR_SON.equals(relationType)) {
            return normalized == null ? LABEL_HEIR_SON : normalized;
        }
        if (TYPE_OUT_ADOPTION.equals(relationType)) {
            return normalized == null ? LABEL_OUT_ADOPTED : normalizeOutAdoptionLabel(normalized);
        }
        if (TYPE_NO_DESCENDANT.equals(relationType)) {
            return LABEL_NO_DESCENDANT;
        }
        return normalized;
    }

    private String normalizeLabelText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private String defaultBiologicalParentLabel(Long fromPersonId) {
        PersonEntity from = getActivePerson(fromPersonId);
        if ("female".equalsIgnoreCase(from.getGender())) {
            return LABEL_BIOLOGICAL_MOTHER;
        }
        if ("male".equalsIgnoreCase(from.getGender())) {
            return LABEL_BIOLOGICAL_FATHER;
        }
        return LABEL_BIOLOGICAL_PARENT;
    }

    private String defaultLegalParentLabel(Long fromPersonId) {
        PersonEntity from = getActivePerson(fromPersonId);
        if ("female".equalsIgnoreCase(from.getGender())) {
            return LABEL_LEGAL_MOTHER;
        }
        if ("male".equalsIgnoreCase(from.getGender())) {
            return LABEL_LEGAL_FATHER;
        }
        return LABEL_LEGAL_PARENT;
    }

    private String normalizeParentLabel(String label) {
        return switch (label) {
            case "father", "生父" -> LABEL_BIOLOGICAL_FATHER;
            case "mother", "生母" -> LABEL_BIOLOGICAL_MOTHER;
            case "parent", "生父母" -> LABEL_BIOLOGICAL_PARENT;
            case "biological_father" -> LABEL_BIOLOGICAL_FATHER;
            case "biological_mother" -> LABEL_BIOLOGICAL_MOTHER;
            case "biological_parent" -> LABEL_BIOLOGICAL_PARENT;
            default -> label;
        };
    }

    private String normalizeLegalParentLabel(String label) {
        return switch (label) {
            case "adoptive_father", "legal_father", "嗣父" -> LABEL_LEGAL_FATHER;
            case "adoptive_mother", "legal_mother", "嗣母" -> LABEL_LEGAL_MOTHER;
            case "adoptive_parent", "adoptive_child", "legal_parent", "嗣父母" -> LABEL_LEGAL_PARENT;
            default -> label;
        };
    }

    private String normalizeSpouseLabel(String label) {
        return switch (label) {
            case "spouse", "配偶", "正配" -> LABEL_SPOUSE;
            case "second_spouse", "继配" -> LABEL_SECOND_SPOUSE;
            case "concubine", "侧室", "妾" -> LABEL_CONCUBINE;
            default -> label;
        };
    }

    private String normalizeSuccessorLabel(String label) {
        return switch (label) {
            case "successor", "heir", "heir_successor", "承祧" -> LABEL_HEIR_SUCCESSOR;
            default -> label;
        };
    }

    private String normalizeOutAdoptionLabel(String label) {
        return switch (label) {
            case "out_adoption", "out_adopted", "出继", "出嗣" -> LABEL_OUT_ADOPTED;
            default -> label;
        };
    }

    private Boolean normalizeLineageRelation(String relationType, Boolean value) {
        if (value != null) {
            return value;
        }
        return isLineageType(relationType);
    }

    private Boolean normalizeBiological(String relationType, String relationCategory, Boolean value) {
        if (value != null) {
            return value;
        }
        if (CATEGORY_BLOOD.equals(relationCategory) && TYPE_PARENT_CHILD.equals(relationType)) {
            return true;
        }
        if (CATEGORY_RITUAL.equals(relationCategory) || CATEGORY_STATUS.equals(relationCategory) || isRitualType(relationType)) {
            return false;
        }
        return false;
    }

    private boolean isBiologicalParentLabel(String label) {
        return LABEL_BIOLOGICAL_FATHER.equals(label)
                || LABEL_BIOLOGICAL_MOTHER.equals(label)
                || LABEL_FATHER.equals(label)
                || LABEL_MOTHER.equals(label);
    }

    private boolean isLegalParentLabel(String label) {
        return LABEL_LEGAL_FATHER.equals(label)
                || LABEL_LEGAL_MOTHER.equals(label)
                || LABEL_ADOPTIVE_FATHER.equals(label)
                || LABEL_ADOPTIVE_MOTHER.equals(label);
    }

    private void validateSuccessorBranch(Long clanId, Long successorBranchId) {
        if (successorBranchId == null) {
            return;
        }
        var branch = branchRepository.findByIdAndClanId(successorBranchId, clanId)
                .orElseThrow(() -> new BusinessException("SUCCESSOR_BRANCH_NOT_FOUND", "承继房支不存在或不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(branch.getStatus(), "SUCCESSOR_BRANCH_NOT_OFFICIAL", "承继房支审核通过后才能用于关系维护");
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
        reverse.setRelationCategory(CATEGORY_MARRIAGE);
        reverse.setRitualRelationType(null);
        reverse.setSuccessionReason(null);
        reverse.setSuccessorBranchId(null);
        reverse.setIsLineageRelation(false);
        reverse.setIsBiological(false);
        reverse.setIsPrimary(false);
        reverse.setDescription("auto reverse spouse relationship");
        reverse.setConfidenceLevel(saved.getConfidenceLevel());
        reverse.setDataStatus(saved.getDataStatus());
        reverse.setCreatedBy(saved.getCreatedBy());
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
        if (entity.getRelationCategory() == null) {
            entity.setRelationCategory(normalizeCategory(null, entity.getRelationType()));
        }
        if (entity.getRitualRelationType() == null) {
            entity.setRitualRelationType(normalizeRitualRelationType(null, entity.getRelationType(), entity.getRelationCategory()));
        }
        if (entity.getIsLineageRelation() == null) {
            entity.setIsLineageRelation(isLineageType(entity.getRelationType()));
        }
        if (entity.getIsBiological() == null) {
            entity.setIsBiological(CATEGORY_BLOOD.equals(entity.getRelationCategory()));
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

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
