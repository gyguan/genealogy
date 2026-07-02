package com.genealogy.branch.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.dto.BranchCreateRequest;
import com.genealogy.branch.dto.BranchResponse;
import com.genealogy.branch.dto.BranchUpdateRequest;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.mapper.BranchMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BranchApplicationService {

    private static final String BRANCH_VIEW = "branch:view";
    private static final String BRANCH_CREATE = "branch:create";
    private static final String BRANCH_UPDATE = "branch:update";
    private static final String BRANCH_DELETE = "branch:delete";

    private final BranchRepository branchRepository;
    private final ClanRepository clanRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public BranchApplicationService(BranchRepository branchRepository, ClanRepository clanRepository, AuthorizationApplicationService authorizationApplicationService) {
        this.branchRepository = branchRepository;
        this.clanRepository = clanRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public BranchResponse create(Long clanId, BranchCreateRequest request) {
        return create(clanId, request, null);
    }

    @Transactional
    public BranchResponse create(Long clanId, BranchCreateRequest request, Long actorId) {
        ensureClanExists(clanId);
        if (request.parentId() == null) {
            authorizationApplicationService.requirePermission(clanId, actorId, BRANCH_CREATE);
        } else {
            authorizationApplicationService.requireBranchPermission(clanId, actorId, request.parentId(), BRANCH_CREATE);
        }
        validateBranchNameForCreate(clanId, request.branchName());
        BranchEntity parent = getParentBranch(clanId, request.parentId());
        BranchEntity entity = BranchMapper.toEntity(clanId, request);
        applyHierarchy(entity, parent);
        LocalDateTime now = LocalDateTime.now();
        entity.setStatus("active");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        BranchEntity saved = branchRepository.save(entity);
        saved.setBranchPath(buildBranchPath(parent, saved.getId()));
        if (saved.getManagerMemberId() != null) {
            authorizationApplicationService.requireBranchManagerCandidate(clanId, saved.getManagerMemberId(), saved.getId());
        }
        return BranchMapper.toResponse(branchRepository.save(saved));
    }

    @Transactional(readOnly = true)
    public BranchResponse get(Long id) {
        return BranchMapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public BranchResponse get(Long id, Long actorId) {
        BranchEntity entity = getEntity(id);
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, entity.getId(), BRANCH_VIEW);
        return BranchMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> listByClan(Long clanId) {
        ensureClanExists(clanId);
        return branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream().map(BranchMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> listByClan(Long clanId, Long actorId) {
        ensureClanExists(clanId);
        authorizationApplicationService.requirePermission(clanId, actorId, BRANCH_VIEW);
        return branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream().map(BranchMapper::toResponse).toList();
    }

    @Transactional
    public void delete(Long id) {
        delete(id, null);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        BranchEntity entity = getEntity(id);
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, entity.getId(), BRANCH_DELETE);
        if (branchRepository.existsByParentId(id)) {
            throw new BusinessException("BRANCH_HAS_CHILDREN", "支派下存在下级支派，不能删除");
        }
        branchRepository.delete(entity);
    }

    @Transactional
    public BranchResponse update(Long id, BranchUpdateRequest request) {
        return update(id, request, null);
    }

    @Transactional
    public BranchResponse update(Long id, BranchUpdateRequest request, Long actorId) {
        BranchEntity entity = getEntity(id);
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, entity.getId(), BRANCH_UPDATE);
        if (request.parentId() != null) {
            authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, request.parentId(), BRANCH_UPDATE);
        }
        validateParentIsNotSelf(id, request.parentId());
        validateBranchNameForUpdate(entity.getClanId(), id, request.branchName());
        BranchEntity parent = getParentBranch(entity.getClanId(), request.parentId());
        validateParentIsNotDescendant(id, parent);
        BranchMapper.updateEntity(entity, request);
        applyHierarchy(entity, parent);
        entity.setBranchPath(buildBranchPath(parent, entity.getId()));
        if (entity.getManagerMemberId() != null) {
            authorizationApplicationService.requireBranchManagerCandidate(entity.getClanId(), entity.getManagerMemberId(), entity.getId());
        }
        if (entity.getStatus() == null) {
            entity.setStatus("active");
        }
        entity.setUpdatedAt(LocalDateTime.now());
        return BranchMapper.toResponse(branchRepository.save(entity));
    }

    private void ensureClanExists(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
    }

    private BranchEntity getEntity(Long id) {
        return branchRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
    }

    private BranchEntity getParentBranch(Long clanId, Long parentId) {
        if (parentId == null) {
            return null;
        }
        BranchEntity parent = getEntity(parentId);
        if (!parent.getClanId().equals(clanId)) {
            throw new BusinessException("BRANCH_PARENT_CLAN_MISMATCH", "父支派不属于当前宗族");
        }
        return parent;
    }

    private void validateParentIsNotSelf(Long id, Long parentId) {
        if (parentId != null && parentId.equals(id)) {
            throw new BusinessException("BRANCH_PARENT_SELF_NOT_ALLOWED", "支派不能将自己设置为父支派");
        }
    }

    private void validateParentIsNotDescendant(Long id, BranchEntity parent) {
        if (parent == null || parent.getBranchPath() == null) {
            return;
        }
        String wrappedPath = "/" + parent.getBranchPath() + "/";
        if (wrappedPath.contains("/" + id + "/")) {
            throw new BusinessException("BRANCH_PARENT_DESCENDANT_NOT_ALLOWED", "支派不能将自己的下级支派设置为父支派");
        }
    }

    private void validateBranchNameForCreate(Long clanId, String branchName) {
        if (branchRepository.existsByClanIdAndBranchName(clanId, branchName.trim())) {
            throw new BusinessException("BRANCH_NAME_DUPLICATED", "同一宗族下支派名称已存在");
        }
    }

    private void validateBranchNameForUpdate(Long clanId, Long id, String branchName) {
        if (branchRepository.existsByClanIdAndBranchNameAndIdNot(clanId, branchName.trim(), id)) {
            throw new BusinessException("BRANCH_NAME_DUPLICATED", "同一宗族下支派名称已存在");
        }
    }

    private void applyHierarchy(BranchEntity entity, BranchEntity parent) {
        entity.setLevel(parent == null ? 1 : parent.getLevel() + 1);
    }

    private String buildBranchPath(BranchEntity parent, Long branchId) {
        if (parent == null || parent.getBranchPath() == null || parent.getBranchPath().isBlank()) {
            return String.valueOf(branchId);
        }
        return parent.getBranchPath() + "/" + branchId;
    }
}
