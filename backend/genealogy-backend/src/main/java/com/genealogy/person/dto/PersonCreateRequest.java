package com.genealogy.person.dto;

import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record PersonCreateRequest(
        Long branchId,

        @Size(max = 64, message = "人物编码长度不能超过64")
        String personCode,

        @NotBlank(message = "姓名不能为空")
        @Size(max = 100, message = "姓名长度不能超过100")
        String name,

        @Size(max = 100, message = "谱名长度不能超过100")
        String genealogyName,

        @Size(max = 100, message = "字长度不能超过100")
        String courtesyName,

        @Size(max = 200, message = "别名长度不能超过200")
        String aliasName,

        @Size(max = 20, message = "性别长度不能超过20")
        String gender,

        Integer generationNo,

        @Size(max = 20, message = "字辈长度不能超过20")
        String generationWord,

        @Size(max = 50, message = "排行长度不能超过50")
        String rankInFamily,

        @PastOrPresent(message = "出生日期不能晚于今天")
        LocalDate birthDate,

        @Size(max = 20, message = "出生日期精度长度不能超过20")
        String birthDatePrecision,

        @PastOrPresent(message = "逝世日期不能晚于今天")
        LocalDate deathDate,

        @Size(max = 20, message = "逝世日期精度长度不能超过20")
        String deathDatePrecision,

        Boolean isLiving,

        @Size(max = 255, message = "出生地长度不能超过255")
        String birthPlace,

        @Size(max = 255, message = "居住地长度不能超过255")
        String residencePlace,

        @Size(max = 100, message = "职业长度不能超过100")
        String occupation,

        @Size(max = 100, message = "教育程度长度不能超过100")
        String education,

        @Size(max = 200, message = "称号荣誉长度不能超过200")
        String titleOrHonor,

        @Size(max = 5000, message = "传记长度不能超过5000")
        String biography,

        @Size(max = 255, message = "墓地长度不能超过255")
        String tombPlace,

        @Size(max = 5000, message = "墓志铭长度不能超过5000")
        String epitaph,

        Boolean hasDescendant,

        @Size(max = 50, message = "世系状态长度不能超过50")
        String lineageStatus,

        @Size(max = 32, message = "隐私级别长度不能超过32")
        String privacyLevel
) {
}
