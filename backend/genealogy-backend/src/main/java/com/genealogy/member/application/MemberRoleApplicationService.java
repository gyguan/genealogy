package com.genealogy.member.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
public class MemberRoleApplicationService {

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_REVOKED = "revoked";

    private final MemberRoleRepository memberRoleRepository;
    private final ClanMembershipRepository clanMembershipRepository;
    private final RoleRepository roleRepository;
    private final BranchRepository branchRepository;

    public MemberRoleApplicationService(
            MemberRoleRepository memberRoleRepository,
            ClanMembershipRepository clanMembershipRepository,
            RoleRepository roleRepository,
            BranchRepository branchRepository
    ) {
        this.memberRoleRepository = memberRoleRepository;
        this.clanMembershipRepository = clanMembershipRepository;
        this.roleRepository = roleRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional
    public MemberRoleEntity grantRole(Long membershipId, Long roleId, MemberRoleScopeType scopeType, Long scopeId, Long actorId) {
        ClanMembershipEntity membership = clanMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new BusinessException("CLAN_MEMBERSHIP_NOT_FOUND", "宗族成员身份不存在"));
        if (!roleRepository.existsById(roleId)) {
            throw new BusinessException("ROLE_NOT_FOUND", "角色不存在");
        }
        MemberRoleScopeType effectiveScopeType = scopeType == null ? MemberRoleScopeType.clan : scopeType;
        Long effectiveScopeId = normalizeScopeId(membership, effectiveScopeType, scopeId);

        LocalDateTime now = LocalDateTime.now();
        MemberRoleEntity entity = memberRoleRepository
                .findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(membershipId, roleId, effectiveScopeType, effectiveScopeId)
                .orElseGet(MemberRoleEntity::new);
        entity.setMembershipId(membershipId);
        entity.setRoleId(roleId);
        entity.setScopeType(effectiveScopeType);
        entity.setScopeId(effectiveScopeId);
        entity.setStatus(STATUS_ACTIVE);
        entity.setGrantedBy(actorId);
        entity.setGrantedAt(entity.getGrantedAt() == null ? now : entity.getGrantedAt());
        entity.setRevokedAt(null);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedBy(actorId);
            entity.setCreatedAt(now);
        }
        entity.setUpdatedBy(actorId);
        entity.setUpdatedAt(now);
        return memberRoleRepository.save(entity);
    }

    @Transactional
    public MemberRoleEntity revokeRole(Long memberRoleId, Long actorId) {
        MemberRoleEntity entity = memberRoleRepository.findById(memberRoleId)
                .orElseThrow(() -> new BusinessException("MEMBER_ROLE_NOT_FOUND", "成员角色授权不存在"));
        entity.setStatus(STATUS_REVOKED);
        entity.setRevokedAt(LocalDateTime.now());
        entity.setUpdatedBy(actorId);
        entity.setUpdatedAt(LocalDateTime.now());
        return memberRoleRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public List<MemberRoleEntity> listActiveRoles(Long membershipId) {
        return memberRoleRepository.findByMembershipIdAndStatus(membershipId, STATUS_ACTIVE);
    }

    @Transactional(readOnly = true)
    public List<MemberRoleEntity> listActiveRoles(Collection<Long> membershipIds) {
        if (membershipIds == null || membershipIds.isEmpty()) {
            return List.of();
        }
        return memberRoleRepository.findByMembershipIdInAndStatus(membershipIds, STATUS_ACTIVE);
    }

    private Long normalizeScopeId(ClanMembershipEntity membership, MemberRoleScopeType scopeType, Long scopeId) {
        if (scopeType == MemberRoleScopeType.global) {
            return 0L;
        }
        if (scopeType == MemberRoleScopeType.clan) {
            return membership.getClanId();
        }
        if (scopeType == MemberRoleScopeType.self) {
            Long effectivePersonId = scopeId == null ? membership.getPersonId() : scopeId;
            if (effectivePersonId == null) {
                throw new BusinessException("MEMBER_ROLE_SELF_SCOPE_REQUIRED", "本人范围授权需要绑定谱内人物");
            }
            return effectivePersonId;
        }
        if (scopeId == null) {
            throw new BusinessException("MEMBER_ROLE_BRANCH_SCOPE_REQUIRED", "支派范围授权需要指定支派");
        }
        if (branchRepository.findByIdAndClanId(scopeId, membership.getClanId()).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "授权支派不存在或不属于当前宗族");
        }
        return scopeId;
    }
}
