package com.genealogy.member.repository;

import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.enums.MemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClanMemberRepository extends JpaRepository<ClanMemberEntity, Long> {

    Optional<ClanMemberEntity> findByClanIdAndUserId(Long clanId, Long userId);

    List<ClanMemberEntity> findByClanIdAndUserIdAndMemberStatus(Long clanId, Long userId, MemberStatus memberStatus);

    List<ClanMemberEntity> findByClanIdAndMemberStatus(Long clanId, MemberStatus memberStatus);

    List<ClanMemberEntity> findByUserIdAndMemberStatus(Long userId, MemberStatus memberStatus);
}
