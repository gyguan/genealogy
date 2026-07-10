package com.genealogy.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SourceCreateRequest(
        @NotBlank
        @Size(max = 200, message = "来源名称长度不能超过200")
        String sourceName,

        @NotBlank
        @Size(max = 50, message = "来源类型长度不能超过50")
        String sourceType,

        @Size(max = 100, message = "提供者长度不能超过100")
        String providerName,

        @Size(max = 200, message = "书名长度不能超过200")
        String bookTitle,

        @Size(max = 100, message = "卷号长度不能超过100")
        String volumeNo,

        @Size(max = 100, message = "页码长度不能超过100")
        String pageNo,

        @Size(max = 100, message = "资料年代长度不能超过100")
        String sourceDate,

        @Size(max = 5000, message = "摘录内容长度不能超过5000")
        String excerpt,

        String description,

        String confidenceLevel,
        String privacyLevel,
        String sensitiveLevel,
        Boolean submitReview
) {
}
