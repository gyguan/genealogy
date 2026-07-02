package com.genealogy.person.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.member.entity.ClanMemberEntity;
import com.genealogy.member.enums.MemberScopeType;
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

@Service
public class PersonApplicationService {

    private static final String DEFAULT_DATA_STATUS = "draft";
    private static final String DEFAULT_PRIVACY_LEVEL = "clan_only";
    private static final String PERSON_VIEW = "person:view";
    private static final String PERSON_CREATE = "person:create";
    private static final String PERSON_UPDATE = "person:update";
    private static final String PERSON_DELETE = "person:delete";

    private final PersonRepository personRepository;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final GenSchemeRepository genSchemeRepository;
    private final GenWordRepository genWordRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public PersonApplicationService(
            PersonRepository personRepository,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            GenWordRepository genWordRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.personRepository = personRepository;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
        this.genWordRepository = genWordRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
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
            saved.setPersonCode(generateUnusedPersonCode(clanId, saved.getId()));
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
        ClanMemberEntity member = authorizationApplicationService.requirePermission(clanId, viewerId, PERSON_VIEW);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findAll(buildVisibleSpecification(clanId, member), pageRequest)
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
        if (query.clanId() == null) {
            throw new BusinessException("PERSON_SEARCH_CLAN_REQUIRED", "搜索人物必须指定宗族ID");
        }
        ensureClanExists(query.clanId());
        ensureBranchBelongsToClan(query.clanId(), query.branchId());
        ClanMemberEntity member;
        if (query.branchId() == null) {
            member = authorizationApplicationService.requirePermission(query.clanId(), viewerId, PERSON_VIEW);
        } else {
            member = authorizationApplicationService.requireBranchPermission(query.clanId(), viewerId, query.branchId(), PERSON_VIEW);
        }
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findAll(and(buildSearchSpecification(query), buildVisibleSpecification(query.clanId(), member)), pageRequest)
                .map(person -> toPrivacyAwareResponse(person, viewerId));
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
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
        ensureBranchBelongsToClan(entity.getClanId(), request.branchId());
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
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        personRepository.save(entity);
        operationLogApplicationService.record(entity.getClanId(), actorId, "person_delete", "person", entity.getId(), "删除人物：" + entity.getName(), null);
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
            if (hasText(query.gender())) {
                predicates.add(criteriaBuilder.equal(root.get("gender"), normalize(query.gender())));
            }
            if (query.generationNo() != null) {
                predicates.add(criteriaBuilder.equal(root.get("generationNo"), query.generationNo()));
            }
            if (hasText(query.generationWord())) {
                predicates.add(criteriaBuilder.equal(root.get("generationWord"), query.generationWord().trim()));
            }
            if (hasText(query.dataStatus())) {
                predicates.add(criteriaBuilder.equal(root.get("dataStatus"), normalize(query.dataStatus())));
            }
            if (hasText(query.keyword())) {
                String pattern = likePattern(query.keyword());
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("genealogyName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("courtesyName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("aliasName")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("generationWord")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("rankInFamily")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("birthPlace")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("residencePlace")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("biography")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("tombPlace")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("epitaph")), pattern)
                ));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Specification<PersonEntity> buildVisibleSpecification(Long clanId, ClanMemberEntity member) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            if (member.getScopeType() != MemberScopeType.clan) {
                List<Long> visibleBranchIds = visibleBranchIds(clanId, member);
                if (visibleBranchIds.isEmpty()) {
                    predicates.add(criteriaBuilder.disjunction());
                } else {
                    predicates.add(root.get("branchId").in(visibleBranchIds));
                }
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Specification<PersonEntity> and(Specification<PersonEntity> first, Specification<PersonEntity> second) {
        return first.and(second);
    }

    private List<Long> visibleBranchIds(Long clanId, ClanMemberEntity member) {
        Long allowedBranchId = member.getScopeId() == null ? member.getBranchId() : member.getScopeId();
        if (allowedBranchId == null) {
            return List.of();
        }
        if (member.getScopeType() == MemberScopeType.branch) {
            return List.of(allowedBranchId);
        }
        if (member.getScopeType() != MemberScopeType.branch_subtree) {
            return List.of();
        }
        BranchEntity allowedBranch = branchRepository.findByIdAndClanId(allowedBranchId, clanId)
                .orElseThrow(() -> new BusinessException("AUTH_BRANCH_SCOPE_INVALID", "授权支派不存在或不属于当前宗族"));
        String allowedPath = allowedBranch.getBranchPath();
        return branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream()
                .filter(branch -> branch.getBranchPath() != null && (branch.getBranchPath().equals(allowedPath) || branch.getBranchPath().startsWith(allowedPath + "/")))
                .map(BranchEntity::getId)
                .toList();
    }

    private PersonResponse toPrivacyAwareResponse(PersonEntity entity, Long viewerId) {
        PersonResponse response = PersonMapper.toResponse(entity);
        if (!shouldMaskSensitiveFields(entity, viewerId)) {
            return response;
        }
        return new PersonResponse(
                response.id(), response.clanId(), response.branchId(), response.personCode(), response.name(),
                response.genealogyName(), response.courtesyName(), response.aliasName(), response.gender(),
                response.generationNo(), response.generationWord(), response.rankInFamily(), null, null,
                response.deathDate(), response.deathDatePrecision(), response.isLiving(), null, null,
                response.occupation(), response.education(), response.titleOrHonor(), null, null, null,
                response.hasDescendant(), response.lineageStatus(), response.privacyLevel(), response.dataStatus(),
                response.createdBy(), response.createdAt(), response.updatedBy(), response.updatedAt()
        );
    }

    private boolean shouldMaskSensitiveFields(PersonEntity entity, Long viewerId) {
        if (!Boolean.TRUE.equals(entity.getIsLiving())) {
            return false;
        }
        if (!DEFAULT_PRIVACY_LEVEL.equals(entity.getPrivacyLevel()) && !"private".equals(entity.getPrivacyLevel())) {
            return false;
        }
        return !authorizationApplicationService.isActiveClanMember(entity.getClanId(), viewerId);
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
        List<GenerationSchemeEntity> schemes = genSchemeRepository.findByClanIdOrderByIsDefaultDescIdAsc(clanId);
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
        if (entity.getPrivacyLevel() == null) {
            entity.setPrivacyLevel(DEFAULT_PRIVACY_LEVEL);
        }
        if (entity.getDataStatus() == null) {
            entity.setDataStatus(DEFAULT_DATA_STATUS);
        }
        if (entity.getLineageStatus() == null) {
            entity.setLineageStatus("normal");
        }
    }

    private String generateUnusedPersonCode(Long clanId, Long id) {
        long baseNo = id == null ? 1 : id;
        for (int offset = 0; offset < 1000; offset++) {
            String candidate = String.format("P%06d", baseNo + offset);
            if (!personRepository.existsByClanIdAndPersonCodeAndDeletedAtIsNull(clanId, candidate)) {
                return candidate;
            }
        }
        throw new BusinessException("PERSON_CODE_GENERATE_FAILED", "人物编码生成失败，请稍后重试");
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
