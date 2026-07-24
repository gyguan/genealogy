package com.genealogy.workbench.dto;

import java.util.List;
import java.util.Map;

public record WorkbenchQualityCheckRequest(
        String scopeType,
        String mode,
        List<String> subjectIds,
        Map<String, Object> query,
        List<String> ruleCodes
) {
}
