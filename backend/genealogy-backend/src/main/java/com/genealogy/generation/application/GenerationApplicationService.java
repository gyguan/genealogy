package com.genealogy.generation.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.dto.GenItemRequest;
import com.genealogy.generation.dto.GenItemResponse;
import com.genealogy.generation.dto.GenSchemeCreateRequest;
import com.genealogy.generation.dto.GenSchemeResponse;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class GenerationApplicationService {

    private static final String STATUS_DRAFT = "draft";

    private final GenSchemeRepository schemeRepository;
    private final GenWordRepository wordRepository;
    private final ClanRepository clanRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public GenerationApplicationService(GenSchemeRepository schemeRepository, GenWordRepository wordRepository, ClanRepository clanRepository, AuthorizationApplicationService authorizationApplicationService) {
        this.schemeRepository = schemeRepository;
        this.wordRepository = wordRepository;
        this.clanRepository = clanRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public GenSchemeResponse createScheme(Long clanId, GenSchemeCreateRequest request) {
        return createScheme(clanId, request, null);
    }

    @Transactional
    public GenSchemeResponse createScheme(Long clanId, GenSchemeCreateRequest request, Long actorId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, request.branchId());
        GenerationSchemeEntity entity = new GenerationSchemeEntity();
        entity.setClanId(clanId);
        entity.setBranchId(request.branchId());
        entity.setSchemeName(request.schemeName().trim());
        entity.setPoemText(trimToNull(request.poemText()));
        entity.setStartGeneration(request.startGeneration());
        entity.setIsDefault(Boolean.TRUE.equals(request.isDefault()));
        entity.setValidationEnabled(request.validationEnabled() == null || request.validationEnabled());
        entity.setStrictMode(Boolean.TRUE.equals(request.strictMode()));
        entity.setStatus(STATUS_DRAFT);
        entity.setCreatedAt(LocalDateTime.now());
        return toSchemeResponse(schemeRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public GenSchemeResponse getSchemeResponse(Long schemeId) {
        return toSchemeResponse(getScheme(schemeId));
    }

    @Transactional(readOnly = true)
    public List<GenSchemeResponse> listSchemes(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        return schemeRepository.findByClanIdOrderByIsDefaultDescIdAsc(clanId).stream().map(this::toSchemeResponse).toList();
    }

    @Transactional
    public List<GenItemResponse> replaceItems(Long schemeId, List<GenItemRequest> requests) {
        return replaceItems(schemeId, requests, null);
    }

    @Transactional
    public List<GenItemResponse> replaceItems(Long schemeId, List<GenItemRequest> requests, Long actorId) {
        GenerationSchemeEntity scheme = getScheme(schemeId);
        authorizationApplicationService.requireBranchWriteScope(scheme.getClanId(), actorId, scheme.getBranchId());
        validateItems(requests);
        wordRepository.deleteBySchemeId(schemeId);
        List<GenerationWordEntity> entities = requests.stream().map(request -> toWordEntity(schemeId, request)).toList();
        return wordRepository.saveAll(entities).stream().map(this::toItemResponse).toList();
    }

    @Transactional
    public GenItemResponse addItem(Long schemeId, GenItemRequest request) {
        return addItem(schemeId, request, null);
    }

    @Transactional
    public GenItemResponse addItem(Long schemeId, GenItemRequest request, Long actorId) {
        GenerationSchemeEntity scheme = getScheme(schemeId);
        authorizationApplicationService.requireBranchWriteScope(scheme.getClanId(), actorId, scheme.getBranchId());
        if (wordRepository.existsBySchemeIdAndGenerationNo(schemeId, request.generationNo())) {
            throw new BusinessException("GENERATION_WORD_DUPLICATED", "该代次字辈已存在");
        }
        return toItemResponse(wordRepository.save(toWordEntity(schemeId, request)));
    }

    @Transactional(readOnly = true)
    public List<GenItemResponse> listItems(Long schemeId) {
        getScheme(schemeId);
        return wordRepository.findBySchemeIdOrderByGenerationNoAsc(schemeId).stream().map(this::toItemResponse).toList();
    }

    @Transactional(readOnly = true)
    public GenItemResponse getItemByGenerationNo(Long schemeId, Integer generationNo) {
        getScheme(schemeId);
        return wordRepository.findBySchemeIdAndGenerationNo(schemeId, generationNo)
                .map(this::toItemResponse)
                .orElseThrow(() -> new BusinessException("GENERATION_WORD_NOT_FOUND", "字辈明细不存在"));
    }

    private GenerationSchemeEntity getScheme(Long schemeId) {
        return schemeRepository.findById(schemeId).orElseThrow(() -> new BusinessException("GENERATION_SCHEME_NOT_FOUND", "字辈方案不存在"));
    }

    private void validateItems(List<GenItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new BusinessException("GENERATION_WORD_EMPTY", "字辈明细不能为空");
        }
        Set<Integer> generationNos = new HashSet<>();
        for (GenItemRequest request : requests) {
            if (request.generationNo() == null || request.generationNo() <= 0) {
                throw new BusinessException("GENERATION_NO_INVALID", "代次必须为正整数");
            }
            if (request.word() == null || request.word().isBlank()) {
                throw new BusinessException("GENERATION_WORD_REQUIRED", "字辈不能为空");
            }
            if (!generationNos.add(request.generationNo())) {
                throw new BusinessException("GENERATION_WORD_DUPLICATED", "字辈明细中存在重复代次");
            }
        }
    }

    private GenerationWordEntity toWordEntity(Long schemeId, GenItemRequest request) {
        if (request.generationNo() == null || request.generationNo() <= 0) {
            throw new BusinessException("GENERATION_NO_INVALID", "代次必须为正整数");
        }
        if (request.word() == null || request.word().isBlank()) {
            throw new BusinessException("GENERATION_WORD_REQUIRED", "字辈不能为空");
        }
        GenerationWordEntity entity = new GenerationWordEntity();
        entity.setSchemeId(schemeId);
        entity.setGenerationNo(request.generationNo());
        entity.setWord(request.word().trim());
        entity.setDescription(trimToNull(request.description()));
        entity.setSortOrder(request.sortOrder() == null ? request.generationNo() : request.sortOrder());
        return entity;
    }

    private GenSchemeResponse toSchemeResponse(GenerationSchemeEntity entity) {
        return new GenSchemeResponse(entity.getId(), entity.getClanId(), entity.getBranchId(), entity.getSchemeName(), entity.getPoemText(), entity.getStartGeneration(), entity.getIsDefault(), entity.getValidationEnabled(), entity.getStrictMode(), entity.getStatus(), entity.getCreatedAt());
    }

    private GenItemResponse toItemResponse(GenerationWordEntity entity) {
        return new GenItemResponse(entity.getId(), entity.getGenerationNo(), entity.getWord(), entity.getDescription(), entity.getSortOrder());
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
