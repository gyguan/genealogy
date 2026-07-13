package com.genealogy.member.repository;

import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClanMembershipRepositoryQueryContractTest {

    @Test
    void nullableKeywordMustNotBePassedToLowerFunction() throws NoSuchMethodException {
        Method method = ClanMembershipRepository.class.getMethod(
                "searchMembers",
                Long.class,
                String.class,
                String.class,
                MemberRoleScopeType.class,
                MemberStatus.class,
                Pageable.class
        );
        Query query = method.getAnnotation(Query.class);

        assertNotNull(query);
        assertKeywordContract(query.value());
        assertKeywordContract(query.countQuery());
    }

    private void assertKeywordContract(String query) {
        String compact = query.replaceAll("\\s+", " ");
        assertTrue(compact.contains("lower(appUser.username) like concat('%', :keyword, '%')"));
        assertTrue(compact.contains("lower(appUser.displayName) like concat('%', :keyword, '%')"));
        assertFalse(compact.contains("lower(concat('%', :keyword, '%'))"));
    }
}
