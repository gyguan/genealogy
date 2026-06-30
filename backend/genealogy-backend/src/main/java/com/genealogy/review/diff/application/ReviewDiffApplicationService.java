package com.genealogy.review.diff.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.diff.dto.ReviewDiffField;
import com.genealogy.review.diff.dto.ReviewDiffResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class ReviewDiffApplicationService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ReviewDiffApplicationService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ReviewDiffResponse byReviewTask(Long reviewTaskId) {
        List<ReviewDiffResponse> rows = jdbcTemplate.query(
                """
                select t.id as review_task_id, r.id as revision_id, r.clan_id, r.target_type, r.target_id,
                       r.change_type, r.diff_summary, r.before_data::text as before_data, r.after_data::text as after_data
                  from review_task t
                  join revision r on r.id = t.revision_id
                 where t.id = ?
                """,
                (rs, rowNum) -> build(
                        rs.getLong("review_task_id"), rs.getLong("revision_id"), rs.getLong("clan_id"),
                        rs.getString("target_type"), rs.getLong("target_id"), rs.getString("change_type"), rs.getString("diff_summary"),
                        rs.getString("before_data"), rs.getString("after_data")
                ),
                reviewTaskId
        );
        return rows.stream().findFirst().orElseThrow(() -> new BusinessException("REVIEW_DIFF_NOT_FOUND", "审核变更不存在"));
    }

    @Transactional(readOnly = true)
    public ReviewDiffResponse byRevision(Long revisionId) {
        List<ReviewDiffResponse> rows = jdbcTemplate.query(
                """
                select null as review_task_id, r.id as revision_id, r.clan_id, r.target_type, r.target_id,
                       r.change_type, r.diff_summary, r.before_data::text as before_data, r.after_data::text as after_data
                  from revision r
                 where r.id = ?
                """,
                (rs, rowNum) -> build(
                        null, rs.getLong("revision_id"), rs.getLong("clan_id"),
                        rs.getString("target_type"), rs.getLong("target_id"), rs.getString("change_type"), rs.getString("diff_summary"),
                        rs.getString("before_data"), rs.getString("after_data")
                ),
                revisionId
        );
        return rows.stream().findFirst().orElseThrow(() -> new BusinessException("REVIEW_DIFF_NOT_FOUND", "修订记录不存在"));
    }

    private ReviewDiffResponse build(Long reviewTaskId, Long revisionId, Long clanId, String targetType, Long targetId, String changeType, String diffSummary, String beforeData, String afterData) {
        return new ReviewDiffResponse(reviewTaskId, revisionId, clanId, targetType, targetId, changeType, diffSummary, beforeData, afterData, diffFields(beforeData, afterData));
    }

    private List<ReviewDiffField> diffFields(String beforeData, String afterData) {
        Map<String, Object> before = parse(beforeData);
        Map<String, Object> after = parse(afterData);
        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(before.keySet());
        keys.addAll(after.keySet());
        List<ReviewDiffField> fields = new ArrayList<>();
        for (String key : keys) {
            Object beforeValue = before.get(key);
            Object afterValue = after.get(key);
            if (Objects.equals(beforeValue, afterValue)) {
                continue;
            }
            String changeType = !before.containsKey(key) ? "added" : !after.containsKey(key) ? "removed" : "modified";
            fields.add(new ReviewDiffField(key, stringify(beforeValue), stringify(afterValue), changeType));
        }
        return fields;
    }

    private Map<String, Object> parse(String text) {
        if (text == null || text.isBlank() || "null".equalsIgnoreCase(text.trim())) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(text, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of("raw", text);
        }
    }

    private String stringify(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }
}
