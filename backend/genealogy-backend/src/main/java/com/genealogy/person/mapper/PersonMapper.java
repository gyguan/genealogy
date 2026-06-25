package com.genealogy.person.mapper;

import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.dto.PersonUpdateRequest;
import com.genealogy.person.entity.PersonEntity;

public final class PersonMapper {

    private PersonMapper() {
    }

    public static PersonEntity toEntity(Long clanId, PersonCreateRequest request) {
        PersonEntity entity = new PersonEntity();
        entity.setClanId(clanId);
        entity.setBranchId(request.branchId());
        entity.setPersonCode(trimToNull(request.personCode()));
        entity.setName(request.name().trim());
        entity.setGenealogyName(trimToNull(request.genealogyName()));
        entity.setCourtesyName(trimToNull(request.courtesyName()));
        entity.setAliasName(trimToNull(request.aliasName()));
        entity.setGender(defaultIfBlank(request.gender(), "unknown"));
        entity.setGenerationNo(request.generationNo());
        entity.setGenerationWord(trimToNull(request.generationWord()));
        entity.setRankInFamily(trimToNull(request.rankInFamily()));
        entity.setBirthDate(request.birthDate());
        entity.setBirthDatePrecision(trimToNull(request.birthDatePrecision()));
        entity.setDeathDate(request.deathDate());
        entity.setDeathDatePrecision(trimToNull(request.deathDatePrecision()));
        entity.setIsLiving(request.isLiving());
        entity.setBirthPlace(trimToNull(request.birthPlace()));
        entity.setResidencePlace(trimToNull(request.residencePlace()));
        entity.setOccupation(trimToNull(request.occupation()));
        entity.setEducation(trimToNull(request.education()));
        entity.setTitleOrHonor(trimToNull(request.titleOrHonor()));
        entity.setBiography(trimToNull(request.biography()));
        entity.setTombPlace(trimToNull(request.tombPlace()));
        entity.setEpitaph(trimToNull(request.epitaph()));
        entity.setHasDescendant(request.hasDescendant());
        entity.setLineageStatus(defaultIfBlank(request.lineageStatus(), "normal"));
        entity.setPrivacyLevel(trimToNull(request.privacyLevel()));
        return entity;
    }

    public static void updateEntity(PersonEntity entity, PersonUpdateRequest request) {
        entity.setBranchId(request.branchId());
        entity.setPersonCode(trimToNull(request.personCode()));
        entity.setName(request.name().trim());
        entity.setGenealogyName(trimToNull(request.genealogyName()));
        entity.setCourtesyName(trimToNull(request.courtesyName()));
        entity.setAliasName(trimToNull(request.aliasName()));
        entity.setGender(defaultIfBlank(request.gender(), "unknown"));
        entity.setGenerationNo(request.generationNo());
        entity.setGenerationWord(trimToNull(request.generationWord()));
        entity.setRankInFamily(trimToNull(request.rankInFamily()));
        entity.setBirthDate(request.birthDate());
        entity.setBirthDatePrecision(trimToNull(request.birthDatePrecision()));
        entity.setDeathDate(request.deathDate());
        entity.setDeathDatePrecision(trimToNull(request.deathDatePrecision()));
        entity.setIsLiving(request.isLiving());
        entity.setBirthPlace(trimToNull(request.birthPlace()));
        entity.setResidencePlace(trimToNull(request.residencePlace()));
        entity.setOccupation(trimToNull(request.occupation()));
        entity.setEducation(trimToNull(request.education()));
        entity.setTitleOrHonor(trimToNull(request.titleOrHonor()));
        entity.setBiography(trimToNull(request.biography()));
        entity.setTombPlace(trimToNull(request.tombPlace()));
        entity.setEpitaph(trimToNull(request.epitaph()));
        entity.setHasDescendant(request.hasDescendant());
        entity.setLineageStatus(defaultIfBlank(request.lineageStatus(), "normal"));
        entity.setPrivacyLevel(trimToNull(request.privacyLevel()));
        entity.setDataStatus(trimToNull(request.dataStatus()));
    }

    public static PersonResponse toResponse(PersonEntity entity) {
        return new PersonResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getBranchId(),
                entity.getPersonCode(),
                entity.getName(),
                entity.getGenealogyName(),
                entity.getCourtesyName(),
                entity.getAliasName(),
                entity.getGender(),
                entity.getGenerationNo(),
                entity.getGenerationWord(),
                entity.getRankInFamily(),
                entity.getBirthDate(),
                entity.getBirthDatePrecision(),
                entity.getDeathDate(),
                entity.getDeathDatePrecision(),
                entity.getIsLiving(),
                entity.getBirthPlace(),
                entity.getResidencePlace(),
                entity.getOccupation(),
                entity.getEducation(),
                entity.getTitleOrHonor(),
                entity.getBiography(),
                entity.getTombPlace(),
                entity.getEpitaph(),
                entity.getHasDescendant(),
                entity.getLineageStatus(),
                entity.getPrivacyLevel(),
                entity.getDataStatus(),
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt()
        );
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String defaultIfBlank(String value, String defaultValue) {
        String trimmed = trimToNull(value);
        return trimmed == null ? defaultValue : trimmed;
    }
}
