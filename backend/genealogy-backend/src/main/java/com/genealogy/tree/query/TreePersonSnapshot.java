package com.genealogy.tree.query;

import com.genealogy.person.entity.PersonEntity;

import java.time.LocalDate;

/** Immutable Tree-only person projection; never managed or persisted by JPA. */
public record TreePersonSnapshot(
        Long id,
        Long clanId,
        Long branchId,
        String personCode,
        String name,
        String genealogyName,
        String courtesyName,
        String aliasName,
        String gender,
        Integer generationNo,
        String generationWord,
        String rankInFamily,
        LocalDate birthDate,
        String birthDatePrecision,
        LocalDate deathDate,
        String deathDatePrecision,
        Boolean isLiving,
        String birthPlace,
        String residencePlace,
        Boolean hasDescendant,
        String lineageStatus,
        String privacyLevel,
        String dataStatus,
        Long createdBy,
        Long updatedBy
) {
    /** Compatibility adapter for the existing visibility policy during the read-model migration. */
    public PersonEntity toDetachedEntity() {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(clanId);
        person.setBranchId(branchId);
        person.setPersonCode(personCode);
        person.setName(name);
        person.setGenealogyName(genealogyName);
        person.setCourtesyName(courtesyName);
        person.setAliasName(aliasName);
        person.setGender(gender);
        person.setGenerationNo(generationNo);
        person.setGenerationWord(generationWord);
        person.setRankInFamily(rankInFamily);
        person.setBirthDate(birthDate);
        person.setBirthDatePrecision(birthDatePrecision);
        person.setDeathDate(deathDate);
        person.setDeathDatePrecision(deathDatePrecision);
        person.setIsLiving(isLiving);
        person.setBirthPlace(birthPlace);
        person.setResidencePlace(residencePlace);
        person.setHasDescendant(hasDescendant);
        person.setLineageStatus(lineageStatus);
        person.setPrivacyLevel(privacyLevel);
        person.setDataStatus(dataStatus);
        person.setCreatedBy(createdBy);
        person.setUpdatedBy(updatedBy);
        return person;
    }
}