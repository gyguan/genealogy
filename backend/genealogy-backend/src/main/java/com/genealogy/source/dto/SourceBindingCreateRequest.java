package com.genealogy.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SourceBindingCreateRequest(
        @NotNull(message = "来源ID不能为空")
        Long sourceId,

        @NotBlank(message = "目标类型不能为空")
        @Size(max = 50, message = "目标类型长度不能超过50")
        String targetType,

        @NotNull(message = "目标ID不能为空")
        Long targetId,

        @Size(max = 255, message = "绑定原因长度不能超过255")
        String bindingReason,

        @Size(max = 5000, message = "摘录内容长度不能超过5000")
        String excerpt,

        String confidenceLevel,
        Boolean submitReview,

        Long createdBy
) {
    public SourceBindingCreateRequest(
            Long sourceId,
            String targetType,
            Long targetId,
            String bindingReason,
            String excerpt,
            Long createdBy
    ) {
        this(sourceId, targetType, targetId, bindingReason, excerpt, null, null, createdBy);
    }
}
