package com.genealogy.source.dto;

import jakarta.validation.constraints.Size;

public record SourceBindingRevisionDeleteRequest(
        @Size(max = 1000) String changeReason
) {
}
