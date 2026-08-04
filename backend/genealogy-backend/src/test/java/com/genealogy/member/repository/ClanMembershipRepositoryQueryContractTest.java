package com.genealogy.member.repository;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class ClanMembershipRepositoryQueryContractTest {

    @Test
    void memberPageSharesPermissionFiltersBetweenDataAndCountQueries() throws IOException {
        String xml = resource("/mapper/member/ClanMembershipQueryMapper.xml");
        String sql = compactSql(xml);

        assertThat(xml).contains("<sql id=\"SearchWhere\">");
        assertThat(sql).contains("visible_role.scope_id in");
        assertThat(sql).contains("criteria.visiblebranchids");
        assertThat(sql).contains("criteria.visiblesubtreeids");
        assertThat(sql).contains("criteria.filterbymemberstatuses");
        assertThat(sql).contains("criteria.filterbyrolecodes");
        assertThat(sql).contains("criteria.filterbyscopetypes");
        assertThat(sql).contains("select count(distinct membership.id)");
        assertThat(sql).doesNotContain(" in ()");
    }

    @Test
    void lastAdminGuardUsesDeterministicPostgreSqlRowLock() throws IOException {
        String sql = compactSql(resource("/mapper/member/ClanMembershipPersistenceMapper.xml"));

        assertThat(sql).contains("where clan_id=#{clanid} order by id for update");
    }

    private String resource(String path) throws IOException {
        try (var stream = getClass().getResourceAsStream(path)) {
            if (stream == null) {
                throw new IOException("Missing resource " + path);
            }
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String compactSql(String sql) {
        return sql.replaceAll("\\s+", " ")
                .replaceAll("\\s*=\\s*", "=")
                .replaceAll("\\s*,\\s*", ",")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
