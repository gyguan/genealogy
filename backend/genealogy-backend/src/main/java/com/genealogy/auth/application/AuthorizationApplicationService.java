package com.genealogy.auth.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthorizationApplicationService {

    private final AuthApplicationService authApplicationService;
    private final ClanMemberRepository clanMemberRepository;

    public AuthorizationApplicationService(AuthApplicationService authApplicationService, ClanMemberRepository clanMemberRepository) {
        this.authApplicationService = authApplicationService;
        this.clanMemberRepository = clanMemberRepository;
    }

    @Transactional(readOnly = true)
    public Long requireLogin(String authorization) {
        Long userId = authApplicationService.currentUserIdOrNull(authorization);
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        return userId;
    }

    @Transactional(readOnly = true)
    public Long currentUserIdOrNull(String authorization) {
        return authApplicationService.currentUserIdOrNull(authorization);
    }

    @Transactional(readOnly = true)
    public Long requireClanMember(Long clanId, String authorization) {
        Long userId = requireLogin(authorization);
        requireClanMember(clanId, userId);
        return userId;
    }

    @Transactional(readOnly = true)
    public ClanMemberEntity requireClanMember(Long clanId, Long userId) {
        if (userId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        ClanMemberEntity member = clanMemberRepository.findByClanIdAndUserId(clanId, userId)
                .orElseThrow(() -> new BusinessException("AUTH_FORBIDDEN", "当前用户不是该宗族成员"));
        if (member.getMemberStatus() != MemberStatus.active) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前用户不是有效宗族成员");
        }
        return member;
    }

    @Transactional(readOnly = true)
    public boolean isActiveClanMember(Long clanId, Long userId) {
        if (clanId == null || userId == null) {
            return false;
        }
        return clanMemberRepository.findByClanIdAndUserId(clanId, userId)
                .filter(member -> member.getMemberStatus() == MemberStatus.active)
                .isPresent();
    }
}
