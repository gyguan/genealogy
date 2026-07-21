package com.genealogy.clan.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.dto.ClanCreateRequest;
import com.genealogy.clan.dto.ClanResponse;
import com.genealogy.clan.dto.ClanUpdateRequest;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.mapper.ClanMapper;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class ClanApplicationService {

    private static final String ROLE_CLAN_ADMIN = "clan_admin";
    private static final String CLAN_VIEW = "clan:view";
    private static final String CLAN_UPDATE = "clan:update";
    private static final String CLAN_DELETE = "clan:delete";
    private static final DateTimeFormatter CLAN_CODE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ClanApplicationService(
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public ClanResponse create(ClanCreateRequest request) {
        return create(request, null);
    }

    @Transactional
    public ClanResponse create(ClanCreateRequest request, Long creatorUserId) {
        if (creatorUserId == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        authorizationApplicationService.requireSingleClanOrCrossClanAdmin(creatorUserId, null);
        validateClanCodeForCreate(request.clanCode());
        ClanEntity entity = ClanMapper.toEntity(request);
        if (entity.getClanCode() == null || entity.getClanCode().isBlank()) {
            entity.setClanCode(generateClanCode(request.surname()));
        }
        LocalDateTime now = LocalDateTime.now();
        entity.setStatus("draft");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        ClanEntity saved = clanRepository.save(entity);
        createAdminMember(saved.getId(), creatorUserId, now);
        return ClanMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ClanResponse get(Long id) {
        return ClanMapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public ClanResponse get(Long id, Long viewerId) {
        authorizationApplicationService.requirePermission(id, viewerId, CLAN_VIEW);
        return ClanMapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<ClanResponse> list(int pageNo, int pageSize) {
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<ClanResponse> page = clanRepository.findAll(pageRequest).map(ClanMapper::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<ClanResponse> listVisible(Long viewerId, int pageNo, int pageSize) {
        if (authorizationApplicationService.isCrossClanAdmin(viewerId)) {
            return list(pageNo, pageSize);
        }
        List<Long> visibleClanIds = authorizationApplicationService.activeMemberships(viewerId).stream()
                .map(ClanMembershipEntity::getClanId)
                .distinct()
                .filter(clanId -> authorizationApplicationService.can(clanId, viewerId, CLAN_VIEW))
                .toList();
        if (visibleClanIds.isEmpty()) {
            return PageResponse.of(List.of(), 0, pageNo, pageSize);
        }
        List<ClanResponse> records = clanRepository.findByIdInOrderByIdDesc(visibleClanIds).stream()
                .skip((long) (pageNo - 1) * pageSize)
                .limit(pageSize)
                .map(ClanMapper::toResponse)
                .toList();
        return PageResponse.of(records, visibleClanIds.size(), pageNo, pageSize);
    }

    @Transactional
    public void delete(Long id) {
        delete(id, null);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        ClanEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(id, actorId, CLAN_DELETE);
        DraftDeletePolicy.requireDraft(
                entity.getStatus(),
                "CLAN_DELETE_DRAFT_ONLY",
                "仅草稿宗族可直接删除"
        );
        if (branchRepository.existsByClanId(id)) {
            throw new BusinessException("CLAN_HAS_BRANCHES", "宗族下存在支派，不能删除");
        }
        deleteMemberships(id);
        clanRepository.delete(entity);
    }

    @Transactional
    public ClanResponse update(Long id, ClanUpdateRequest request) {
        return update(id, request, null);
    }

    @Transactional
    public ClanResponse update(Long id, ClanUpdateRequest request, Long actorId) {
        ClanEntity entity = getEntity(id);
        authorizationApplicationService.requirePermission(id, actorId, CLAN_UPDATE);
        validateClanCodeForUpdate(id, request.clanCode());
        ClanMapper.updateEntity(entity, request);
        if (entity.getStatus() == null) {
            entity.setStatus("draft");
        }
        entity.setUpdatedAt(LocalDateTime.now());
        return ClanMapper.toResponse(clanRepository.save(entity));
    }

    private void createAdminMember(Long clanId, Long creatorUserId, LocalDateTime now) {
        RoleEntity adminRole = roleRepository.findByRoleCode(ROLE_CLAN_ADMIN)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "clan admin role not found"));
        ClanMembershipEntity membership = new ClanMembershipEntity();
        membership.setClanId(clanId);
        membership.setUserId(creatorUserId);
        membership.setJoinStatus("joined");
        membership.setMemberStatus(MemberStatus.active);
        membership.setInvitedBy(creatorUserId);
        membership.setJoinedAt(now);
        membership.setCreatedBy(creatorUserId);
        membership.setCreatedAt(now);
        membership.setUpdatedBy(creatorUserId);
        membership.setUpdatedAt(now);
        membership = clanMembershipRepository.save(membership);

        MemberRoleEntity memberRole = new MemberRoleEntity();
        memberRole.setMembershipId(membership.getId());
        memberRole.setRoleId(adminRole.getId());
        memberRole.setScopeType(MemberRoleScopeType.clan);
        memberRole.setScopeId(clanId);
        memberRole.setStatus("active");
        memberRole.setGrantedBy(creatorUserId);
        memberRole.setGrantedAt(now);
        memberRole.setCreatedBy(creatorUserId);
        memberRole.setCreatedAt(now);
        memberRole.setUpdatedBy(creatorUserId);
        memberRole.setUpdatedAt(now);
        memberRoleRepository.save(memberRole);
    }

    private void deleteMemberships(Long clanId) {
        List<ClanMembershipEntity> memberships = clanMembershipRepository.findByClanId(clanId);
        List<Long> membershipIds = memberships.stream()
                .map(ClanMembershipEntity::getId)
                .toList();
        if (!membershipIds.isEmpty()) {
            memberRoleRepository.deleteAll(memberRoleRepository.findByMembershipIdIn(membershipIds));
        }
        clanMembershipRepository.deleteAll(memberships);
    }

    private ClanEntity getEntity(Long id) {
        return clanRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLAN_NOT_FOUND));
    }

    private void validateClanCodeForCreate(String clanCode) {
        if (clanCode != null && !clanCode.isBlank() && clanRepository.existsByClanCode(clanCode.trim())) {
            throw new BusinessException("CLAN_CODE_DUPLICATED", "宗族编码已存在");
        }
    }

    private void validateClanCodeForUpdate(Long id, String clanCode) {
        if (clanCode != null && !clanCode.isBlank() && clanRepository.existsByClanCodeAndIdNot(clanCode.trim(), id)) {
            throw new BusinessException("CLAN_CODE_DUPLICATED", "宗族编码已存在");
        }
    }

    private String generateClanCode(String surname) {
        String prefix = normalizeSurnamePrefix(surname);
        for (int i = 0; i < 10; i++) {
            String candidate = prefix + "-" + LocalDateTime.now().format(CLAN_CODE_TIME_FORMATTER) + "-" + randomSuffix();
            if (!clanRepository.existsByClanCode(candidate)) {
                return candidate;
            }
        }
        throw new BusinessException("CLAN_CODE_GENERATE_FAILED", "宗族编码生成失败，请稍后重试");
    }

    private String normalizeSurnamePrefix(String surname) {
        if (surname == null || surname.isBlank()) {
            return "CLAN";
        }
        String value = surname.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return value.isBlank() ? "CLAN" : "CLAN" + value;
    }

    private String randomSuffix() {
        return String.format("%04d", ThreadLocalRandom.current().nextInt(10_000));
    }
}
