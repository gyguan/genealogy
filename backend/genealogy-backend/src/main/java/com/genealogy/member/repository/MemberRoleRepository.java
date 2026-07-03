package com.genealogy.member.repository;

import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MemberRoleRepository extends JpaRepository<MemberRoleEntity, Long> {

    List<MemberRoleEntity> findByMembershipIdAndStatus(Long membershipId, String status);

    List<MemberRoleEntity> findByMembershipIdInAndStatus(Collection<Long> membershipIds, String status);

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
}
