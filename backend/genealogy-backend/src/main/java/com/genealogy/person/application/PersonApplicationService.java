package com.genealogy.person.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.domain.ApprovedStatusPolicy;
import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.dto.PersonSearchQuery;
import com.genealogy.person.dto.PersonUpdateRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class PersonApplicationService {

    private static final String DEFAULT_DATA_STATUS = "draft";
    private static final String DEFAULT_PRIVACY_LEVEL = "clan_only";
    private static final String DEFAULT_LIVING_PRIVACY_LEVEL = "branch_only";
    private static final String PERSON_STATUS_OFFICIAL = "official";
    private static final String PRIVACY_PUBLIC = "public";
    private static final String PRIVACY_CLAN_ONLY = "clan_only";
    private static final String PRIVACY_BRANCH_ONLY = "branch_only";
    private static final String PRIVACY_RELATIVES_ONLY = "relatives_only";
    private static final String PRIVACY_PRIVATE = "private";
    private static final String PRIVACY_SEALED = "sealed";
    private static final Set<String> ALLOWED_PRIVACY_LEVELS = Set.of(
            PRIVACY_PUBLIC,
            PRIVACY_CLAN_ONLY,
            PRIVACY_BRANCH_ONLY,
            PRIVACY_RELATIVES_ONLY,
            PRIVACY_PRIVATE,
            PRIVACY_SEALED
    );
    private static final String PERSON_VIEW = "person:view";
    private static final String PERSON_CREATE = "person:create";
    private static final String PERSON_UPDATE = "person:update";
    private static final String PERSON_DELETE = "person:delete";
    private static final String REVIEW_APPROVE = "review_task:approve";

    private final PersonRepository personRepository;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final GenSchemeRepository genSchemeRepository;
    private final GenWordRepository genWordRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonCodeGenerationService personCodeGenerationService;

    public PersonApplicationService(
            PersonRepository personRepository,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            GenWordRepository genWordRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            PersonCodeGenerationService personCodeGenerationService
    ) {
        this.personRepository = personRepository;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
        this.genWordRepository = genWordRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.personCodeGenerationService = personCodeGenerationService;
    }

    @Transactional
    public PersonResponse create(Long clanId, PersonCreateRequest request) {
        return create(clanId, request, null);
    }

    @Transactional
    public PersonResponse create(Long clanId, PersonCreateRequest request, Long actorId) {
        ensureClanExists(clanId);
        if (request.branchId() == null) {
            throw new BusinessException("PERSON_BRANCH_REQUIRED", "所属支派不能为空");
        }
        authorizationApplicationService.requireBranchPermission(clanId, actorId, request.branchId(), PERSON_CREATE);
        ensureBranchBelongsToClan(clanId, request.branchId());
        requireApprovedBranch(clanId, request.branchId());
        validatePersonCodeForCreate(clanId, request.personCode());
        validateLifeDates(request.birthDate(), request.deathDate());
        validateGenerationWord(clanId, request.branchId(), request.generationNo(), request.generationWord());
        PersonEntity entity = PersonMapper.toEntity(clanId, request);
        applyDefaults(entity);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        PersonEntity saved = personRepository.save(entity);
        if (!hasText(saved.getPersonCode())) {
            saved.setPersonCode(personCodeGenerationService.generate(clanId, saved));
            saved.setUpdatedAt(LocalDateTime.now());
            saved = personRepository.save(saved);
        }
        operationLogApplicationService.record(clanId, actorId, "person_create", "person", saved.getId(), "新增人物：" + saved.getName(), null);
        return PersonMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PersonResponse get(Long id) {
        return PersonMapper.toResponse(getActiveEntity(id));
    }

    @Transactional(readOnly = true)
    public PersonResponse get(Long id, Long viewerId) {
        PersonEntity entity = getActiveEntity(id);
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), viewerId, entity.getBranchId(), PERSON_VIEW);
        return toPrivacyAwareResponse(entity, viewerId);
    }

    @Transactional(readOnly = true)
    public PageResponse<PersonResponse> listByClan(Long clanId, int pageNo, int pageSize) {
        ensureClanExists(clanId);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findByClanIdAndDeletedAtIsNull(clanId, pageRequest)
                .map(PersonMapper::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<PersonResponse> listByClan(Long clanId, int pageNo, int pageSize, Long viewerId) {
        ensureClanExists(clanId);
        authorizationApplicationService.requirePermission(clanId, viewerId, PERSON_VIEW);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findAll(buildVisibleSpecification(clanId), pageRequest)
                .map(person -> toPrivacyAwareResponse(person, viewerId));
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<PersonResponse> listByClanAndBranch(Long clanId, Long branchId, int pageNo, int pageSize) {
        ensureClanExists(clanId);
        ensureBranchBelongsToClan(clanId, branchId);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findByClanIdAndBranchIdAndDeletedAtIsNull(clanId, branchId, pageRequest)
                .map(PersonMapper::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<PersonResponse> listByClanAndBranch(Long clanId, Long branchId, int pageNo, int pageSize, Long viewerId) {
        ensureClanExists(clanId);
        ensureBranchBelongsToClan(clanId, branchId);
        authorizationApplicationService.requireBranchPermission(clanId, viewerId, branchId, PERSON_VIEW);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findByClanIdAndBranchIdAndDeletedAtIsNull(clanId, branchId, pageRequest)
                .map(person -> toPrivacyAwareResponse(person, viewerId));
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<PersonResponse> search(PersonSearchQuery query, int pageNo, int pageSize, Long viewerId) {
        validateSearchAccess(query, viewerId);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, sortOf(query.sort()));
        Page<PersonResponse> page = personRepository.findAll(
                        and(buildSearchSpecification(query), buildVisibleSpecification(query.clanId())),
                        pageRequest
                )
                .map(person -> toPrivacyAwareResponse(person, viewerId));
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public List<PersonEntity> findForExport(PersonSearchQuery query, Long viewerId) {
        validateSearchAccess(query, viewerId);
        return personRepository.findAll(
                and(buildSearchSpecification(query), buildVisibleSpecification(query.clanId())),
                sortOf(query.sort())
        );
    }

    @Transactional
    public PersonResponse update(Long id, PersonUpdateRequest request) {
        return update(id, request, null);
    }

    @Transactional
    public PersonResponse update(Long id, PersonUpdateRequest request, Long actorId) {
        PersonEntity entity = getActiveEntity(id);
        Long effectiveBranchId = request.branchId() == null ? entity.getBranchId() : request.branchId();
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, effectiveBranchId, PERSON_UPDATE);
        requireReviewForOfficialPerson(entity, actorId, "PERSON_OFFICIAL_UPDATE_REVIEW_REQUIRED", "正式人物变更需先提交审核");
        ensureBranchBelongsToClan(entity.getClanId(), effectiveBranchId);
        requireApprovedBranch(entity.getClanId(), effectiveBranchId);
        validatePersonCodeForUpdate(entity.getClanId(), id, request.personCode());
        validateLifeDates(request.birthDate(), request.deathDate());
        validateGenerationWord(entity.getClanId(), effectiveBranchId, request.generationNo(), request.generationWord());
        PersonMapper.updateEntity(entity, request);
        applyDefaults(entity);
        entity.setUpdatedAt(LocalDateTime.now());
        PersonEntity saved = personRepository.save(entity);
        operationLogApplicationService.record(saved.getClanId(), actorId, "person_update", "person", saved.getId(), "更新人物：" + saved.getName(), null);
        return PersonMapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        delete(id, null);
    }

    @Transactional
    public void delete(Long id, Long actorId) {
        PersonEntity entity = getActiveEntity(id);
        authorizationApplicationService.requireBranchPermission(entity.getClanId(), actorId, entity.getBranchId(), PERSON_DELETE);
        DraftDeletePolicy.requireDraft(
                entity.getDataStatus(),
                "PERSON_DELETE_DRAFT_ONLY",
                "仅草稿人物可直接删除"
        );
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        personRepository.save(entity);
        operationLogApplicationService.record(entity.getClanId(), actorId, "person_delete", "person", entity.getId(), "删除人物：" + entity.getName(), null);
    }

    private void validateSearchAccess(PersonSearchQuery query, Long viewerId) {
        if (query.clanId() == null) {
            throw new BusinessException("PERSON_SEARCH_CLAN_REQUIRED", "搜索人物必须指定宗族ID");
        }
        ensureClanExists(query.clanId());
        ensureBranchBelongsToClan(query.clanId(), query.branchId());
        if (query.branchId() == null) {
            authorizationApplicationService.requirePermission(query.clanId(), viewerId, PERSON_VIEW);
        } else {
            authorizationApplicationService.requireBranchPermission(query.clanId(), viewerId, query.branchId(), PERSON_VIEW);
        }
    }

    private Specification<PersonEntity> buildSearchSpecification(PersonSearchQuery query) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), query.clanId()));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));

            if (query.branchId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), query.branchId()));
            }
            if (hasText(query.name())) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), likePattern(query.name())));
            }
            if (!query.genders().isEmpty()) {
                predicates.add(root.get("gender").in(query.genders().stream().map(this::normalize).toList()));
            }
            if (!query.generationNos().isEmpty()) {
                predicates.add(root.get("generationNo").in(query.generationNos()));
            }
            if (!query.generationWords().isEmpty()) {
                predicates.add(root.get("generationWord").in(query.generationWords()));
            }
            if (!query.dataStatuses().isEmpty()) {
                predicates.add(root.get("dataStatus").in(query.dataStatuses().stream().map(this::normalize).toList()));
            }
            if (hasText(query.keyword())) {
                String pattern = likePattern(query.keyword());
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("genealogyName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("courtesyName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("aliasName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("generationWord")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("birthPlace")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("residencePlace")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("occupation")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("personCode")), pattern)
                ));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Sort sortOf(String value) {
        return switch (value) {
            case "name,asc" -> Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("id"));
            case "generationNo,asc" -> Sort.by(
                    Sort.Order.asc("generationNo").nullsLast(),
                    Sort.Order.asc("name").ignoreCase(),
                    Sort.Order.desc("id")
            );
            default -> Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"));
        };
    }

    private Specification<PersonEntity> buildVisibleSpecification(Long clanId) {
        return (root, criteriaQuery, criteriaBuilder) -> criteriaBuilder.and(
                criteriaBuilder.equal(root.get("clanId"), clanId),
                criteriaBuilder.isNull(root.get("deletedAt"))
        );
    }

    private Specification<PersonEntity> and(Specification<PersonEntity> left, Specification<PersonEntity> right) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.and(
                left.toPredicate(root, query, criteriaBuilder),
                right.toPredicate(root, query, criteriaBuilder)
        );
    }

    private PersonResponse toPrivacyAwareResponse(PersonEntity entity, Long viewerId) {
        PersonResponse response = PersonMapper.toResponse(entity);
        if (!shouldMaskSensitiveFields(entity, viewerId)) {
            return response;
        }
        String maskedName = switch (normalizePrivacyLevel(entity.getPrivacyLevel(), entity.getIsLiving())) {
            case PRIVACY_PRIVATE, PRIVACY_RELATIVES_ONLY -> "受保护人物";
            case PRIVACY_SEALED -> "已封存人物";
            default -> response.name();
        };
        return new PersonResponse(
                response.id(), response.clanId(), response.branchId(), response.personCode(), maskedName,
                response.genealogyName(), response.courtesyName(), response.aliasName(), response.gender(),
                response.generationNo(), response.generationWord(), response.rankInFamily(), null, null, null,
                null, null, null, null, null, null, null,
                null, response.lineageStatus(), response.privacyLevel(), response.dataStatus(),
                response.createdBy(), response.createdAt(), response.updatedBy(), response.updatedAt()
        );
    }

    private boolean shouldMaskSensitiveFields(PersonEntity entity, Long viewerId) {
        String privacyLevel = normalizePrivacyLevel(entity.getPrivacyLevel(), entity.getIsLiving());
        if (PRIVACY_PUBLIC.equals(privacyLevel)) {
            return false;
        }
        if (viewerOwnsRecord(entity, viewerId)) {
            return false;
        }
        if (PRIVACY_SEALED.equals(privacyLevel)) {
            return !authorizationApplicationService.can(entity.getClanId(), viewerId, PERSON_DELETE);
        }
        if (PRIVACY_PRIVATE.equals(privacyLevel) || PRIVACY_RELATIVES_ONLY.equals(privacyLevel)) {
            return !authorizationApplicationService.can(entity.getClanId(), viewerId, PERSON_UPDATE);
        }
        if (PRIVACY_BRANCH_ONLY.equals(privacyLevel)) {
            return !hasBranchViewAccess(entity, viewerId);
        }
        if (PRIVACY_CLAN_ONLY.equals(privacyLevel)) {
            return !authorizationApplicationService.isActiveClanMember(entity.getClanId(), viewerId);
        }
        return Boolean.TRUE.equals(entity.getIsLiving()) && !authorizationApplicationService.isActiveClanMember(entity.getClanId(), viewerId);
    }

    private boolean hasBranchViewAccess(PersonEntity entity, Long viewerId) {
        try {
            authorizationApplicationService.requireBranchPermission(entity.getClanId(), viewerId, entity.getBranchId(), PERSON_VIEW);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private boolean viewerOwnsRecord(PersonEntity entity, Long viewerId) {
        if (viewerId == null) {
            return false;
        }
        return viewerId.equals(entity.getCreatedBy()) || viewerId.equals(entity.getUpdatedBy());
    }

    private void requireReviewForOfficialPerson(PersonEntity entity, Long actorId, String code, String message) {
        if (!PERSON_STATUS_OFFICIAL.equals(entity.getDataStatus())) {
            return;
        }
        if (authorizationApplicationService.can(entity.getClanId(), actorId, REVIEW_APPROVE)) {
            return;
        }
        throw new BusinessException(code, message);
    }

    private String normalizePrivacyLevel(String privacyLevel, Boolean isLiving) {
        String normalized = privacyLevel == null || privacyLevel.isBlank()
                ? (Boolean.TRUE.equals(isLiving) ? DEFAULT_LIVING_PRIVACY_LEVEL : DEFAULT_PRIVACY_LEVEL)
                : privacyLevel.trim().toLowerCase();
        if (!ALLOWED_PRIVACY_LEVELS.contains(normalized)) {
            throw new BusinessException("PERSON_PRIVACY_LEVEL_INVALID", "人物隐私级别无效");
        }
        return normalized;
    }

    private PersonEntity getActiveEntity(Long id) {
        return personRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private void ensureClanExists(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
    }

    private void requireApprovedBranch(Long clanId, Long branchId) {
        if (branchId == null) {
            return;
        }
        BranchEntity branch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException("BRANCH_CLAN_MISMATCH", "支派不存在或不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(branch.getStatus(), "BRANCH_NOT_OFFICIAL", "所属支派审核通过后才能录入或编辑人物");
    }

    private void ensureBranchBelongsToClan(Long clanId, Long branchId) {
        if (branchId == null) {
            return;
        }
        if (branchRepository.findByIdAndClanId(branchId, clanId).isEmpty()) {
            throw new BusinessException("BRANCH_CLAN_MISMATCH", "支派不存在或不属于当前宗族");
        }
    }

    private void validatePersonCodeForCreate(Long clanId, String personCode) {
        if (personCode != null && !personCode.isBlank()
                && personRepository.existsByClanIdAndPersonCodeAndDeletedAtIsNull(clanId, personCode.trim())) {
            throw new BusinessException("PERSON_CODE_DUPLICATED", "同一宗族下人物编码已存在");
        }
    }

    private void validatePersonCodeForUpdate(Long clanId, Long id, String personCode) {
        if (personCode != null && !personCode.isBlank()
                && personRepository.existsByClanIdAndPersonCodeAndIdNotAndDeletedAtIsNull(clanId, personCode.trim(), id)) {
            throw new BusinessException("PERSON_CODE_DUPLICATED", "同一宗族下人物编码已存在");
        }
    }

    private void validateLifeDates(LocalDate birthDate, LocalDate deathDate) {
        if (birthDate != null && deathDate != null && deathDate.isBefore(birthDate)) {
            throw new BusinessException("PERSON_DEATH_BEFORE_BIRTH", "逝世日期不能早于出生日期");
        }
    }

    private void validateGenerationWord(Long clanId, Long branchId, Integer generationNo, String generationWord) {
        if (generationNo == null || generationWord == null || generationWord.isBlank()) {
            return;
        }
        Optional<GenerationSchemeEntity> schemeOptional = findEffectiveScheme(clanId, branchId);
        if (schemeOptional.isEmpty()) {
            return;
        }
        GenerationSchemeEntity scheme = schemeOptional.get();
        if (!Boolean.TRUE.equals(scheme.getValidationEnabled())) {
            return;
        }
        Optional<GenerationWordEntity> expectedWordOptional = genWordRepository.findBySchemeIdAndGenerationNo(scheme.getId(), generationNo);
        if (expectedWordOptional.isEmpty()) {
            if (Boolean.TRUE.equals(scheme.getStrictMode())) {
                throw new BusinessException("GENERATION_WORD_NOT_FOUND", "当前字辈方案下不存在该代次字辈");
            }
            return;
        }
        String expectedWord = expectedWordOptional.get().getWord();
        if (!expectedWord.equals(generationWord.trim()) && Boolean.TRUE.equals(scheme.getStrictMode())) {
            throw new BusinessException(
                    "GENERATION_WORD_MISMATCH",
                    "人物字辈与字辈方案不匹配，期望字辈为：" + expectedWord
            );
        }
    }

    private Optional<GenerationSchemeEntity> findEffectiveScheme(Long clanId, Long branchId) {
        List<GenerationSchemeEntity> schemes = genSchemeRepository.findByClanIdOrderByIsDefaultDescIdAsc(clanId).stream()
                .filter(item -> ApprovedStatusPolicy.isApproved(item.getStatus()))
                .toList();
        if (schemes.isEmpty()) {
            return Optional.empty();
        }
        if (branchId != null) {
            Optional<GenerationSchemeEntity> branchScheme = schemes.stream()
                    .filter(item -> branchId.equals(item.getBranchId()))
                    .findFirst();
            if (branchScheme.isPresent()) {
                return branchScheme;
            }
        }
        return schemes.stream()
                .filter(item -> item.getBranchId() == null && Boolean.TRUE.equals(item.getIsDefault()))
                .findFirst()
                .or(() -> schemes.stream().filter(item -> item.getBranchId() == null).findFirst())
                .or(() -> schemes.stream().findFirst());
    }

    private void applyDefaults(PersonEntity entity) {
        entity.setPrivacyLevel(normalizePrivacyLevel(entity.getPrivacyLevel(), entity.getIsLiving()));
        if (entity.getDataStatus() == null) {
            entity.setDataStatus(DEFAULT_DATA_STATUS);
        }
        if (entity.getLineageStatus() == null) {
            entity.setLineageStatus("normal");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private String likePattern(String value) {
        return "%" + normalize(value).toLowerCase() + "%";
    }
}
