package com.genealogy.imports.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record ImportRowVersionReference(
        @NotNull @Positive Integer rowNo,
        @NotNull @PositiveOrZero Long expectedVersion
) {
}
