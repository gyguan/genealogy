package com.genealogy.member.repository;

import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;
import java.util.Collection;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @Test
    void lastAdminGuardMustUseDeterministicPessimisticClanLock() throws NoSuchMethodException {
        Method method = ClanMembershipRepository.class.getMethod("lockByClanId", Long.class);
        Lock lock = method.getAnnotation(Lock.class);
        Query query = method.getAnnotation(Query.class);

        assertNotNull(lock);
        assertEquals(LockModeType.PESSIMISTIC_WRITE, lock.value());
        assertNotNull(query);
        assertTrue(query.value().replaceAll("\\s+", " ").contains("order by membership.id"));
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
