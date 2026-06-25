package com.genealogy.generation.application;

import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.dto.GenSchemeCreateRequest;
import com.genealogy.generation.dto.GenSchemeResponse;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class GenerationApplicationService {

    private final GenSchemeRepository schemeRepository;
    private final ClanRepository clanRepository;

    public GenerationApplicationService(GenSchemeRepository schemeRepository, ClanRepository clanRepository) {
        this.schemeRepository = schemeRepository;
        this.clanRepository = clanRepository;
    }

    @Transactional
    public GenSchemeResponse createScheme(Long clanId, GenSchemeCreateRequest request) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        GenerationSchemeEntity entity = new GenerationSchemeEntity();
        entity.setClanId(clanId);
        entity.setBranchId(request.branchId());
        entity.setSchemeName(request.schemeName());
        entity.setPoemText(request.poemText());
        entity.setStartGeneration(request.startGeneration());
        entity.setIsDefault(Boolean.TRUE.equals(request.isDefault()));
        entity.setValidationEnabled(request.validationEnabled() == null || request.validationEnabled());
        entity.setStrictMode(Boolean.TRUE.equals(request.strictMode()));
        entity.setStatus("active");
        entity.setCreatedAt(LocalDateTime.now());
        return toResponse(schemeRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<GenSchemeResponse> listSchemes(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        return schemeRepository.findAll().stream()
                .filter(item -> clanId.equals(item.getClanId()))
                .map(this::toResponse)
                .toList();
    }

    private GenSchemeResponse toResponse(GenerationSchemeEntity entity) {
        return new GenSchemeResponse(
                entity.getId(), entity.getClanId(), entity.getBranchId(), entity.getSchemeName(), entity.getPoemText(),
                entity.getStartGeneration(), entity.getIsDefault(), entity.getValidationEnabled(), entity.getStrictMode(),
                entity.getStatus(), entity.getCreatedAt()
        );
    }
}
