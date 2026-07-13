from pathlib import Path
import json


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, got {count}")
    file.write_text(text.replace(old, new, 1))


def insert_before_once(path: str, marker: str, addition: str, already: str) -> None:
    file = Path(path)
    text = file.read_text()
    if already in text:
        return
    count = text.count(marker)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one marker, got {count}")
    file.write_text(text.replace(marker, addition + marker, 1))


policy = "backend/genealogy-backend/src/main/java/com/genealogy/member/domain/MemberGrantPolicyService.java"
insert_before_once(
    policy,
    "    public boolean canManageGrant(\n",
    """    public boolean canViewGrant(
            ActorScope actorScope,
            MemberRoleScopeType targetScopeType,
            Long targetScopeId
    ) {
        if (actorScope.fullClanAccess()) {
            return true;
        }
        if (targetScopeId == null) {
            return false;
        }
        if (targetScopeType == MemberRoleScopeType.branch) {
            return actorScope.visibleBranchIds().contains(targetScopeId);
        }
        if (targetScopeType == MemberRoleScopeType.branch_subtree) {
            return actorScope.visibleSubtreeIds().contains(targetScopeId);
        }
        return false;
    }

""",
    "    public boolean canViewGrant(\n",
)

audit = "backend/genealogy-backend/src/main/java/com/genealogy/member/application/MemberPermissionAuditApplicationService.java"
audit_text = Path(audit).read_text()
if "import java.util.Collection;\n" in audit_text:
    replace_once(audit, "import java.util.Collection;\n", "")
if 'root.<String>get("targetType")' not in Path(audit).read_text():
    replace_once(
        audit,
        'predicates.add(targetPredicate(criteriaBuilder, root.get("targetType"), root.get("targetId"), targetFilter));',
        'predicates.add(targetPredicate(criteriaBuilder, root.<String>get("targetType"), root.<Long>get("targetId"), targetFilter));',
    )
if "Path<String> targetType" not in Path(audit).read_text():
    replace_once(
        audit,
        "jakarta.persistence.criteria.Path<Object> targetType,\n            jakarta.persistence.criteria.Path<Object> targetId,",
        "jakarta.persistence.criteria.Path<String> targetType,\n            jakarta.persistence.criteria.Path<Long> targetId,",
    )
if "return criteriaBuilder.disjunction();" not in Path(audit).read_text():
    replace_once(
        audit,
        """        return targets.size() == 1
                ? targets.get(0)
                : criteriaBuilder.or(targets.toArray(new Predicate[0]));""",
        """        if (targets.isEmpty()) {
            return criteriaBuilder.disjunction();
        }
        return targets.size() == 1
                ? targets.get(0)
                : criteriaBuilder.or(targets.toArray(new Predicate[0]));""",
    )

controller = "backend/genealogy-backend/src/main/java/com/genealogy/member/controller/MemberPermissionController.java"
controller_text = Path(controller).read_text()
if "MemberPermissionAuditApplicationService" not in controller_text:
    replace_once(
        controller,
        "import com.genealogy.member.application.MemberPermissionApplicationService;\n",
        "import com.genealogy.member.application.MemberPermissionApplicationService;\nimport com.genealogy.member.application.MemberPermissionAuditApplicationService;\n",
    )
    replace_once(
        controller,
        "import com.genealogy.member.dto.MemberGrantResponse;\n",
        "import com.genealogy.member.dto.MemberGrantResponse;\nimport com.genealogy.member.dto.MemberPermissionAuditResponse;\n",
    )
    replace_once(
        controller,
        "import org.springframework.validation.annotation.Validated;\n",
        "import org.springframework.format.annotation.DateTimeFormat;\nimport org.springframework.validation.annotation.Validated;\n",
    )
    replace_once(controller, "import java.util.List;\n", "import java.time.LocalDateTime;\nimport java.util.List;\n")
    replace_once(
        controller,
        '    private static final String MEMBER_DISABLE = "member.disable";\n',
        '    private static final String MEMBER_DISABLE = "member.disable";\n    private static final String OPERATION_LOG_VIEW = "operation_log.view";\n',
    )
    replace_once(
        controller,
        """    private final MemberPermissionApplicationService memberPermissionApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;""",
        """    private final MemberPermissionApplicationService memberPermissionApplicationService;
    private final MemberPermissionAuditApplicationService memberPermissionAuditApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;""",
    )
    replace_once(
        controller,
        """            MemberPermissionApplicationService memberPermissionApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.memberPermissionApplicationService = memberPermissionApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;""",
        """            MemberPermissionApplicationService memberPermissionApplicationService,
            MemberPermissionAuditApplicationService memberPermissionAuditApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.memberPermissionApplicationService = memberPermissionApplicationService;
        this.memberPermissionAuditApplicationService = memberPermissionAuditApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;""",
    )
    marker = '    @GetMapping("/member-candidates")\n'
    method = """    @GetMapping("/member-permission-audits")
    public ApiResponse<PageResponse<MemberPermissionAuditResponse>> audits(
            @Positive @PathVariable Long clanId,
            @RequestParam(required = false) Long membershipId,
            @RequestParam(required = false) Long grantId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long currentActorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requirePermission(clanId, currentActorId, OPERATION_LOG_VIEW);
        return ApiResponse.success(memberPermissionAuditApplicationService.search(
                clanId,
                currentActorId,
                membershipId,
                grantId,
                actorId,
                actionType,
                startTime,
                endTime,
                pageNo,
                pageSize
        ));
    }

"""
    insert_before_once(controller, marker, method, '@GetMapping("/member-permission-audits")')

