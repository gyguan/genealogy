package com.genealogy.culture.application;

import com.genealogy.culture.dto.CultureItemSummaryResponse;
import com.genealogy.culture.entity.CultureItemEntity;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CultureItemMapperDeleteActionTest {

    private final CultureItemMapper mapper = new CultureItemMapper();

    @Test
    void draftKeepsDeleteAction() {
        CultureItemSummaryResponse summary = summary("draft");

        assertThat(summary.allowedActions()).contains("view", "update", "delete");
    }

    @Test
    void rejectedRemovesDeleteActionButKeepsUpdate() {
        CultureItemSummaryResponse summary = summary("rejected");

        assertThat(summary.allowedActions()).contains("view", "update").doesNotContain("delete");
    }

    private CultureItemSummaryResponse summary(String status) {
        CultureItemEntity entity = new CultureItemEntity();
        entity.setId(1L);
        entity.setClanId(2L);
        entity.setCategory("other");
        entity.setTitle("测试文化资料");
        entity.setDataStatus(status);
        entity.setConfidenceLevel("medium");
        entity.setPrivacyLevel("clan_only");
        entity.setSensitiveLevel("normal");
        return mapper.toSummary(
                entity,
                "测试宗族",
                null,
                "创建人",
                0,
                0,
                0,
                List.of("view", "update", "delete")
        );
    }
}
