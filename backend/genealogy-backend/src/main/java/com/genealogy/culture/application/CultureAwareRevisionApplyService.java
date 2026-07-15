package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.application.AsyncAwareRevisionApplyService;
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
public class CultureAwareRevisionApplyService extends AsyncAwareRevisionApplyService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private final CultureItemRepository cultureItemRepository;
    private final CultureRevisionPayloadRepository payloadRepository;
    private final CultureItemDomainService cultureItemDomainService;
    private final BranchRepository cultureBranchRepository;
    private final ObjectMapper cultureObjectMapper;
    private final MigrationEventRepository migrationEventRepository;
    private final MigrationEventDomainService migrationEventDomainService;
    private final PersonRepository migrationPersonRepository;

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
            CultureItemDomainService domainService,
            MigrationEventRepository migrationEventRepository,
            MigrationEventDomainService migrationEventDomainService
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
        this.cultureItemDomainService = domainService;
        this.cultureBranchRepository = branchRepository;
        this.cultureObjectMapper = objectMapper;
        this.migrationEventRepository = migrationEventRepository;
        this.migrationEventDomainService = migrationEventDomainService;
        this.migrationPersonRepository = personRepository;
    }

    @Override
    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        String targetType = normalize(revision.getTargetType());
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            applyCultureItem(revision, applyTime);
            deletePayloadIfPresent(revision.getId());
            return;
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            applyMigrationEvent(revision, applyTime);
            deletePayloadIfPresent(revision.getId());
            return;
        }
        super.apply(revision, applyTime);
    }

    @Override
    @Transactional
    public void reject(AuditRecordEntity revision, LocalDateTime rejectTime) {
        String targetType = normalize(revision.getTargetType());
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            rejectCultureItem(revision);
            deletePayloadIfPresent(revision.getId());
            return;
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            rejectMigrationEvent(revision);
            deletePayloadIfPresent(revision.getId());
            return;
        }
        super.reject(revision, rejectTime);
    }

    private void applyCultureItem(AuditRecordEntity revision, LocalDateTime applyTime) {
        CultureItemEntity item = requireCultureItem(revision);
        switch (normalize(revision.getChangeType())) {
            case CultureItemGovernanceApplicationService.CHANGE_PUBLISH -> applyCulturePublish(item);
            case CultureItemGovernanceApplicationService.CHANGE_UPDATE -> applyCultureUpdate(item, revision);
            case CultureItemGovernanceApplicationService.CHANGE_DELETE -> applyCultureDelete(item, applyTime);
            case CultureItemGovernanceApplicationService.CHANGE_ARCHIVE -> applyCultureArchive(item);
            default -> throw new BusinessException("CULTURE_REVISION_CHANGE_INVALID", "文化资料变更类型不合法");
        }
    }

    private void rejectCultureItem(AuditRecordEntity revision) {
        if (revision.getRejectedReason() == null || revision.getRejectedReason().isBlank()) {
            throw new BusinessException("CULTURE_REVIEW_REASON_REQUIRED", "驳回文化资料必须填写原因");
        }
        CultureItemEntity item = requireCultureItem(revision);
        if (CultureItemGovernanceApplicationService.CHANGE_PUBLISH.equals(normalize(revision.getChangeType()))) {
            item.setDataStatus("rejected");
            cultureItemRepository.save(item);
        }
    }

    private void applyCulturePublish(CultureItemEntity item) {
        if (!"pending_review".equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("CULTURE_REVIEW_STATE_CONFLICT", "文化资料状态与审核任务不一致");
        }
        item.setDataStatus("official");
        cultureItemRepository.save(item);
    }

    private void applyCultureUpdate(CultureItemEntity item, AuditRecordEntity revision) {
        if (!"official".equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("CULTURE_REVIEW_STATE_CONFLICT", "正式文化资料状态已变化，不能应用审核结果");
        }
        CultureItemUpdateRequest request = readPayload(revision.getId(), CultureItemUpdateRequest.class, "CULTURE_REVISION_PAYLOAD_INVALID", "文化资料审核载荷无法解析");
        cultureItemDomainService.requireExpectedVersion(item, request.version());
        if (request.branchId() != null && cultureBranchRepository.findByIdAndClanId(request.branchId(), item.getClanId()).isEmpty()) {
            throw new BusinessException("CULTURE_ITEM_BRANCH_INVALID", "支派不属于当前宗族");
        }
        CultureItemDomainService.NormalizedCultureItemInput input = cultureItemDomainService.normalize(request);
        cultureItemDomainService.apply(item, input);
        item.setDataStatus("official");
        cultureItemRepository.save(item);
    }

    private void applyCultureDelete(CultureItemEntity item, LocalDateTime applyTime) {
        item.setDeletedAt(applyTime.atZone(BUSINESS_ZONE).toOffsetDateTime());
        cultureItemRepository.save(item);
    }

    private void applyCultureArchive(CultureItemEntity item) {
        item.setDataStatus("archived");
        cultureItemRepository.save(item);
    }

    private void applyMigrationEvent(AuditRecordEntity revision, LocalDateTime applyTime) {
        MigrationEventEntity event = requireMigrationEvent(revision);
        switch (normalize(revision.getChangeType())) {
            case MigrationEventGovernanceApplicationService.CHANGE_PUBLISH -> applyMigrationPublish(event);
            case MigrationEventGovernanceApplicationService.CHANGE_UPDATE -> applyMigrationUpdate(event, revision);
            case MigrationEventGovernanceApplicationService.CHANGE_DELETE -> applyMigrationDelete(event, applyTime);
            case MigrationEventGovernanceApplicationService.CHANGE_ARCHIVE -> applyMigrationArchive(event);
            default -> throw new BusinessException("MIGRATION_REVISION_CHANGE_INVALID", "迁徙事件变更类型不合法");
        }
    }

    private void rejectMigrationEvent(AuditRecordEntity revision) {
        if (revision.getRejectedReason() == null || revision.getRejectedReason().isBlank()) {
            throw new BusinessException("MIGRATION_REVIEW_REASON_REQUIRED", "驳回迁徙事件必须填写原因");
        }
        MigrationEventEntity event = requireMigrationEvent(revision);
        if (MigrationEventGovernanceApplicationService.CHANGE_PUBLISH.equals(normalize(revision.getChangeType()))) {
            event.setDataStatus("rejected");
            migrationEventRepository.save(event);
        }
    }

    private void applyMigrationPublish(MigrationEventEntity event) {
        if (!"pending_review".equals(normalize(event.getDataStatus()))) {
            throw new BusinessException("MIGRATION_REVIEW_STATE_CONFLICT", "迁徙事件状态与审核任务不一致");
        }
        event.setDataStatus("official");
        migrationEventRepository.save(event);
    }

    private void applyMigrationUpdate(MigrationEventEntity event, AuditRecordEntity revision) {
        if (!"official".equals(normalize(event.getDataStatus()))) {
            throw new BusinessException("MIGRATION_REVIEW_STATE_CONFLICT", "正式迁徙事件状态已变化，不能应用审核结果");
        }
        MigrationEventUpdateRequest request = readPayload(
                revision.getId(), MigrationEventUpdateRequest.class,
                "MIGRATION_REVISION_PAYLOAD_INVALID", "迁徙事件审核载荷无法解析"
        );
        migrationEventDomainService.requireExpectedVersion(event, request.version());
        if (cultureBranchRepository.findByIdAndClanId(request.branchId(), event.getClanId()).isEmpty()) {
            throw new BusinessException("MIGRATION_EVENT_BRANCH_INVALID", "支派不属于当前宗族");
        }
        validateMigrationFounder(event.getClanId(), request.branchId(), request.founderPersonId());
        boolean sequenceConflict = migrationEventRepository
                .existsByClanIdAndBranchIdAndSequenceNoAndIdNotAndDeletedAtIsNull(
                        event.getClanId(), request.branchId(), request.sequenceNo(), event.getId()
                );
        if (sequenceConflict) {
            throw new BusinessException("MIGRATION_EVENT_SEQUENCE_CONFLICT", "同一支派已存在相同迁徙顺序");
        }
        MigrationEventDomainService.NormalizedMigrationEventInput input = migrationEventDomainService.normalize(request);
        migrationEventDomainService.apply(event, input);
        event.setDataStatus("official");
        migrationEventRepository.save(event);
    }

    private void validateMigrationFounder(Long clanId, Long branchId, Long founderPersonId) {
        if (founderPersonId == null) return;
        PersonEntity founder = migrationPersonRepository.findByIdAndDeletedAtIsNull(founderPersonId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_FOUNDER_NOT_FOUND", "始迁祖不存在或不可用"));
        if (!Objects.equals(founder.getClanId(), clanId)) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_CLAN_MISMATCH", "始迁祖不属于当前宗族");
        }
        if (founder.getBranchId() == null
                || !cultureBranchRepository.isDescendantOrSelf(clanId, branchId, founder.getBranchId())) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_BRANCH_MISMATCH", "始迁祖不属于迁徙事件支派或其下级支派");
        }
    }

    private void applyMigrationDelete(MigrationEventEntity event, LocalDateTime applyTime) {
        event.setDeletedAt(applyTime.atZone(BUSINESS_ZONE).toOffsetDateTime());
        migrationEventRepository.save(event);
    }

    private void applyMigrationArchive(MigrationEventEntity event) {
        event.setDataStatus("archived");
        migrationEventRepository.save(event);
    }

    private CultureItemEntity requireCultureItem(AuditRecordEntity revision) {
        CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        if (!Objects.equals(item.getClanId(), revision.getClanId())) {
            throw new BusinessException("CULTURE_ITEM_CLAN_MISMATCH", "文化资料不属于审核任务宗族");
        }
        return item;
    }

    private MigrationEventEntity requireMigrationEvent(AuditRecordEntity revision) {
        MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
        if (!Objects.equals(event.getClanId(), revision.getClanId())) {
            throw new BusinessException("MIGRATION_EVENT_CLAN_MISMATCH", "迁徙事件不属于审核任务宗族");
        }
        return event;
    }

    private <T> T readPayload(Long revisionId, Class<T> type, String code, String message) {
        CultureRevisionPayloadEntity payload = payloadRepository.findById(revisionId)
                .orElseThrow(() -> new BusinessException("CULTURE_REVISION_PAYLOAD_MISSING", "审核载荷不存在"));
        try {
            return cultureObjectMapper.readValue(payload.getPayloadJson(), type);
        } catch (JsonProcessingException exception) {
            throw new BusinessException(code, message);
        }
    }

    private void deletePayloadIfPresent(Long revisionId) {
        payloadRepository.findById(revisionId).ifPresent(payloadRepository::delete);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
