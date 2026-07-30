package com.genealogy.person.repository.query;

import com.genealogy.person.application.PersonDuplicateQuery;

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

    public static PersonDuplicateCriteria from(PersonDuplicateQuery query) {
        Objects.requireNonNull(query, "query");
        String word = query.generationWord() == null || query.generationWord().isBlank()
                ? null
                : query.generationWord().trim();
        return new PersonDuplicateCriteria(
                query.clanId(),
                query.branchId(),
                query.name().trim().toLowerCase(Locale.ROOT),
                query.generationNo(),
                word,
                query.birthDate()
        );
    }

    public Long getClanId() { return clanId; }
    public Long getBranchId() { return branchId; }
    public String getNormalizedName() { return normalizedName; }
    public Integer getGenerationNo() { return generationNo; }
    public String getGenerationWord() { return generationWord; }
    public LocalDate getBirthDate() { return birthDate; }
}
