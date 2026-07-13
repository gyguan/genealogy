package com.genealogy.source.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class SourceBindingTargetValidationService {

    private static final String TARGET_TYPE_GENERATION_WORD = "generation_word";
    private static final String STATUS_OFFICIAL = "official";

    private final GenerationWordRepository generationWordRepository;
    private final GenerationSchemeRepository generationSchemeRepository;

    public SourceBindingTargetValidationService(
            GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository
    ) {
        this.generationWordRepository = generationWordRepository;
        this.generationSchemeRepository = generationSchemeRepository;
    }

    @Transactional(readOnly = true)
    public void validate(Long clanId, String targetType, Long targetId) {
        if (!isGenerationWord(targetType)) {
            return;
        }
        validateGenerationWord(clanId, targetId);
    }

    private boolean isGenerationWord(String targetType) {
        return targetType != null
                && TARGET_TYPE_GENERATION_WORD.equals(targetType.trim().toLowerCase(Locale.ROOT));
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
        if (!STATUS_OFFICIAL.equals(status)) {
            throw new BusinessException("GENERATION_SCHEME_NOT_OFFICIAL", "字辈方案审核通过后才能绑定来源资料");
        }
    }
}
