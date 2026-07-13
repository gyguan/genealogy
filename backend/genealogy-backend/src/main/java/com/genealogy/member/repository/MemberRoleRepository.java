package com.genealogy.member.repository;

import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MemberRoleRepository extends JpaRepository<MemberRoleEntity, Long> {

    List<MemberRoleEntity> findByMembershipIdAndStatus(Long membershipId, String status);

    List<MemberRoleEntity> findByMembershipIdInAndStatus(Collection<Long> membershipIds, String status);

    List<MemberRoleEntity> findByMembershipIdIn(Collection<Long> membershipIds);

    List<MemberRoleEntity> findByRoleIdAndStatus(Long roleId, String status);

    Optional<MemberRoleEntity> findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(
            Long membershipId,
            Long roleId,
            MemberRoleScopeType scopeType,
            Long scopeId
    );

    boolean existsByMembershipIdAndRoleIdAndScopeTypeAndScopeIdAndStatus(
            Long membershipId,
            Long roleId,
            MemberRoleScopeType scopeType,
            Long scopeId,
            String status
    );

    @Query("""
            select count(memberRole)
            from MemberRoleEntity memberRole, ClanMembershipEntity membership, RoleEntity role
            where memberRole.membershipId = membership.id
              and memberRole.roleId = role.id
              and membership.clanId = :clanId
              and membership.memberStatus = :memberStatus
              and memberRole.status = :grantStatus
              and role.roleCode = :roleCode
              and memberRole.scopeType = :scopeType
            """)
    long countActiveRoleGrants(
            @Param("clanId") Long clanId,
            @Param("memberStatus") MemberStatus memberStatus,
            @Param("grantStatus") String grantStatus,
            @Param("roleCode") String roleCode,
            @Param("scopeType") MemberRoleScopeType scopeType
    );
}
