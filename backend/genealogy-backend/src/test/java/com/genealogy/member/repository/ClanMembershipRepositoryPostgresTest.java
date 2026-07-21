package com.genealogy.member.repository;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/genealogy_repository_test",
        "spring.datasource.username=postgres",
        "spring.datasource.password=postgres",
        "spring.datasource.driver-class-name=org.postgresql.Driver",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@EnabledIfEnvironmentVariable(named = "POSTGRES_INTEGRATION", matches = "true")
class ClanMembershipRepositoryPostgresTest {

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private ClanMembershipRepository clanMembershipRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private MemberRoleRepository memberRoleRepository;

    @Test
    void branchManagerPageFiltersBeforeCountAndSupportsNullKeyword() {
        RoleEntity viewer = new RoleEntity();
        viewer.setRoleCode("viewer_repository_test");
        viewer.setRoleName("Viewer Repository Test");
        viewer = roleRepository.save(viewer);

        ClanMembershipEntity visible = membership(1L, "visible-user", "Visible User");
        ClanMembershipEntity sibling = membership(1L, "sibling-user", "Sibling User");

        grant(visible.getId(), viewer.getId(), 11L);
        grant(sibling.getId(), viewer.getId(), 20L);

        Page<ClanMembershipEntity> result = clanMembershipRepository.searchMembers(
                1L,
                null,
                false,
                java.util.List.of("__none__"),
                false,
                java.util.List.of(MemberRoleScopeType.clan),
                false,
                java.util.List.of(MemberStatus.active),
                false,
                MemberRoleScopeType.branch,
                MemberRoleScopeType.branch_subtree,
                java.util.List.of(11L),
                java.util.List.of(11L, 12L),
                PageRequest.of(0, 10)
        );

        assertThat(result.getTotalElements()).isEqualTo(1L);
        assertThat(result.getContent())
                .extracting(ClanMembershipEntity::getId)
                .containsExactly(visible.getId());
    }

    private ClanMembershipEntity membership(Long clanId, String username, String displayName) {
        AppUserEntity user = new AppUserEntity();
        user.setUsername(username);
        user.setPasswordHash("test-only");
        user.setDisplayName(displayName);
        user.setStatus("active");
        user = appUserRepository.save(user);

        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setClanId(clanId);
        membership.setUserId(user.getId());
        membership.setJoinStatus("joined");
        membership.setMemberStatus(MemberStatus.active);
        return clanMembershipRepository.save(membership);
    }

    private void grant(Long membershipId, Long roleId, Long branchId) {
        MemberRoleEntity grant = new MemberRoleEntity();
        grant.setMembershipId(membershipId);
        grant.setRoleId(roleId);
        grant.setScopeType(MemberRoleScopeType.branch_subtree);
        grant.setScopeId(branchId);
        grant.setStatus("active");
        memberRoleRepository.save(grant);
    }
}