app = "backend/genealogy-backend/src/main/java/com/genealogy/member/application/MemberPermissionApplicationService.java"
if "canViewHistoryPermission" not in Path(app).read_text():
    replace_once(
        app,
        '        boolean canDisablePermission = authorizationApplicationService.can(clanId, actorId, "member.disable");\n        boolean canGrantRole = canGrantPermission',
        '        boolean canDisablePermission = authorizationApplicationService.can(clanId, actorId, "member.disable");\n        boolean canViewHistoryPermission = authorizationApplicationService.can(clanId, actorId, "operation_log.view");\n        boolean canGrantRole = canGrantPermission',
    )
if "visibleMembershipGrants" not in Path(app).read_text():
    replace_once(
        app,
        """            List<MemberRoleEntity> membershipGrants = grantsByMembership
                    .getOrDefault(membership.getId(), List.of());
            List<MemberGrantResponse> memberGrants = membershipGrants.stream()""",
        """            List<MemberRoleEntity> membershipGrants = grantsByMembership
                    .getOrDefault(membership.getId(), List.of());
            List<MemberRoleEntity> visibleMembershipGrants = membershipGrants.stream()
                    .filter(grant -> memberGrantPolicyService.canViewGrant(
                            actorScope,
                            grant.getScopeType(),
                            grant.getScopeId()
                    ))
                    .toList();
            List<MemberGrantResponse> memberGrants = visibleMembershipGrants.stream()""",
    )
    replace_once(
        app,
        """                    canDisableMember,
                    canEditAny || canRevokeAny || canDisableMember
            );""",
        """                    canDisableMember,
                    canViewHistoryPermission
                            && (actorScope.fullClanAccess() || !visibleMembershipGrants.isEmpty())
            );""",
    )

handler = Path("backend/genealogy-backend/src/main/java/com/genealogy/common/exception/GlobalExceptionHandler.java")
if "ResponseEntity<ApiResponse<Void>> handleBusinessException" not in handler.read_text():
    handler.write_text("""package com.genealogy.common.exception;

import com.genealogy.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Set;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Set<String> FORBIDDEN_CODES = Set.of(
            "AUTH_FORBIDDEN",
            "MEMBER_GRANT_FORBIDDEN",
            "CROSS_CLAN_ADMIN_ASSIGN_FORBIDDEN"
    );
    private static final Set<String> CONFLICT_CODES = Set.of(
            "MEMBER_GRANT_DUPLICATED",
            "LAST_CLAN_ADMIN_REQUIRED",
            "USER_ALREADY_JOINED_ANOTHER_CLAN"
    );

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
        return ResponseEntity.status(statusFor(exception.getCode()))
                .body(ApiResponse.fail(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse(ErrorCode.COMMON_BAD_REQUEST.message());
        return ApiResponse.fail(ErrorCode.COMMON_BAD_REQUEST.code(), message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleConstraintViolationException(ConstraintViolationException exception) {
        return ApiResponse.fail(ErrorCode.COMMON_BAD_REQUEST.code(), exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception exception) {
        return ApiResponse.fail(ErrorCode.COMMON_SYSTEM_ERROR.code(), ErrorCode.COMMON_SYSTEM_ERROR.message());
    }

    private HttpStatus statusFor(String code) {
        if ("AUTH_UNAUTHORIZED".equals(code)) {
            return HttpStatus.UNAUTHORIZED;
        }
        if (FORBIDDEN_CODES.contains(code)) {
            return HttpStatus.FORBIDDEN;
        }
        if (code != null && code.endsWith("_NOT_FOUND")) {
            return HttpStatus.NOT_FOUND;
        }
        if (CONFLICT_CODES.contains(code)) {
            return HttpStatus.CONFLICT;
        }
        return HttpStatus.BAD_REQUEST;
    }
}
""")

overlay_path = Path("docs/api/openapi.member-permission.json")
overlay = json.loads(overlay_path.read_text())
codes = overlay["components"]["schemas"]["MemberPermissionErrorResponse"]["properties"]["code"]["enum"]
for code in ["MEMBER_PERMISSION_AUDIT_ACTION_INVALID", "MEMBER_PERMISSION_AUDIT_TIME_INVALID"]:
    if code not in codes:
        codes.append(code)
overlay_path.write_text(json.dumps(overlay, ensure_ascii=False, indent=2) + "\n")
