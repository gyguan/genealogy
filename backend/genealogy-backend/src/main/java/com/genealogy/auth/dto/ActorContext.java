package com.genealogy.auth.dto;

import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Immutable authorization facts resolved once for a clan-scoped request.
 */
public record ActorContext(
        Long userId,
        Long clanId,
        Long membershipId,
        Set<String> roleCodes,
        Set<String> permissions,
        Set<Long> branchScopeIds,
        boolean crossClanAdmin,
        String requestId,
        String clientIp
) {
    public ActorContext {
        roleCodes = roleCodes == null ? Set.of() : Set.copyOf(roleCodes);
        permissions = permissions == null
                ? Set.of()
                : permissions.stream()
                        .map(ActorContext::normalizePermissionCode)
                        .filter(value -> value != null && !value.isBlank())
                        .collect(Collectors.toUnmodifiableSet());
        branchScopeIds = branchScopeIds == null ? Set.of() : Set.copyOf(branchScopeIds);
    }

    public boolean hasPermission(String permissionCode) {
        return crossClanAdmin || permissions.contains(normalizePermissionCode(permissionCode));
    }

    public boolean coversBranch(Long branchId) {
        return crossClanAdmin || branchId == null || branchScopeIds.contains(branchId);
    }

    public ActorContext withRequestMetadata(String resolvedRequestId, String resolvedClientIp) {
        return new ActorContext(
                userId, clanId, membershipId, roleCodes, permissions, branchScopeIds,
                crossClanAdmin, resolvedRequestId, resolvedClientIp
        );
    }

    private static String normalizePermissionCode(String permissionCode) {
        if (permissionCode == null) {
            return null;
        }
        return permissionCode.trim().toLowerCase(Locale.ROOT).replace(':', '.');
    }
}
