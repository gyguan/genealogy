package com.genealogy.access.domain;

import java.util.Set;

/**
 * Query scope that must be applied before count, pagination and result assembly.
 */
public record DataScope(
        Type type,
        Long clanId,
        Long branchId,
        Set<Long> branchIds
) {
    public enum Type {
        NONE,
        OBJECT,
        BRANCH,
        BRANCH_SUBTREE,
        CLAN,
        GLOBAL
    }

    public DataScope {
        branchIds = branchIds == null ? Set.of() : Set.copyOf(branchIds);
    }

    public static DataScope none() {
        return new DataScope(Type.NONE, null, null, Set.of());
    }

    public static DataScope clan(Long clanId) {
        return new DataScope(Type.CLAN, clanId, null, Set.of());
    }

    public static DataScope branch(Long clanId, Long branchId) {
        return new DataScope(Type.BRANCH, clanId, branchId, Set.of(branchId));
    }

    public static DataScope branchSubtree(Long clanId, Long branchId, Set<Long> branchIds) {
        return new DataScope(Type.BRANCH_SUBTREE, clanId, branchId, branchIds);
    }

    public static DataScope global() {
        return new DataScope(Type.GLOBAL, null, null, Set.of());
    }
}
