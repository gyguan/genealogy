package com.genealogy.quality.check;

public record QualityCheckSubject(
        String subjectId,
        String targetType,
        String payload
) {
}
