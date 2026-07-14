package com.genealogy.tree.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.entity.RelationshipEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
public class TreeVisibilityApplicationService {

    public static final String DATA_VIEW_OFFICIAL = "official";
    public static final String DATA_VIEW_EDITING = "editing";

    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_ARCHIVED = "archived";

    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String PRIVACY_BRANCH_ONLY = "branch_only";
    private static final String PRIVACY_RELATIVES_ONLY = "relatives_only";
    private static final String PRIVACY_PRIVATE = "private";
    private static final String PRIVACY_SEALED = "sealed";
    private static final String DEFAULT_PRIVACY_LEVEL = PRIVACY_CLAN_ONLY;
    private static final String DEFAULT_LIVING_PRIVACY_LEVEL = PRIVACY_BRANCH_ONLY;

    private static final String PERSON_VIEW = "person:view";
    private static final String PERSON_UPDATE = "person:update";
    private static final String PERSON_DELETE = "person:delete";
    private static final String RELATIONSHIP_VIEW = "relationship:view";
    private static final String RELATIONSHIP_UPDATE = "relationship:update";
    private static final String REVIEW_APPROVE = "review_task:approve";

    private static final Set<String> ALLOWED_DATA_VIEWS = Set.of(DATA_VIEW_OFFICIAL, DATA_VIEW_EDITING);

    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonApplicationService personApplicationService;
    private final RelationshipApplicationService relationshipApplicationService;

    public TreeVisibilityApplicationService(
            AuthorizationApplicationService authorizationApplicationService,
            PersonApplicationService personApplicationService,
            RelationshipApplicationService relationshipApplicationService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.personApplicationService = personApplicationService;
        this.relationshipApplicationService = relationshipApplicationService;
    }

