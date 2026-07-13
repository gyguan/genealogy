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

import java.util.List;
import java.util.Optional;

public interface ClanMembershipRepository extends JpaRepository<ClanMembershipEntity, Long> {

    Optional<ClanMembershipEntity> findByClanIdAndUserId(Long clanId, Long userId);

    Optional<ClanMembershipEntity> findByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByClanIdAndMemberStatus(Long clanId, MemberStatus memberStatus);

    Page<ClanMembershipEntity> findByClanId(Long clanId, Pageable pageable);

    List<ClanMembershipEntity> findByUserIdAndMemberStatus(Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByPersonId(Long personId);

    boolean existsByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    @Query(
            value = """
                    select distinct membership
                    from ClanMembershipEntity membership, AppUserEntity appUser
                    where membership.clanId = :clanId
                      and appUser.id = membership.userId
                      and appUser.deletedAt is null
                      and (:memberStatus is null or membership.memberStatus = :memberStatus)
                      and (:keyword is null
                           or lower(appUser.username) like lower(concat('%', :keyword, '%'))
                           or lower(appUser.displayName) like lower(concat('%', :keyword, '%')))
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
                      and (:memberStatus is null or membership.memberStatus = :memberStatus)
                      and (:keyword is null
                           or lower(appUser.username) like lower(concat('%', :keyword, '%'))
                           or lower(appUser.displayName) like lower(concat('%', :keyword, '%')))
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
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select membership from ClanMembershipEntity membership where membership.clanId = :clanId")
    List<ClanMembershipEntity> lockByClanId(@Param("clanId") Long clanId);
}
