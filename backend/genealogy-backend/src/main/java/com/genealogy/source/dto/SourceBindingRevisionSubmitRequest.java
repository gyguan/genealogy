package com.genealogy.source.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SourceBindingRevisionSubmitRequest(
        @Valid @NotNull SourceBindingCreateRequest binding,
        @Size(max = 1000) String changeReason
) {
}
