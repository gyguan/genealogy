package com.genealogy.person.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.dto.PersonUpdateRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class PersonApplicationService {

    private static final String DEFAULT_DATA_STATUS = "draft";
    private static final String DEFAULT_PRIVACY_LEVEL = "clan_only";

    private final PersonRepository personRepository;
    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;

    public PersonApplicationService(
            PersonRepository personRepository,
            ClanRepository clanRepository,
            BranchRepository branchRepository
    ) {
        this.personRepository = personRepository;
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional
    public PersonResponse create(Long clanId, PersonCreateRequest request) {
        ensureClanExists(clanId);
        ensureBranchBelongsToClan(clanId, request.branchId());
        validatePersonCodeForCreate(clanId, request.personCode());
        validateLifeDates(request.birthDate(), request.deathDate());
        PersonEntity entity = PersonMapper.toEntity(clanId, request);
        applyDefaults(entity);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return PersonMapper.toResponse(personRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public PersonResponse get(Long id) {
        return PersonMapper.toResponse(getActiveEntity(id));
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
    public PageResponse<PersonResponse> listByClanAndBranch(Long clanId, Long branchId, int pageNo, int pageSize) {
        ensureClanExists(clanId);
        ensureBranchBelongsToClan(clanId, branchId);
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
        Page<PersonResponse> page = personRepository.findByClanIdAndBranchIdAndDeletedAtIsNull(clanId, branchId, pageRequest)
                .map(PersonMapper::toResponse);
        return PageResponse.of(page.getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    @Transactional
    public PersonResponse update(Long id, PersonUpdateRequest request) {
        PersonEntity entity = getActiveEntity(id);
        ensureBranchBelongsToClan(entity.getClanId(), request.branchId());
        validatePersonCodeForUpdate(entity.getClanId(), id, request.personCode());
        validateLifeDates(request.birthDate(), request.deathDate());
        PersonMapper.updateEntity(entity, request);
        applyDefaults(entity);
        entity.setUpdatedAt(LocalDateTime.now());
        return PersonMapper.toResponse(personRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        PersonEntity entity = getActiveEntity(id);
        entity.setDeletedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        personRepository.save(entity);
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
}
