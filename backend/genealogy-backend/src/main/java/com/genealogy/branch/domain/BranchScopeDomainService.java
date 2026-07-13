package com.genealogy.branch.domain;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
public class BranchScopeDomainService {

    private static final int MAX_BRANCH_DEPTH = 256;

    private final BranchRepository branchRepository;

    public BranchScopeDomainService(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    @Transactional(readOnly = true)
    public boolean isDescendantOrSelf(Long clanId, Long ancestorBranchId, Long targetBranchId) {
        if (clanId == null || ancestorBranchId == null || targetBranchId == null) {
            return false;
        }
        Set<Long> visited = new HashSet<>();
        Long currentId = targetBranchId;
        int depth = 0;
        while (currentId != null && visited.add(currentId) && depth++ < MAX_BRANCH_DEPTH) {
            BranchEntity current = branchRepository.findByIdAndClanId(currentId, clanId).orElse(null);
            if (current == null) {
                return false;
            }
            if (ancestorBranchId.equals(current.getId())) {
                return true;
            }
            currentId = current.getParentId();
        }
        return false;
    }

    @Transactional(readOnly = true)
    public boolean scopeCovers(
            Long clanId,
            MemberRoleScopeType sourceType,
            Long sourceId,
            MemberRoleScopeType targetType,
            Long targetId
    ) {
        if (clanId == null || sourceType == null || sourceId == null || targetType == null || targetId == null) {
            return false;
        }
        if (sourceType == MemberRoleScopeType.global) {
            return true;
        }
        if (sourceType == MemberRoleScopeType.clan) {
            return sourceId.equals(clanId) && switch (targetType) {
                case clan -> targetId.equals(clanId);
                case branch, branch_subtree -> branchRepository.findByIdAndClanId(targetId, clanId).isPresent();
                case self -> true;
                case global -> false;
            };
        }
        if (sourceType == MemberRoleScopeType.branch) {
            return targetType == MemberRoleScopeType.branch && sourceId.equals(targetId);
        }
        if (sourceType == MemberRoleScopeType.branch_subtree) {
            return (targetType == MemberRoleScopeType.branch || targetType == MemberRoleScopeType.branch_subtree)
                    && isDescendantOrSelf(clanId, sourceId, targetId);
        }
        if (sourceType == MemberRoleScopeType.self) {
            return targetType == MemberRoleScopeType.self && sourceId.equals(targetId);
        }
        return false;
    }
}
