package com.genealogy.member.application;

import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.member.dto.MemberCreateRequest;
import com.genealogy.member.dto.MemberResponse;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.enums.MemberScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMemberRepository;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MemberApplicationService {

    private final ClanMemberRepository clanMemberRepository;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final AppUserRepository appUserRepository;
    private final RoleRepository roleRepository;

    public MemberApplicationService(
            ClanMemberRepository clanMemberRepository,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            AppUserRepository appUserRepository,
            RoleRepository roleRepository
    ) {
        this.clanMemberRepository = clanMemberRepository;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.appUserRepository = appUserRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public MemberResponse create(Long clanId, MemberCreateRequest request) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        if (!appUserRepository.existsById(request.userId())) {
            throw new BusinessException("USER_NOT_FOUND", "user not found");
        }
        if (!roleRepository.existsById(request.roleId())) {
            throw new BusinessException("ROLE_NOT_FOUND", "role not found");
        }
        if (clanMemberRepository.findByClanIdAndUserId(clanId, request.userId()).isPresent()) {
            throw new BusinessException("CLAN_MEMBER_DUPLICATED", "user already joined this clan");
        }
        MemberScopeType scopeType = request.scopeType() == null ? MemberScopeType.clan : request.scopeType();
        Long scopeId = normalizeScopeId(clanId, scopeType, request.scopeId(), request.branchId());
        Long branchId = normalizeBranchId(clanId, scopeType, request.branchId(), scopeId);
        ClanMemberEntity entity = new ClanMemberEntity();
        entity.setClanId(clanId);
        entity.setUserId(request.userId());
        entity.setBranchId(branchId);
        entity.setRoleId(request.roleId());
        entity.setMemberName(request.memberName());
        entity.setMemberStatus(MemberStatus.active);
        entity.setScopeType(scopeType);
        entity.setScopeId(scopeId);
        LocalDateTime now = LocalDateTime.now();
        entity.setJoinedAt(now);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return toResponse(clanMemberRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listActiveByClan(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        return clanMemberRepository.findByClanIdAndMemberStatus(clanId, MemberStatus.active).stream()
                .map(this::toResponse)
                .toList();
    }

    private Long normalizeScopeId(Long clanId, MemberScopeType scopeType, Long scopeId, Long branchId) {
        if (scopeType == MemberScopeType.clan) {
            return clanId;
        }
        Long effectiveBranchId = scopeId == null ? branchId : scopeId;
        if (effectiveBranchId == null || branchRepository.findByIdAndClanId(effectiveBranchId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "授权支派不存在或不属于当前宗族");
        }
        return effectiveBranchId;
    }

    private Long normalizeBranchId(Long clanId, MemberScopeType scopeType, Long branchId, Long scopeId) {
        if (scopeType == MemberScopeType.branch) {
            Long effectiveBranchId = branchId == null ? scopeId : branchId;
            if (branchRepository.findByIdAndClanId(effectiveBranchId, clanId).isEmpty()) {
                throw new BusinessException("BRANCH_CLAN_MISMATCH", "授权支派不存在或不属于当前宗族");
            }
            return effectiveBranchId;
        }
        if (branchId != null && branchRepository.findByIdAndClanId(branchId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "branch not found in clan");
        }
        return branchId;
    }

    private MemberResponse toResponse(ClanMemberEntity entity) {
        return new MemberResponse(
                entity.getId(), entity.getClanId(), entity.getUserId(), entity.getBranchId(), entity.getRoleId(),
                entity.getMemberName(), entity.getMemberStatus(), entity.getScopeType(), entity.getScopeId(),
                entity.getJoinedAt(), entity.getCreatedAt()
        );
    }
}
