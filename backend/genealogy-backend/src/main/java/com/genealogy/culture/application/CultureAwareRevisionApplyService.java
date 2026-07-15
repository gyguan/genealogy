package com.genealogy.culture.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.domain.CultureSiteDomainService;
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.dto.CultureSiteUpdateRequest;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
import com.genealogy.culture.repository.CultureSiteRepository;
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
    private final PersonRepository culturePersonRepository;
    private final CultureSiteRepository cultureSiteRepository;
    private final CultureSiteDomainService cultureSiteDomainService;

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
            CultureItemDomainService cultureItemDomainService,
            MigrationEventRepository migrationEventRepository,
            MigrationEventDomainService migrationEventDomainService,
            CultureSiteRepository cultureSiteRepository,
            CultureSiteDomainService cultureSiteDomainService
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
        this.cultureItemDomainService = cultureItemDomainService;
        this.cultureBranchRepository = branchRepository;
        this.cultureObjectMapper = objectMapper;
        this.migrationEventRepository = migrationEventRepository;
        this.migrationEventDomainService = migrationEventDomainService;
        this.culturePersonRepository = personRepository;
        this.cultureSiteRepository = cultureSiteRepository;
        this.cultureSiteDomainService = cultureSiteDomainService;
    }

    @Override
    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        String targetType = normalize(revision.getTargetType());
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            applyCultureItem(revision, applyTime);
            return;
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            applyMigrationEvent(revision, applyTime);
            return;
        }
        if (CultureSiteGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            applyCultureSite(revision, applyTime);
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
            return;
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            rejectMigrationEvent(revision);
            return;
        }
        if (CultureSiteGovernanceApplicationService.TARGET_TYPE.equals(targetType)) {
            rejectCultureSite(revision);
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
        deletePayloadIfPresent(revision.getId());
    }

    private void rejectCultureItem(AuditRecordEntity revision) {
        requireRejectReason(revision, "CULTURE_REVIEW_REASON_REQUIRED", "驳回文化资料必须填写原因");
        CultureItemEntity item = requireCultureItem(revision);
        if (CultureItemGovernanceApplicationService.CHANGE_PUBLISH.equals(normalize(revision.getChangeType()))) {
            item.setDataStatus("rejected");
            cultureItemRepository.save(item);
        }
        deletePayloadIfPresent(revision.getId());
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
        deletePayloadIfPresent(revision.getId());
    }

    private void rejectMigrationEvent(AuditRecordEntity revision) {
        requireRejectReason(revision, "MIGRATION_REVIEW_REASON_REQUIRED", "驳回迁徙事件必须填写原因");
        MigrationEventEntity event = requireMigrationEvent(revision);
        if (MigrationEventGovernanceApplicationService.CHANGE_PUBLISH.equals(normalize(revision.getChangeType()))) {
            event.setDataStatus("rejected");
            migrationEventRepository.save(event);
        }
        deletePayloadIfPresent(revision.getId());
    }

    private void applyCultureSite(AuditRecordEntity revision, LocalDateTime applyTime) {
        CultureSiteEntity site = requireCultureSite(revision);
        switch (normalize(revision.getChangeType())) {
            case CultureSiteGovernanceApplicationService.CHANGE_PUBLISH -> applySitePublish(site);
            case CultureSiteGovernanceApplicationService.CHANGE_UPDATE -> applySiteUpdate(site, revision);
            case CultureSiteGovernanceApplicationService.CHANGE_DELETE -> applySiteDelete(site, applyTime);
            case CultureSiteGovernanceApplicationService.CHANGE_ARCHIVE -> applySiteArchive(site);
            default -> throw new BusinessException("CULTURE_SITE_REVISION_CHANGE_INVALID", "文化场所变更类型不合法");
        }
        deletePayloadIfPresent(revision.getId());
    }

    private void rejectCultureSite(AuditRecordEntity revision) {
        requireRejectReason(revision, "CULTURE_SITE_REVIEW_REASON_REQUIRED", "驳回文化场所必须填写原因");
        CultureSiteEntity site = requireCultureSite(revision);
        if (CultureSiteGovernanceApplicationService.CHANGE_PUBLISH.equals(normalize(revision.getChangeType()))) {
            site.setDataStatus("rejected");
            cultureSiteRepository.save(site);
        }
        deletePayloadIfPresent(revision.getId());
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
        CultureItemUpdateRequest request = readCulturePayload(requirePayload(revision).getPayloadJson());
        cultureItemDomainService.requireExpectedVersion(item, request.version());
        if (request.branchId() != null && cultureBranchRepository.findByIdAndClanId(request.branchId(), item.getClanId()).isEmpty()) {
            throw new BusinessException("CULTURE_ITEM_BRANCH_INVALID", "支派不属于当前宗族");
        }
        cultureItemDomainService.apply(item, cultureItemDomainService.normalize(request));
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
        MigrationEventUpdateRequest request = readMigrationPayload(requirePayload(revision).getPayloadJson());
        migrationEventDomainService.requireExpectedVersion(event, request.version());
        if (cultureBranchRepository.findByIdAndClanId(request.branchId(), event.getClanId()).isEmpty()) {
            throw new BusinessException("MIGRATION_EVENT_BRANCH_INVALID", "支派不属于当前宗族");
        }
        validateFounderForApply(event.getClanId(), request.branchId(), request.founderPersonId());
        boolean sequenceConflict = migrationEventRepository
                .existsByClanIdAndBranchIdAndSequenceNoAndIdNotAndDeletedAtIsNull(
                        event.getClanId(), request.branchId(), request.sequenceNo(), event.getId());
        if (sequenceConflict) {
            throw new BusinessException("MIGRATION_EVENT_SEQUENCE_CONFLICT", "同一支派的迁徙顺序不能重复");
        }
        migrationEventDomainService.apply(event, migrationEventDomainService.normalize(request));
        event.setDataStatus("official");
        migrationEventRepository.save(event);
    }

    private void applyMigrationDelete(MigrationEventEntity event, LocalDateTime applyTime) {
        event.setDeletedAt(applyTime.atZone(BUSINESS_ZONE).toOffsetDateTime());
        migrationEventRepository.save(event);
    }

    private void applyMigrationArchive(MigrationEventEntity event) {
        event.setDataStatus("archived");
        migrationEventRepository.save(event);
    }

    private void applySitePublish(CultureSiteEntity site) {
        if (!"pending_review".equals(normalize(site.getDataStatus()))) {
            throw new BusinessException("CULTURE_SITE_REVIEW_STATE_CONFLICT", "文化场所状态与审核任务不一致");
        }
        site.setDataStatus("official");
        cultureSiteRepository.save(site);
    }

    private void applySiteUpdate(CultureSiteEntity site, AuditRecordEntity revision) {
        if (!"official".equals(normalize(site.getDataStatus()))) {
            throw new BusinessException("CULTURE_SITE_REVIEW_STATE_CONFLICT", "正式文化场所状态已变化，不能应用审核结果");
        }
        CultureSiteUpdateRequest request = readSitePayload(requirePayload(revision).getPayloadJson());
        cultureSiteDomainService.requireExpectedVersion(site, request.version());
        if (request.branchId() != null && cultureBranchRepository.findByIdAndClanId(request.branchId(), site.getClanId()).isEmpty()) {
            throw new BusinessException("CULTURE_SITE_BRANCH_INVALID", "支派不属于当前宗族");
        }
        validateRelatedPersonForApply(site.getClanId(), request.branchId(), request.relatedPersonId());
        cultureSiteDomainService.apply(site, cultureSiteDomainService.normalize(request));
        site.setDataStatus("official");
        cultureSiteRepository.save(site);
    }

    private void applySiteDelete(CultureSiteEntity site, LocalDateTime applyTime) {
        site.setDeletedAt(applyTime.atZone(BUSINESS_ZONE).toOffsetDateTime());
        cultureSiteRepository.save(site);
    }

    private void applySiteArchive(CultureSiteEntity site) {
        site.setDataStatus("archived");
        cultureSiteRepository.save(site);
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

    private CultureSiteEntity requireCultureSite(AuditRecordEntity revision) {
        CultureSiteEntity site = cultureSiteRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                .orElseThrow(() -> new BusinessException("CULTURE_SITE_NOT_FOUND", "文化场所不存在或不可见"));
        if (!Objects.equals(site.getClanId(), revision.getClanId())) {
            throw new BusinessException("CULTURE_SITE_CLAN_MISMATCH", "文化场所不属于审核任务宗族");
        }
        return site;
    }

    private CultureRevisionPayloadEntity requirePayload(AuditRecordEntity revision) {
        return payloadRepository.findById(revision.getId())
                .orElseThrow(() -> new BusinessException("CULTURE_REVISION_PAYLOAD_MISSING", "审核载荷不存在"));
    }

    private void validateFounderForApply(Long clanId, Long branchId, Long founderPersonId) {
        if (founderPersonId == null) return;
        PersonEntity founder = culturePersonRepository.findByIdAndDeletedAtIsNull(founderPersonId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_FOUNDER_INVALID", "始迁祖不存在"));
        if (!Objects.equals(founder.getClanId(), clanId)) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_CLAN_MISMATCH", "始迁祖不属于当前宗族");
        }
        if (founder.getBranchId() != null
                && !cultureBranchRepository.isDescendantOrSelf(clanId, branchId, founder.getBranchId())) {
            throw new BusinessException("MIGRATION_EVENT_FOUNDER_BRANCH_MISMATCH", "始迁祖不属于迁徙事件支派或其下级支派");
        }
    }

    private void validateRelatedPersonForApply(Long clanId, Long branchId, Long personId) {
        if (personId == null) return;
        PersonEntity person = culturePersonRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException("CULTURE_SITE_PERSON_INVALID", "关联人物不存在"));
        if (!Objects.equals(person.getClanId(), clanId)) {
            throw new BusinessException("CULTURE_SITE_PERSON_CLAN_MISMATCH", "关联人物不属于当前宗族");
        }
        if (branchId != null && person.getBranchId() != null
                && !cultureBranchRepository.isDescendantOrSelf(clanId, branchId, person.getBranchId())) {
            throw new BusinessException("CULTURE_SITE_PERSON_BRANCH_MISMATCH", "关联人物不属于场所支派或其下级支派");
        }
    }

    private CultureItemUpdateRequest readCulturePayload(String json) {
        try {
            return cultureObjectMapper.readValue(json, CultureItemUpdateRequest.class);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("CULTURE_REVISION_PAYLOAD_INVALID", "文化资料审核载荷无法解析");
        }
    }

    private MigrationEventUpdateRequest readMigrationPayload(String json) {
        try {
            return cultureObjectMapper.readValue(json, MigrationEventUpdateRequest.class);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("MIGRATION_REVISION_PAYLOAD_INVALID", "迁徙事件审核载荷无法解析");
        }
    }

    private CultureSiteUpdateRequest readSitePayload(String json) {
        try {
            return cultureObjectMapper.readValue(json, CultureSiteUpdateRequest.class);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("CULTURE_SITE_REVISION_PAYLOAD_INVALID", "文化场所审核载荷无法解析");
        }
    }

    private void requireRejectReason(AuditRecordEntity revision, String code, String message) {
        if (revision.getRejectedReason() == null || revision.getRejectedReason().isBlank()) {
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
