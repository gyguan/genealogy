package com.genealogy.member.repository;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ClanMembershipRepositoryQueryContractTest {

    @Test
    void memberPageSharesPermissionFiltersBetweenDataAndCountQueries() throws IOException {
        String xml = resource("/mapper/member/ClanMembershipQueryMapper.xml");
        assertThat(xml).contains("<sql id=\"SearchWhere\">");
        assertThat(xml).contains("visible_role.scope_id in");
        assertThat(xml).contains("criteria.visibleBranchIds");
        assertThat(xml).contains("criteria.visibleSubtreeIds");
        assertThat(xml).contains("criteria.filterByMemberStatuses");
        assertThat(xml).contains("criteria.filterByRoleCodes");
        assertThat(xml).contains("criteria.filterByScopeTypes");
        assertThat(xml).contains("select count(distinct membership.id)");
        assertThat(xml).doesNotContain(" in ()");
    }

    @Test
    void lastAdminGuardUsesDeterministicPostgreSqlRowLock() throws IOException {
        String xml = resource("/mapper/member/ClanMembershipPersistenceMapper.xml")
                .replaceAll("\\s+", " ");
        assertThat(xml).contains("where clan_id=#{clanId} order by id for update");
    }

    private String resource(String path) throws IOException {
        try (var stream = getClass().getResourceAsStream(path)) {
            if (stream == null) throw new IOException("Missing resource " + path);
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
