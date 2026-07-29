package com.genealogy.person.application;

import java.time.LocalDate;

public record PersonDuplicateQuery(
        Long clanId,
        Long branchId,
        String name,
        Integer generationNo,
        String generationWord,
        LocalDate birthDate,
        int candidateLimit
) {
    public PersonDuplicateQuery {
        if (clanId == null) throw new IllegalArgumentException("clanId is required");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        candidateLimit = Math.max(1, Math.min(candidateLimit, 50));
    }

    public static PersonDuplicateQuery of(
            Long clanId,
            Long branchId,
            String name,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate
    ) {
        return new PersonDuplicateQuery(clanId, branchId, name, generationNo, generationWord, birthDate, 10);
    }
}
