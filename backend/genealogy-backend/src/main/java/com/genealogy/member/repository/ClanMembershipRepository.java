package com.genealogy.member.repository;

import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ClanMembershipRepository extends JpaRepository<ClanMembershipEntity, Long> {

    Optional<ClanMembershipEntity> findByClanIdAndUserId(Long clanId, Long userId);

    Optional<ClanMembershipEntity> findByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByClanIdAndUserIdIn(Long clanId, Collection<Long> userIds);

    List<ClanMembershipEntity> findByClanIdAndMemberStatus(Long clanId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByClanId(Long clanId);

    Page<ClanMembershipEntity> findByClanId(Long clanId, Pageable pageable);

    List<ClanMembershipEntity> findByUserIdAndMemberStatus(Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByPersonId(Long personId);

    boolean existsByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    // Nullable text parameters must be explicitly cast for PostgreSQL. Actor scope is applied
    // before pagination so totals never include members outside the current manager's branches.
    @Query(
            value = """
                    select distinct membership
                    from ClanMembershipEntity membership, AppUserEntity appUser
                    where membership.clanId = :clanId
                      and appUser.id = membership.userId
                      and appUser.deletedAt is null
                      and (:fullClanAccess = true or exists (
                           select visibleRole.id
                           from MemberRoleEntity visibleRole
                           where visibleRole.membershipId = membership.id
                             and visibleRole.status = 'active'
                             and (
                                  (visibleRole.scopeType = :branchScope
                                   and visibleRole.scopeId in :visibleBranchIds)
                                  or
                                  (visibleRole.scopeType = :branchSubtreeScope
                                   and visibleRole.scopeId in :visibleSubtreeIds)
                             )
                      ))
                      and (:memberStatus is null or membership.memberStatus = :memberStatus)
                      and (:keyword is null
                           or lower(appUser.username) like concat('%', cast(:keyword as string), '%')
                           or lower(appUser.displayName) like concat('%', cast(:keyword as string), '%'))
                      and (:roleCode is null or exists (
                           select memberRole.id
                           from MemberRoleEntity memberRole, RoleEntity role
                           where memberRole.membershipId = membership.id
                             and memberRole.roleId = role.id
                             and memberRole.status = 'active'
                             and role.roleCode = :roleCode
                      ))
                      and (:scopeType is null or exists (
                           select scopedRole.id
                           from MemberRoleEntity scopedRole
                           where scopedRole.membershipId = membership.id
                             and scopedRole.status = 'active'
                             and scopedRole.scopeType = :scopeType
                      ))
                    """,
            countQuery = """
                    select count(distinct membership.id)
                    from ClanMembershipEntity membership, AppUserEntity appUser
                    where membership.clanId = :clanId
                      and appUser.id = membership.userId
                      and appUser.deletedAt is null
                      and (:fullClanAccess = true or exists (
                           select visibleRole.id
                           from MemberRoleEntity visibleRole
                           where visibleRole.membershipId = membership.id
                             and visibleRole.status = 'active'
                             and (
                                  (visibleRole.scopeType = :branchScope
                                   and visibleRole.scopeId in :visibleBranchIds)
                                  or
                                  (visibleRole.scopeType = :branchSubtreeScope
                                   and visibleRole.scopeId in :visibleSubtreeIds)
                             )
                      ))
                      and (:memberStatus is null or membership.memberStatus = :memberStatus)
                      and (:keyword is null
                           or lower(appUser.username) like concat('%', cast(:keyword as string), '%')
                           or lower(appUser.displayName) like concat('%', cast(:keyword as string), '%'))
                      and (:roleCode is null or exists (
                           select memberRole.id
                           from MemberRoleEntity memberRole, RoleEntity role
                           where memberRole.membershipId = membership.id
                             and memberRole.roleId = role.id
                             and memberRole.status = 'active'
                             and role.roleCode = :roleCode
                      ))
                      and (:scopeType is null or exists (
                           select scopedRole.id
                           from MemberRoleEntity scopedRole
                           where scopedRole.membershipId = membership.id
                             and scopedRole.status = 'active'
                             and scopedRole.scopeType = :scopeType
                      ))
                    """
    )
    Page<ClanMembershipEntity> searchMembers(
            @Param("clanId") Long clanId,
            @Param("keyword") String keyword,
            @Param("roleCode") String roleCode,
            @Param("scopeType") MemberRoleScopeType scopeType,
            @Param("memberStatus") MemberStatus memberStatus,
            @Param("fullClanAccess") boolean fullClanAccess,
            @Param("branchScope") MemberRoleScopeType branchScope,
            @Param("branchSubtreeScope") MemberRoleScopeType branchSubtreeScope,
            @Param("visibleBranchIds") Collection<Long> visibleBranchIds,
            @Param("visibleSubtreeIds") Collection<Long> visibleSubtreeIds,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select membership from ClanMembershipEntity membership where membership.clanId = :clanId order by membership.id")
    List<ClanMembershipEntity> lockByClanId(@Param("clanId") Long clanId);
}
