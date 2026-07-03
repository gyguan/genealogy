package com.genealogy.member.application;

import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ClanMembershipApplicationService {

    private static final String JOIN_STATUS_JOINED = "joined";

    private final ClanMembershipRepository clanMembershipRepository;
    private final ClanRepository clanRepository;
    private final AppUserRepository appUserRepository;
    private final PersonRepository personRepository;

    public ClanMembershipApplicationService(
            ClanMembershipRepository clanMembershipRepository,
            ClanRepository clanRepository,
            AppUserRepository appUserRepository,
            PersonRepository personRepository
    ) {
        this.clanMembershipRepository = clanMembershipRepository;
        this.clanRepository = clanRepository;
        this.appUserRepository = appUserRepository;
        this.personRepository = personRepository;
    }

    @Transactional
    public ClanMembershipEntity create(Long clanId, Long userId, Long personId, Long actorId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        if (!appUserRepository.existsById(userId)) {
            throw new BusinessException("USER_NOT_FOUND", "用户不存在");
        }
        if (clanMembershipRepository.findByClanIdAndUserId(clanId, userId).isPresent()) {
            throw new BusinessException("CLAN_MEMBERSHIP_DUPLICATED", "该用户已经加入当前宗族");
        }
        validatePersonInClan(clanId, personId);

        LocalDateTime now = LocalDateTime.now();
        ClanMembershipEntity entity = new ClanMembershipEntity();
        entity.setClanId(clanId);
        entity.setUserId(userId);
        entity.setPersonId(personId);
        entity.setJoinStatus(JOIN_STATUS_JOINED);
        entity.setMemberStatus(MemberStatus.active);
        entity.setInvitedBy(actorId);
        entity.setJoinedAt(now);
        entity.setCreatedBy(actorId);
        entity.setCreatedAt(now);
        entity.setUpdatedBy(actorId);
        entity.setUpdatedAt(now);
        return clanMembershipRepository.save(entity);
    }

    @Transactional
    public ClanMembershipEntity linkPerson(Long membershipId, Long personId, Long actorId) {
        ClanMembershipEntity entity = requireMembership(membershipId);
        validatePersonInClan(entity.getClanId(), personId);
        entity.setPersonId(personId);
        entity.setUpdatedBy(actorId);
        entity.setUpdatedAt(LocalDateTime.now());
        return clanMembershipRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public ClanMembershipEntity requireMembership(Long membershipId) {
        return clanMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new BusinessException("CLAN_MEMBERSHIP_NOT_FOUND", "宗族成员身份不存在"));
    }

    @Transactional(readOnly = true)
    public ClanMembershipEntity requireActiveMembership(Long clanId, Long userId) {
        return clanMembershipRepository.findByClanIdAndUserIdAndMemberStatus(clanId, userId, MemberStatus.active)
                .orElseThrow(() -> new BusinessException("CLAN_MEMBERSHIP_NOT_FOUND", "当前用户不是有效宗族成员"));
    }

    @Transactional(readOnly = true)
    public List<ClanMembershipEntity> listActiveByClan(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        return clanMembershipRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active);
    }

    @Transactional(readOnly = true)
    public List<ClanMembershipEntity> listActiveByUser(Long userId) {
        return clanMembershipRepository.findByUserIdAndMemberStatus(userId, MemberStatus.active);
    }

    private void validatePersonInClan(Long clanId, Long personId) {
        if (personId == null) {
            return;
        }
        PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "绑定的谱内人物不存在"));
        if (!clanId.equals(person.getClanId())) {
            throw new BusinessException("PERSON_CLAN_MISMATCH", "绑定的谱内人物不属于当前宗族");
        }
    }
}
