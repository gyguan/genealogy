package com.genealogy.member.repository;

import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.enums.MemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClanMembershipRepository extends JpaRepository<ClanMembershipEntity, Long> {

    Optional<ClanMembershipEntity> findByClanIdAndUserId(Long clanId, Long userId);

    Optional<ClanMembershipEntity> findByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByClanIdAndMemberStatus(Long clanId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByUserIdAndMemberStatus(Long userId, MemberStatus memberStatus);

    List<ClanMembershipEntity> findByPersonId(Long personId);

    boolean existsByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);
}
