package com.genealogy.source.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
public class SourceBindingTargetValidationService {

    private static final String TARGET_TYPE_GENERATION_WORD = "generation_word";
    private static final Set<String> OFFICIAL_SCHEME_STATUSES = Set.of("official", "active", "approved");

    private final SourceRepository sourceRepository;
    private final GenerationWordRepository generationWordRepository;
    private final GenerationSchemeRepository generationSchemeRepository;

    public SourceBindingTargetValidationService(
            SourceRepository sourceRepository,
            GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository
    ) {
        this.sourceRepository = sourceRepository;
        this.generationWordRepository = generationWordRepository;
        this.generationSchemeRepository = generationSchemeRepository;
    }

    @Transactional(readOnly = true)
    public void validate(Long clanId, SourceBindingCreateRequest request) {
        if (!isGenerationWord(request)) {
            return;
        }
        validateGenerationWord(clanId, request.targetId());
    }

    @Transactional(readOnly = true)
    public void validate(SourceBindingCreateRequest request) {
        if (!isGenerationWord(request)) {
            return;
        }
        SourceEntity source = sourceRepository.findById(request.sourceId())
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
        validateGenerationWord(source.getClanId(), request.targetId());
    }

    private boolean isGenerationWord(SourceBindingCreateRequest request) {
        return request != null
                && request.targetType() != null
                && TARGET_TYPE_GENERATION_WORD.equals(request.targetType().trim().toLowerCase(Locale.ROOT));
    }

    private void validateGenerationWord(Long clanId, Long generationWordId) {
        if (clanId == null || generationWordId == null) {
            throw new BusinessException("SOURCE_TARGET_INVALID", "来源绑定字辈参数不完整");
        }
        GenerationWordEntity word = generationWordRepository.findById(generationWordId)
                .orElseThrow(() -> new BusinessException("GENERATION_WORD_NOT_FOUND", "字辈明细不存在"));
        GenerationSchemeEntity scheme = generationSchemeRepository.findByIdAndClanId(word.getSchemeId(), clanId)
                .orElseThrow(() -> new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "字辈不属于当前宗族"));
        String status = scheme.getStatus() == null ? "" : scheme.getStatus().trim().toLowerCase(Locale.ROOT);
        if (!OFFICIAL_SCHEME_STATUSES.contains(status)) {
            throw new BusinessException("GENERATION_SCHEME_NOT_OFFICIAL", "字辈方案审核通过后才能绑定来源资料");
        }
    }
}
