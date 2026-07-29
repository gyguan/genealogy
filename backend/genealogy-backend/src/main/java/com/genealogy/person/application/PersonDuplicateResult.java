package com.genealogy.person.application;

import com.genealogy.person.dto.PersonResponse;

import java.util.List;
import java.util.Set;

public record PersonDuplicateResult(
        RiskLevel riskLevel,
        List<Candidate> candidates,
        Set<String> matchedFields,
        String explanation
) {
    public PersonDuplicateResult {
        candidates = candidates == null ? List.of() : List.copyOf(candidates);
        matchedFields = matchedFields == null ? Set.of() : Set.copyOf(matchedFields);
    }

    public boolean duplicated() {
        return !candidates.isEmpty();
    }

    public int candidateCount() {
        return candidates.size();
    }

    public enum RiskLevel {
        NONE,
        LOW,
        MEDIUM,
        HIGH
    }

    public record Candidate(PersonResponse person, Set<String> matchedFields, int score) {
        public Candidate {
            matchedFields = matchedFields == null ? Set.of() : Set.copyOf(matchedFields);
        }
    }
}
