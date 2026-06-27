package com.genealogy.auth.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthorizationApplicationService {

    private final AuthApplicationService authApplicationService;
    private final ClanMemberRepository clanMemberRepository;
    private final RoleRepository roleRepository;

    public AuthorizationApplicationService(
            AuthApplicationService authApplicationService,
            ClanMemberRepository clanMemberRepository,
            RoleRepository roleRepository
    ) {
        this.authApplicationService = authApplicationService;
        this.clanMemberRepository = clanMemberRepository;
        this.roleRepository = roleRepository;
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
    public ClanMemberEntity requireAnyRole(Long clanId, Long userId, String... roleCodes) {
        ClanMemberEntity member = requireClanMember(clanId, userId);
        String actualRoleCode = roleRepository.findById(member.getRoleId())
                .map(RoleEntity::getRoleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
        Set<String> allowed = Arrays.stream(roleCodes).collect(Collectors.toSet());
        if (!allowed.contains(actualRoleCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前角色无权执行该操作");
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
