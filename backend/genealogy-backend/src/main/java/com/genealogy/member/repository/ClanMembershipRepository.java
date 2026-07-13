package com.genealogy.member.repository;

import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.enums.MemberStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClanMembershipRepository extends JpaRepository<ClanMembershipEntity, Long>, JpaSpecificationExecutor<ClanMembershipEntity> {

    Optional<ClanMembershipEntity> findByClanIdAndUserId(Long clanId, Long userId);

    Optional<ClanMembershipEntity> findByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByClanIdAndMemberStatus(Long clanId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByUserIdAndMemberStatus(Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByPersonId(Long personId);

    boolean existsByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select membership from ClanMembershipEntity membership where membership.clanId = :clanId order by membership.id")
    List<ClanMembershipEntity> lockAllByClanId(@Param("clanId") Long clanId);
}
