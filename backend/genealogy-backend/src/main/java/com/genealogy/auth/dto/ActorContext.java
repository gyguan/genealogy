package com.genealogy.auth.dto;

import java.util.Set;

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
        permissions = permissions == null ? Set.of() : Set.copyOf(permissions);
        branchScopeIds = branchScopeIds == null ? Set.of() : Set.copyOf(branchScopeIds);
    }

    public boolean hasPermission(String permissionCode) {
        return crossClanAdmin || permissions.contains(permissionCode);
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
}
