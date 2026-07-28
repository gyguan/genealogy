package com.genealogy.workbench.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record WorkbenchTaskActionRequest(
        @NotNull @Positive Long clanId,
        @NotBlank @Size(max = 32) String action,
        @Size(max = 500) String comment,
        LocalDateTime expectedUpdatedAt
) {
}
