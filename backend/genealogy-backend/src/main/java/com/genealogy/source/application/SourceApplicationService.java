package com.genealogy.source.application;

import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceResponse;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class SourceApplicationService {

    private final SourceRepository sourceRepository;
    private final ClanRepository clanRepository;

    public SourceApplicationService(SourceRepository sourceRepository, ClanRepository clanRepository) {
        this.sourceRepository = sourceRepository;
        this.clanRepository = clanRepository;
    }

    @Transactional
    public SourceResponse create(Long clanId, SourceCreateRequest request) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        SourceEntity entity = new SourceEntity();
        entity.setClanId(clanId);
        entity.setSourceName(request.sourceName());
        entity.setSourceType(request.sourceType());
        entity.setProviderName(request.providerName());
        entity.setBookTitle(request.bookTitle());
        entity.setVolumeNo(request.volumeNo());
        entity.setPageNo(request.pageNo());
        entity.setExcerpt(request.excerpt());
        entity.setVerificationStatus(request.verificationStatus() == null ? "unverified" : request.verificationStatus());
        entity.setDescription(request.description());
        entity.setCreatedAt(LocalDateTime.now());
        return toResponse(sourceRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public SourceResponse get(Long id) {
        return toResponse(sourceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found")));
    }

    @Transactional(readOnly = true)
    public PageResponse<SourceResponse> listByClan(Long clanId, int pageNo, int pageSize) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<SourceResponse> page = sourceRepository.findByClanId(clanId, pageRequest).map(this::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    private SourceResponse toResponse(SourceEntity entity) {
        return new SourceResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getSourceName(),
                entity.getSourceType(),
                entity.getProviderName(),
                entity.getBookTitle(),
                entity.getVolumeNo(),
                entity.getPageNo(),
                entity.getExcerpt(),
                entity.getVerificationStatus(),
                entity.getCreatedAt()
        );
    }
}
