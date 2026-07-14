package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.application.RevisionApplyService;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;

@Primary
@Service
public class CultureAwareRevisionApplyService extends RevisionApplyService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private final CultureItemRepository cultureItemRepository;
    private final CultureRevisionPayloadRepository payloadRepository;
    private final CultureItemDomainService domainService;
    private final BranchRepository cultureBranchRepository;
    private final ObjectMapper cultureObjectMapper;

    public CultureAwareRevisionApplyService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ObjectMapper objectMapper,
            CultureItemRepository cultureItemRepository,
            CultureRevisionPayloadRepository payloadRepository,
            CultureItemDomainService domainService
    ) {
        super(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                importJobRepository,
                importJobRowRepository,
                objectMapper
        );
        this.cultureItemRepository = cultureItemRepository;
        this.payloadRepository = payloadRepository;
        this.domainService = domainService;
        this.cultureBranchRepository = branchRepository;
        this.cultureObjectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        if (!CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalize(revision.getTargetType()))) {
            super.apply(revision, applyTime);
            return;
        }
        CultureItemEntity item = requireItem(revision);
        switch (normalize(revision.getChangeType())) {
            case CultureItemGovernanceApplicationService.CHANGE_PUBLISH -> applyPublish(item);
            case CultureItemGovernanceApplicationService.CHANGE_UPDATE -> applyUpdate(item, revision);
            case CultureItemGovernanceApplicationService.CHANGE_DELETE -> applyDelete(item, applyTime);
            case CultureItemGovernanceApplicationService.CHANGE_ARCHIVE -> applyArchive(item);
            default -> throw new BusinessException("CULTURE_REVISION_CHANGE_INVALID", "文化资料变更类型不合法");
        }
        payloadRepository.deleteById(revision.getId());
    }

    @Override
    @Transactional
    public void reject(AuditRecordEntity revision, LocalDateTime rejectTime) {
        if (!CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalize(revision.getTargetType()))) {
            super.reject(revision, rejectTime);
            return;
        }
        if (revision.getRejectedReason() == null || revision.getRejectedReason().isBlank()) {
            throw new BusinessException("CULTURE_REVIEW_REASON_REQUIRED", "驳回文化资料必须填写原因");
        }
        CultureItemEntity item = requireItem(revision);
        if (CultureItemGovernanceApplicationService.CHANGE_PUBLISH.equals(normalize(revision.getChangeType()))) {
            item.setDataStatus("rejected");
            cultureItemRepository.save(item);
        }
        payloadRepository.deleteById(revision.getId());
    }

    private void applyPublish(CultureItemEntity item) {
        if (!"pending_review".equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("CULTURE_REVIEW_STATE_CONFLICT", "文化资料状态与审核任务不一致");
        }
        item.setDataStatus("official");
        cultureItemRepository.save(item);
    }

    private void applyUpdate(CultureItemEntity item, AuditRecordEntity revision) {
        if (!"official".equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("CULTURE_REVIEW_STATE_CONFLICT", "正式文化资料状态已变化，不能应用审核结果");
        }
        CultureRevisionPayloadEntity payload = payloadRepository.findById(revision.getId())
                .orElseThrow(() -> new BusinessException("CULTURE_REVISION_PAYLOAD_MISSING", "文化资料审核载荷不存在"));
        CultureItemUpdateRequest request = readPayload(payload.getPayloadJson());
        domainService.requireExpectedVersion(item, request.version());
        if (request.branchId() != null && cultureBranchRepository.findByIdAndClanId(request.branchId(), item.getClanId()).isEmpty()) {
            throw new BusinessException("CULTURE_ITEM_BRANCH_INVALID", "支派不属于当前宗族");
        }
        CultureItemDomainService.NormalizedCultureItemInput input = domainService.normalize(request);
        domainService.apply(item, input);
        item.setDataStatus("official");
        cultureItemRepository.save(item);
    }

    private void applyDelete(CultureItemEntity item, LocalDateTime applyTime) {
        item.setDeletedAt(applyTime.atZone(BUSINESS_ZONE).toOffsetDateTime());
        cultureItemRepository.save(item);
    }

    private void applyArchive(CultureItemEntity item) {
        item.setDataStatus("archived");
        cultureItemRepository.save(item);
    }

    private CultureItemEntity requireItem(AuditRecordEntity revision) {
        CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        if (!Objects.equals(item.getClanId(), revision.getClanId())) {
            throw new BusinessException("CULTURE_ITEM_CLAN_MISMATCH", "文化资料不属于审核任务宗族");
        }
        return item;
    }

    private CultureItemUpdateRequest readPayload(String json) {
        try {
            return cultureObjectMapper.readValue(json, CultureItemUpdateRequest.class);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("CULTURE_REVISION_PAYLOAD_INVALID", "文化资料审核载荷无法解析");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
