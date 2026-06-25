package com.genealogy.branch.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BranchUpdateRequest(
        Long parentId,

        @NotBlank(message = "支派名称不能为空")
        @Size(max = 200, message = "支派名称长度不能超过200")
        String branchName,

        @Min(value = 0, message = "排序值不能小于0")
        Integer sortOrder,

        Long founderPersonId,

        @Size(max = 255, message = "迁出地长度不能超过255")
        String migrationFrom,

        @Size(max = 255, message = "迁入地长度不能超过255")
        String migrationTo,

        Long managerMemberId,

        @Size(max = 2000, message = "简介长度不能超过2000")
        String description,

        @Size(max = 32, message = "状态长度不能超过32")
        String status
) {
}
