package com.genealogy.person.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.dto.PersonUpdateRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.application.RevisionWorkflowApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class PersonRevisionApplicationService {

    private static final String TARGET_PERSON = "person";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String PERSON_CREATE = "person:create";
    private static final String PERSON_UPDATE = "person:update";
    private static final String PERSON_DELETE = "person:delete";

    private final PersonApplicationService personApplicationService;
    private final PersonRepository personRepository;
    private final BranchRepository branchRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RevisionWorkflowApplicationService revisionWorkflowApplicationService;

    public PersonRevisionApplicationService(
            PersonApplicationService personApplicationService,
            PersonRepository personRepository,
            BranchRepository branchRepository,
            AuthorizationApplicationService authorizationApplicationService,
            RevisionWorkflowApplicationService revisionWorkflowApplicationService
    ) {
        this.personApplicationService = personApplicationService;
        this.personRepository = personRepository;
        this.branchRepository = branchRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.revisionWorkflowApplicationService = revisionWorkflowApplicationService;
    }

    @Transactional
    public PersonResponse create(Long clanId, PersonCreateRequest request, Long actorId) {
        authorizationApplicationService.requireBranchPermission(clanId, actorId, request.branchId(), PERSON_CREATE);
        return personApplicationService.create(clanId, request, actorId);
    }

    @Transactional
    public PersonResponse update(Long id, PersonUpdateRequest request, Long actorId) {
        PersonEntity current = getActiveEntity(id);
        Long effectiveBranchId = request.branchId() == null ? current.getBranchId() : request.branchId();
        authorizationApplicationService.requireBranchPermission(current.getClanId(), actorId, effectiveBranchId, PERSON_UPDATE);
        ensureBranchBelongsToClan(current.getClanId(), effectiveBranchId);

        PersonEntity after = copyOf(current);
        PersonMapper.updateEntity(after, request);
        after.setId(current.getId());
        after.setClanId(current.getClanId());
        after.setDataStatus(STATUS_PENDING_REVIEW);
        after.setUpdatedBy(actorId);
        after.setUpdatedAt(LocalDateTime.now());

        revisionWorkflowApplicationService.submitRevision(
                current.getClanId(),
                TARGET_PERSON,
                current.getId(),
                after.getBranchId(),
                actorId,
                RevisionWorkflowApplicationService.CHANGE_PERSON_UPDATE,
                current,
                after,
                "修改人物待审核：" + after.getName(),
                "submit person update revision: " + after.getName()
        );

        current.setDataStatus(STATUS_PENDING_REVIEW);
        current.setUpdatedBy(actorId);
        current.setUpdatedAt(LocalDateTime.now());
        personRepository.save(current);
        return PersonMapper.toResponse(after);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        PersonEntity current = getActiveEntity(id);
        if (DraftDeletePolicy.isDraft(current.getDataStatus())) {
            personApplicationService.delete(id, actorId);
            return;
        }

        authorizationApplicationService.requireBranchPermission(current.getClanId(), actorId, current.getBranchId(), PERSON_DELETE);
        PersonEntity after = copyOf(current);
        after.setDataStatus(STATUS_PENDING_REVIEW);
        after.setDeletedAt(LocalDateTime.now());
        after.setUpdatedBy(actorId);
        after.setUpdatedAt(LocalDateTime.now());

        revisionWorkflowApplicationService.submitRevision(
                current.getClanId(),
                TARGET_PERSON,
                current.getId(),
                current.getBranchId(),
                actorId,
                RevisionWorkflowApplicationService.CHANGE_PERSON_DELETE,
                current,
                after,
                "删除人物待审核：" + current.getName(),
                "submit person delete revision: " + current.getName()
        );

        current.setDataStatus(STATUS_PENDING_REVIEW);
        current.setUpdatedBy(actorId);
        current.setUpdatedAt(LocalDateTime.now());
        personRepository.save(current);
    }

    private PersonEntity getActiveEntity(Long id) {
        return personRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private void ensureBranchBelongsToClan(Long clanId, Long branchId) {
        if (branchId == null) {
            throw new BusinessException("PERSON_BRANCH_REQUIRED", "所属支派不能为空");
        }
        if (branchRepository.findByIdAndClanId(branchId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "支派不存在或不属于当前宗族");
        }
    }

    private PersonEntity copyOf(PersonEntity source) {
        PersonEntity copy = new PersonEntity();
        copy.setId(source.getId());
        copy.setClanId(source.getClanId());
        copy.setBranchId(source.getBranchId());
        copy.setPersonCode(source.getPersonCode());
        copy.setName(source.getName());
        copy.setGenealogyName(source.getGenealogyName());
        copy.setCourtesyName(source.getCourtesyName());
        copy.setAliasName(source.getAliasName());
        copy.setGender(source.getGender());
        copy.setGenerationNo(source.getGenerationNo());
        copy.setGenerationWord(source.getGenerationWord());
        copy.setRankInFamily(source.getRankInFamily());
        copy.setBirthDate(source.getBirthDate());
        copy.setBirthDatePrecision(source.getBirthDatePrecision());
        copy.setDeathDate(source.getDeathDate());
        copy.setDeathDatePrecision(source.getDeathDatePrecision());
        copy.setIsLiving(source.getIsLiving());
        copy.setBirthPlace(source.getBirthPlace());
        copy.setResidencePlace(source.getResidencePlace());
        copy.setOccupation(source.getOccupation());
        copy.setEducation(source.getEducation());
        copy.setTitleOrHonor(source.getTitleOrHonor());
        copy.setBiography(source.getBiography());
        copy.setTombPlace(source.getTombPlace());
        copy.setEpitaph(source.getEpitaph());
        copy.setHasDescendant(source.getHasDescendant());
        copy.setLineageStatus(source.getLineageStatus());
        copy.setPrivacyLevel(source.getPrivacyLevel());
        copy.setDataStatus(source.getDataStatus());
        copy.setCreatedBy(source.getCreatedBy());
        copy.setCreatedAt(source.getCreatedAt());
        copy.setUpdatedBy(source.getUpdatedBy());
        copy.setUpdatedAt(source.getUpdatedAt());
        copy.setDeletedAt(source.getDeletedAt());
        return copy;
    }
}