    public String normalizeDataView(String dataView) {
        String normalized = dataView == null || dataView.isBlank()
                ? DATA_VIEW_OFFICIAL
                : dataView.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_DATA_VIEWS.contains(normalized)) {
            throw new BusinessException("TREE_DATA_VIEW_INVALID", "世系图谱数据视图无效");
        }
        return normalized;
    }

    @Transactional(readOnly = true)
    public PersonProjection requireRootProjection(PersonEntity person, Long actorId, String dataView) {
        String normalizedView = normalizeDataView(dataView);
        if (!hasBranchPermission(person, actorId, PERSON_VIEW)
                || !hasBranchPermission(person, actorId, RELATIONSHIP_VIEW)) {
            throw new BusinessException(ErrorCode.PERSON_NOT_FOUND);
        }
        if (DATA_VIEW_EDITING.equals(normalizedView)
                && (!canEditPerson(person, actorId) || !canEditRelationship(person, actorId))) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看编辑态世系数据");
        }
        PersonProjection projection = projectPerson(person, actorId, normalizedView);
        if (projection.visibility() == Visibility.HIDDEN) {
            throw new BusinessException(ErrorCode.PERSON_NOT_FOUND);
        }
        return projection;
    }

    @Transactional(readOnly = true)
    public PersonProjection projectPerson(PersonEntity person, Long actorId, String dataView) {
        String normalizedView = normalizeDataView(dataView);
        if (!isPersonStatusVisible(person, actorId, normalizedView)) {
            return PersonProjection.hidden(person);
        }
        if (!hasBranchPermission(person, actorId, PERSON_VIEW)) {
            return PersonProjection.hidden(person);
        }

        PersonResponse privacyAware;
        try {
            privacyAware = personApplicationService.get(person.getId(), actorId);
        } catch (BusinessException ignored) {
            return PersonProjection.hidden(person);
        }

        if (Boolean.TRUE.equals(person.getIsLiving())
                && !ownsRecord(person, actorId)
                && !hasBranchPermission(person, actorId, PERSON_UPDATE)) {
            return PersonProjection.masked(person, privacyAware, "privacy_restricted", "在世人物");
        }

        String privacyLevel = normalizePrivacyLevel(person);
        if ((PRIVACY_PRIVATE.equals(privacyLevel) || PRIVACY_RELATIVES_ONLY.equals(privacyLevel))
                && !ownsRecord(person, actorId)
                && !hasBranchPermission(person, actorId, PERSON_UPDATE)) {
            return PersonProjection.masked(person, privacyAware, "privacy_restricted", "受保护人物");
        }
        if (PRIVACY_SEALED.equals(privacyLevel)
                && !ownsRecord(person, actorId)
                && !hasBranchPermission(person, actorId, PERSON_DELETE)) {
            return PersonProjection.masked(person, privacyAware, "privacy_restricted", "已封存人物");
        }
        return PersonProjection.full(person, privacyAware);
    }

    @Transactional(readOnly = true)
    public boolean canExposeRelationship(
            RelationshipEntity relationship,
            PersonProjection from,
            PersonProjection to,
            Long actorId,
            String dataView
    ) {
        String normalizedView = normalizeDataView(dataView);
        if (from.visibility() != Visibility.FULL || to.visibility() != Visibility.FULL) {
            return false;
        }
        if (!isRelationshipStatusVisible(relationship, from.entity(), to.entity(), actorId, normalizedView)) {
            return false;
        }
        if (!hasBranchPermission(from.entity(), actorId, RELATIONSHIP_VIEW)
                || !hasBranchPermission(to.entity(), actorId, RELATIONSHIP_VIEW)) {
            return false;
        }
        try {
            relationshipApplicationService.get(relationship.getId(), actorId);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    @Transactional(readOnly = true)
    public void requireBranchQueryAccess(Long clanId, Long branchId, Long actorId, String dataView) {
        String normalizedView = normalizeDataView(dataView);
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, PERSON_VIEW);
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, RELATIONSHIP_VIEW);
        if (DATA_VIEW_EDITING.equals(normalizedView)) {
            boolean canEditPersons = hasBranchPermission(clanId, branchId, actorId, PERSON_UPDATE)
                    || hasBranchPermission(clanId, branchId, actorId, REVIEW_APPROVE);
            boolean canEditRelationships = hasBranchPermission(clanId, branchId, actorId, RELATIONSHIP_UPDATE)
                    || hasBranchPermission(clanId, branchId, actorId, REVIEW_APPROVE);
            if (!canEditPersons || !canEditRelationships) {
                throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看编辑态世系数据");
            }
        }
    }

    private boolean isPersonStatusVisible(PersonEntity person, Long actorId, String dataView) {
        String status = normalizeStatus(person.getDataStatus());
        if (DATA_VIEW_OFFICIAL.equals(dataView)) {
            return STATUS_OFFICIAL.equals(status);
        }
        return !STATUS_ARCHIVED.equals(status) && canEditPerson(person, actorId);
    }

    private boolean isRelationshipStatusVisible(
            RelationshipEntity relationship,
            PersonEntity from,
            PersonEntity to,
            Long actorId,
            String dataView
    ) {
        String status = normalizeStatus(relationship.getDataStatus());
        if (DATA_VIEW_OFFICIAL.equals(dataView)) {
            return STATUS_OFFICIAL.equals(status);
        }
        if (STATUS_ARCHIVED.equals(status)) {
            return false;
        }
        return canEditRelationship(from, actorId) && canEditRelationship(to, actorId);
    }

    private boolean canEditPerson(PersonEntity person, Long actorId) {
        return hasBranchPermission(person, actorId, PERSON_UPDATE)
                || hasBranchPermission(person, actorId, REVIEW_APPROVE);
    }

    private boolean canEditRelationship(PersonEntity person, Long actorId) {
        return hasBranchPermission(person, actorId, RELATIONSHIP_UPDATE)
                || hasBranchPermission(person, actorId, REVIEW_APPROVE);
    }

    private boolean hasBranchPermission(PersonEntity person, Long actorId, String permissionCode) {
        return hasBranchPermission(person.getClanId(), person.getBranchId(), actorId, permissionCode);
    }

    private boolean hasBranchPermission(Long clanId, Long branchId, Long actorId, String permissionCode) {
        try {
            authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, permissionCode);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private boolean ownsRecord(PersonEntity person, Long actorId) {
        return actorId != null && (actorId.equals(person.getCreatedBy()) || actorId.equals(person.getUpdatedBy()));
    }

    private String normalizePrivacyLevel(PersonEntity person) {
        if (person.getPrivacyLevel() == null || person.getPrivacyLevel().isBlank()) {
            return Boolean.TRUE.equals(person.getIsLiving()) ? DEFAULT_LIVING_PRIVACY_LEVEL : DEFAULT_PRIVACY_LEVEL;
        }
        return person.getPrivacyLevel().trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
    }

    public enum Visibility {
        FULL,
        MASKED,
        HIDDEN
    }

    public record PersonProjection(
            PersonEntity entity,
            PersonResponse response,
            Visibility visibility,
            String maskReason,
            String displayName
    ) {
        public static PersonProjection full(PersonEntity entity, PersonResponse response) {
            return new PersonProjection(entity, response, Visibility.FULL, null, response.name());
        }

        public static PersonProjection masked(PersonEntity entity, PersonResponse response, String maskReason, String displayName) {
            return new PersonProjection(entity, response, Visibility.MASKED, maskReason, displayName);
        }

        public static PersonProjection hidden(PersonEntity entity) {
            return new PersonProjection(entity, null, Visibility.HIDDEN, null, null);
        }
    }
}
