package com.genealogy.person.dto;

import java.util.List;

public record PersonDuplicateCheckResponse(
        boolean duplicated,
        int candidateCount,
        List<PersonResponse> candidates,
        String message
) {
}
