package com.genealogy.clan.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.dto.ClanCreateRequest;
import com.genealogy.clan.dto.ClanResponse;
import com.genealogy.clan.dto.ClanUpdateRequest;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.mapper.ClanMapper;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ClanApplicationService {

    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;

    public ClanApplicationService(ClanRepository clanRepository, BranchRepository branchRepository) {
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional
    public ClanResponse create(ClanCreateRequest request) {
        validateClanCodeForCreate(request.clanCode());
        ClanEntity entity = ClanMapper.toEntity(request);
        LocalDateTime now = LocalDateTime.now();
        entity.setStatus("draft");
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return ClanMapper.toResponse(clanRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public ClanResponse get(Long id) {
        return ClanMapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<ClanResponse> list(int pageNo, int pageSize) {
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<ClanResponse> page = clanRepository.findAll(pageRequest).map(ClanMapper::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional
    public void delete(Long id) {
        ClanEntity entity = getEntity(id);
        if (branchRepository.existsByClanId(id)) {
            throw new BusinessException("CLAN_HAS_BRANCHES", "宗族下存在支派，不能删除");
        }
        clanRepository.delete(entity);
    }

    @Transactional
    public ClanResponse update(Long id, ClanUpdateRequest request) {
        ClanEntity entity = getEntity(id);
        validateClanCodeForUpdate(id, request.clanCode());
        ClanMapper.updateEntity(entity, request);
        if (entity.getStatus() == null) {
            entity.setStatus("draft");
        }
        entity.setUpdatedAt(LocalDateTime.now());
        return ClanMapper.toResponse(clanRepository.save(entity));
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
}
