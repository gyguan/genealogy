package com.genealogy.person.repository.query;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;

/** Normalized duplicate matching criteria consumed by MyBatis. */
public final class PersonDuplicateCriteria {

    private final Long clanId;
    private final Long branchId;
    private final String normalizedName;
    private final Integer generationNo;
    private final String generationWord;
    private final LocalDate birthDate;

    private PersonDuplicateCriteria(
            Long clanId,
            Long branchId,
            String normalizedName,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate
    ) {
        this.clanId = Objects.requireNonNull(clanId, "clanId");
        this.branchId = branchId;
        this.normalizedName = Objects.requireNonNull(normalizedName, "normalizedName");
        this.generationNo = generationNo;
        this.generationWord = generationWord;
        this.birthDate = birthDate;
    }

    public static PersonDuplicateCriteria of(
            Long clanId,
            Long branchId,
            String name,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate
    ) {
        Objects.requireNonNull(name, "name");
        String word = generationWord == null || generationWord.isBlank()
                ? null
                : generationWord.trim();
        return new PersonDuplicateCriteria(
                clanId,
                branchId,
                name.trim().toLowerCase(Locale.ROOT),
                generationNo,
                word,
                birthDate
        );
    }

    public Long getClanId() { return clanId; }
    public Long getBranchId() { return branchId; }
    public String getNormalizedName() { return normalizedName; }
    public Integer getGenerationNo() { return generationNo; }
    public String getGenerationWord() { return generationWord; }
    public LocalDate getBirthDate() { return birthDate; }
}
