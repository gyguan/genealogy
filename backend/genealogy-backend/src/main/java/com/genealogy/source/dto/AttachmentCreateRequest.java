package com.genealogy.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AttachmentCreateRequest(
        @NotNull(message = "宗族ID不能为空")
        Long clanId,

        Long sourceId,

        @NotBlank(message = "文件名不能为空")
        @Size(max = 255, message = "文件名长度不能超过255")
        String fileName,

        @Size(max = 100, message = "文件类型长度不能超过100")
        String fileType,

        Long fileSize,

        @NotBlank(message = "存储路径不能为空")
        @Size(max = 500, message = "存储路径长度不能超过500")
        String storagePath,

        @Size(max = 500, message = "缩略图路径长度不能超过500")
        String thumbnailPath,

        @Size(max = 128, message = "校验值长度不能超过128")
        String checksum,

        Long uploadedBy,

        @Size(max = 32, message = "访问级别长度不能超过32")
        String accessLevel
) {
}
