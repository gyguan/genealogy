package com.genealogy.tree.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.entity.RelationshipEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

@Service
public class TreeVisibilityApplicationService {

    public static final String DATA_VIEW_OFFICIAL = "official";
    public static final String DATA_VIEW_EDITING = "editing";

    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_REJECTED = "rejected";
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
    private static final Set<String> OFFICIAL_STATUSES = Set.of(STATUS_OFFICIAL);
    private static final Set<String> EDITING_STATUSES = Set.of(
            STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_OFFICIAL, STATUS_REJECTED
    );

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

    /**
     * Creates a request-scoped visibility evaluator for Tree queries. It reuses already loaded
     * entities and caches branch permission decisions, avoiding a second person/relationship read
     * for every projected node and edge.
     */
    public VisibilitySession openSession(Long actorId, String dataView) {
        return new VisibilitySession(actorId, normalizeDataView(dataView));
    }

    @Transactional(readOnly = true)
    public PersonProjection requireRootProjection(PersonEntity person, Long actorId, String dataView) {
        String normalizedView = normalizeDataView(dataView);
        PermissionEvaluator permissions = (value, permissionCode) -> hasBranchPermission(value, actorId, permissionCode);
        if (!permissions.has(person, PERSON_VIEW) || !permissions.has(person, RELATIONSHIP_VIEW)) {
            throw new BusinessException(ErrorCode.PERSON_NOT_FOUND);
        }
        if (DATA_VIEW_EDITING.equals(normalizedView)
                && (!canEditPerson(person, permissions) || !canEditRelationship(person, permissions))) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看编辑态世系数据");
        }
        PersonProjection projection = projectPersonInternal(
                person,
                actorId,
                normalizedView,
                permissions,
                () -> personApplicationService.get(person.getId(), actorId)
        );
        if (projection.visibility() == Visibility.HIDDEN) {
            throw new BusinessException(ErrorCode.PERSON_NOT_FOUND);
        }
        return projection;
    }

    @Transactional(readOnly = true)
    public PersonProjection projectPerson(PersonEntity person, Long actorId, String dataView) {
        String normalizedView = normalizeDataView(dataView);
        return projectPersonInternal(
                person,
                actorId,
                normalizedView,
                (value, permissionCode) -> hasBranchPermission(value, actorId, permissionCode),
                () -> personApplicationService.get(person.getId(), actorId)
        );
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
        return canExposeRelationshipInternal(
                relationship,
                from,
                to,
                actorId,
                normalizedView,
                (value, permissionCode) -> hasBranchPermission(value, actorId, permissionCode),
                true
        );
    }

    @Transactional(readOnly = true)
    public void requireBranchQueryAccess(Long clanId, Long branchId, Long actorId, String dataView) {
        String normalizedView = normalizeDataView(dataView);
        requireBranchQueryAccessInternal(
                clanId,
                branchId,
                normalizedView,
                permissionCode -> hasBranchPermission(clanId, branchId, actorId, permissionCode)
        );
    }

    private PersonProjection projectPersonInternal(
            PersonEntity person,
            Long actorId,
            String dataView,
            PermissionEvaluator permissions,
            Supplier<PersonResponse> responseSupplier
    ) {
        if (!isPersonStatusVisible(person, dataView, permissions)) {
            return PersonProjection.hidden(person);
        }
        if (!permissions.has(person, PERSON_VIEW)) {
            return PersonProjection.hidden(person);
        }

        PersonResponse privacyAware;
        try {
            privacyAware = responseSupplier.get();
        } catch (BusinessException ignored) {
            return PersonProjection.hidden(person);
        }

        if (Boolean.TRUE.equals(person.getIsLiving())
                && !ownsRecord(person, actorId)
                && !permissions.has(person, PERSON_UPDATE)) {
            return PersonProjection.masked(person, privacyAware, "privacy_restricted", "在世人物");
        }

        String privacyLevel = normalizePrivacyLevel(person);
        if ((PRIVACY_PRIVATE.equals(privacyLevel) || PRIVACY_RELATIVES_ONLY.equals(privacyLevel))
                && !ownsRecord(person, actorId)
                && !permissions.has(person, PERSON_UPDATE)) {
            return PersonProjection.masked(person, privacyAware, "privacy_restricted", "受保护人物");
        }
        if (PRIVACY_SEALED.equals(privacyLevel)
                && !ownsRecord(person, actorId)
                && !permissions.has(person, PERSON_DELETE)) {
            return PersonProjection.masked(person, privacyAware, "privacy_restricted", "已封存人物");
        }
        return PersonProjection.full(person, privacyAware);
    }

    private boolean canExposeRelationshipInternal(
            RelationshipEntity relationship,
            PersonProjection from,
            PersonProjection to,
            Long actorId,
            String dataView,
            PermissionEvaluator permissions,
            boolean verifyThroughRelationshipService
    ) {
        if (from.visibility() != Visibility.FULL || to.visibility() != Visibility.FULL) {
            return false;
        }
        if (!isRelationshipStatusVisible(relationship, from.entity(), to.entity(), dataView, permissions)) {
            return false;
        }
        if (!permissions.has(from.entity(), RELATIONSHIP_VIEW)
                || !permissions.has(to.entity(), RELATIONSHIP_VIEW)) {
            return false;
        }
        if (!verifyThroughRelationshipService) {
            return true;
        }
        try {
            relationshipApplicationService.get(relationship.getId(), actorId);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private void requireBranchQueryAccessInternal(
            Long clanId,
            Long branchId,
            String dataView,
            ClanPermissionEvaluator permissions
    ) {
        if (!permissions.has(PERSON_VIEW) || !permissions.has(RELATIONSHIP_VIEW)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看该支派世系");
        }
        if (DATA_VIEW_EDITING.equals(dataView)) {
            boolean canEditPersons = permissions.has(PERSON_UPDATE) || permissions.has(REVIEW_APPROVE);
            boolean canEditRelationships = permissions.has(RELATIONSHIP_UPDATE) || permissions.has(REVIEW_APPROVE);
            if (!canEditPersons || !canEditRelationships) {
                throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看编辑态世系数据");
            }
        }
    }

    private boolean isPersonStatusVisible(
            PersonEntity person,
            String dataView,
            PermissionEvaluator permissions
    ) {
        String status = normalizeStatus(person.getDataStatus());
        if (DATA_VIEW_OFFICIAL.equals(dataView)) {
            return STATUS_OFFICIAL.equals(status);
        }
        return !STATUS_ARCHIVED.equals(status)
                && canEditPerson(person, permissions)
                && canEditRelationship(person, permissions);
    }

    private boolean isRelationshipStatusVisible(
            RelationshipEntity relationship,
            PersonEntity from,
            PersonEntity to,
            String dataView,
            PermissionEvaluator permissions
    ) {
        String status = normalizeStatus(relationship.getDataStatus());
        if (DATA_VIEW_OFFICIAL.equals(dataView)) {
            return STATUS_OFFICIAL.equals(status);
        }
        if (STATUS_ARCHIVED.equals(status)) {
            return false;
        }
        return canEditRelationship(from, permissions) && canEditRelationship(to, permissions);
    }

    private boolean canEditPerson(PersonEntity person, PermissionEvaluator permissions) {
        return permissions.has(person, PERSON_UPDATE) || permissions.has(person, REVIEW_APPROVE);
    }

    private boolean canEditRelationship(PersonEntity person, PermissionEvaluator permissions) {
        return permissions.has(person, RELATIONSHIP_UPDATE) || permissions.has(person, REVIEW_APPROVE);
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

        public static PersonProjection masked(
                PersonEntity entity,
                PersonResponse response,
                String maskReason,
                String displayName
        ) {
            return new PersonProjection(entity, response, Visibility.MASKED, maskReason, displayName);
        }

        public static PersonProjection hidden(PersonEntity entity) {
            return new PersonProjection(entity, null, Visibility.HIDDEN, null, null);
        }
    }

    public final class VisibilitySession {

        private final Long actorId;
        private final String dataView;
        private final Map<PermissionKey, Boolean> permissionCache = new HashMap<>();

        private VisibilitySession(Long actorId, String dataView) {
            this.actorId = actorId;
            this.dataView = dataView;
        }

        public String dataView() {
            return dataView;
        }

        public Set<String> visibleDataStatuses() {
            return DATA_VIEW_OFFICIAL.equals(dataView) ? OFFICIAL_STATUSES : EDITING_STATUSES;
        }

        public PersonProjection requireRootProjection(PersonEntity person) {
            PermissionEvaluator permissions = this::hasPermission;
            if (!permissions.has(person, PERSON_VIEW) || !permissions.has(person, RELATIONSHIP_VIEW)) {
                throw new BusinessException(ErrorCode.PERSON_NOT_FOUND);
            }
            if (DATA_VIEW_EDITING.equals(dataView)
                    && (!canEditPerson(person, permissions) || !canEditRelationship(person, permissions))) {
                throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看编辑态世系数据");
            }
            PersonProjection projection = projectPerson(person);
            if (projection.visibility() == Visibility.HIDDEN) {
                throw new BusinessException(ErrorCode.PERSON_NOT_FOUND);
            }
            return projection;
        }

        public PersonProjection projectPerson(PersonEntity person) {
            return projectPersonInternal(
                    person,
                    actorId,
                    dataView,
                    this::hasPermission,
                    () -> PersonMapper.toResponse(person)
            );
        }

        public boolean canExposeRelationship(
                RelationshipEntity relationship,
                PersonProjection from,
                PersonProjection to
        ) {
            return canExposeRelationshipInternal(
                    relationship,
                    from,
                    to,
                    actorId,
                    dataView,
                    this::hasPermission,
                    false
            );
        }

        public void requireBranchQueryAccess(Long clanId, Long branchId) {
            requireBranchQueryAccessInternal(
                    clanId,
                    branchId,
                    dataView,
                    permissionCode -> hasPermission(clanId, branchId, permissionCode)
            );
        }

        private boolean hasPermission(PersonEntity person, String permissionCode) {
            return hasPermission(person.getClanId(), person.getBranchId(), permissionCode);
        }

        private boolean hasPermission(Long clanId, Long branchId, String permissionCode) {
            PermissionKey key = new PermissionKey(clanId, branchId, permissionCode);
            return permissionCache.computeIfAbsent(
                    key,
                    ignored -> hasBranchPermission(clanId, branchId, actorId, permissionCode)
            );
        }
    }

    @FunctionalInterface
    private interface PermissionEvaluator {
        boolean has(PersonEntity person, String permissionCode);
    }

    @FunctionalInterface
    private interface ClanPermissionEvaluator {
        boolean has(String permissionCode);
    }

    private record PermissionKey(Long clanId, Long branchId, String permissionCode) {
    }
}
