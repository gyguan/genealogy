package com.genealogy.quality.check;

import java.util.List;
import java.util.Map;

public interface QualityCheckScopeAdapter {

    boolean supports(QualityCheckScopeType scopeType);

    ResolvedQualityScope resolve(QualityCheckScopeRequest request);

    record QualityCheckScopeRequest(
            Long clanId,
            Long actorId,
            QualityCheckScopeType scopeType,
            List<String> subjectIds,
            Map<String, Object> query
    ) {
    }

    record ResolvedQualityScope(
            QualityCheckScopeType scopeType,
            List<QualityCheckSubject> subjects,
            List<String> persistedSubjectIds
    ) {
    }
}
