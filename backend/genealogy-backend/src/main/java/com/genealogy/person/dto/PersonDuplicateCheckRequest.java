package com.genealogy.person.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PersonDuplicateCheckRequest(
        @NotNull Long clanId,
        Long branchId,
        @NotBlank String name,
        Integer generationNo,
        String generationWord,
        LocalDate birthDate
) {
}
