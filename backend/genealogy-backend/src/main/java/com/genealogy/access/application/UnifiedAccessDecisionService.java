package com.genealogy.access.application;

import com.genealogy.access.domain.AccessAction;
import com.genealogy.access.domain.AccessDecision;
import com.genealogy.access.domain.ActorContext;
import com.genealogy.access.domain.DataScope;
import com.genealogy.access.domain.PrivacyDisclosure;
import com.genealogy.access.domain.ResourceContext;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single access decision entry for Person, Tree, Source and Member scenarios.
 *
 * <p>Callers must apply {@link AccessDecision#dataScope()} in repository queries
 * before count/pagination and then use {@link AccessDecision#disclosure()} when
 * mapping fields. Denied results intentionally expose only stable reason codes.</p>
 */
@Service
public class UnifiedAccessDecisionService {

    public static final String REASON_UNAUTHENTICATED = "ACCESS_AUTHENTICATION_REQUIRED";
    public static final String REASON_OUT_OF_SCOPE = "ACCESS_SCOPE_FORBIDDEN";
    public static final String REASON_PERMISSION_DENIED = "ACCESS_PERMISSION_FORBIDDEN";

    private static final Logger log = LoggerFactory.getLogger(UnifiedAccessDecisionService.class);

    private final AuthorizationApplicationService authorization;
    private OperationLogApplicationService operationLogApplicationService;

    public UnifiedAccessDecisionService(AuthorizationApplicationService authorization) {
        this.authorization = authorization;
    }

    @Autowired(required = false)
    void setOperationLogApplicationService(OperationLogApplicationService operationLogApplicationService) {
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public ActorContext actor(Long userId, Long clanId) {
        if (userId == null) {
            return ActorContext.anonymous(clanId);
        }
        boolean crossClanAdmin = authorization.isCrossClanAdmin(userId);
        boolean activeMember = authorization.isActiveClanMember(clanId, userId);
        return new ActorContext(userId, clanId, true, activeMember, crossClanAdmin);
    }

    @Transactional(readOnly = true)
    public AccessDecision decidePerson(Long userId, ResourceContext resource, AccessAction action) {
        return decide(userId, resource, action, permission("person", action));
    }

    @Transactional(readOnly = true)
    public AccessDecision decideTree(Long userId, ResourceContext resource, AccessAction action) {
        return decide(userId, resource, action, permission("tree", action));
    }

    @Transactional(readOnly = true)
    public AccessDecision decideSource(Long userId, ResourceContext resource, AccessAction action) {
        return decide(userId, resource, action, permission("source", action));
    }

    @Transactional(readOnly = true)
    public AccessDecision decideMember(Long userId, ResourceContext resource, AccessAction action) {
        return decide(userId, resource, action, permission("member", action));
    }

    @Transactional(readOnly = true)
    public AccessDecision decide(Long userId, ResourceContext resource, AccessAction action, String permissionCode) {
        ActorContext actor = actor(userId, resource.clanId());
        if (!actor.authenticated()) {
            return denied(userId, resource, action, REASON_UNAUTHENTICATED, DataScope.Type.NONE);
        }
        if (!actor.activeMember() && !actor.crossClanAdmin()) {
            return denied(userId, resource, action, REASON_OUT_OF_SCOPE, DataScope.Type.NONE);
        }
        if (!authorization.can(resource.clanId(), userId, permissionCode)) {
            return denied(userId, resource, action, REASON_PERMISSION_DENIED, DataScope.Type.NONE);
        }

        DataScope scope = actor.crossClanAdmin()
                ? DataScope.global()
                : resource.branchId() == null
                ? DataScope.clan(resource.clanId())
                : DataScope.branch(resource.clanId(), resource.branchId());

        PrivacyDisclosure disclosure = disclosure(actor, resource, action);
        if (disclosure == PrivacyDisclosure.FULL && containsSensitiveData(resource)) {
            log.info(
                    "event=privacy_full_disclosure actorId={} clanId={} branchId={} resourceType={} resourceId={} action={} dataScope={} disclosure=FULL result=allowed",
                    userId, resource.clanId(), resource.branchId(), resource.type(), resource.resourceId(), action, scope.type()
            );
            if (operationLogApplicationService != null) {
                operationLogApplicationService.record(
                        resource.clanId(), userId, "privacy_full_disclosure", resource.type().name().toLowerCase(),
                        resource.resourceId(), "full sensitive disclosure", disclosureDetail(resource, action, scope)
                );
            }
        }
        return AccessDecision.allow(scope, disclosure);
    }

    private AccessDecision denied(
            Long userId,
            ResourceContext resource,
            AccessAction action,
            String reasonCode,
            DataScope.Type dataScope
    ) {
        log.warn(
                "event=access_decision_denied actorId={} clanId={} branchId={} resourceType={} resourceId={} action={} reasonCode={} dataScope={} result=denied",
                userId, resource.clanId(), resource.branchId(), resource.type(), resource.resourceId(), action, reasonCode, dataScope
        );
        return AccessDecision.deny(reasonCode);
    }

    private PrivacyDisclosure disclosure(ActorContext actor, ResourceContext resource, AccessAction action) {
        if (containsSensitiveData(resource)) {
            if (actor.crossClanAdmin() || action == AccessAction.MANAGE || action == AccessAction.UPDATE) {
                return PrivacyDisclosure.FULL;
            }
            return PrivacyDisclosure.MASKED;
        }
        return PrivacyDisclosure.FULL;
    }

    private boolean containsSensitiveData(ResourceContext resource) {
        return resource.livingPerson() || resource.containsContact() || resource.containsAttachment();
    }

    private String disclosureDetail(ResourceContext resource, AccessAction action, DataScope scope) {
        return "action=" + action
                + "; scope=" + scope.type()
                + "; livingPerson=" + resource.livingPerson()
                + "; containsContact=" + resource.containsContact()
                + "; containsAttachment=" + resource.containsAttachment();
    }

    private String permission(String resource, AccessAction action) {
        return switch (action) {
            case VIEW, LIST -> resource + ":view";
            case DOWNLOAD -> resource + ":download";
            case CREATE -> resource + ":create";
            case UPDATE -> resource + ":update";
            case DELETE -> resource + ":delete";
            case MANAGE -> resource + ":manage";
        };
    }
}
