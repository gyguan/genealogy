package com.genealogy.member.repository;

import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.util.Collection;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClanMembershipRepositoryQueryContractTest {

    @Test
    void memberPageMustCastNullableKeywordAndApplyActorScopeBeforePagination() throws NoSuchMethodException {
        Method method = ClanMembershipRepository.class.getMethod(
                "searchMembers",
                Long.class,
                String.class,
                String.class,
                MemberRoleScopeType.class,
                MemberStatus.class,
                boolean.class,
                MemberRoleScopeType.class,
                MemberRoleScopeType.class,
                Collection.class,
                Collection.class,
                Pageable.class
        );
        Query query = method.getAnnotation(Query.class);

        assertNotNull(query);
        assertQueryContract(query.value());
        assertQueryContract(query.countQuery());
    }

    private void assertQueryContract(String query) {
        String compact = query.replaceAll("\\s+", " ");
        assertTrue(compact.contains("lower(appUser.username) like concat('%', cast(:keyword as string), '%')"));
        assertTrue(compact.contains("lower(appUser.displayName) like concat('%', cast(:keyword as string), '%')"));
        assertFalse(compact.contains("lower(concat('%', :keyword, '%'))"));
        assertTrue(compact.contains(":fullClanAccess = true or exists"));
        assertTrue(compact.contains("visibleRole.scopeId in :visibleBranchIds"));
        assertTrue(compact.contains("visibleRole.scopeId in :visibleSubtreeIds"));
    }
}
