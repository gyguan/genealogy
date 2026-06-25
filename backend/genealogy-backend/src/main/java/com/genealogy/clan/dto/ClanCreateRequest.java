package com.genealogy.clan.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClanCreateRequest(
        @Size(max = 64, message = "宗族编码长度不能超过64")
        String clanCode,

        @NotBlank(message = "宗族名称不能为空")
        @Size(max = 200, message = "宗族名称长度不能超过200")
        String clanName,

        @NotBlank(message = "姓氏不能为空")
        @Size(max = 50, message = "姓氏长度不能超过50")
        String surname,

        @Size(max = 100, message = "堂号长度不能超过100")
        String hallName,

        @Size(max = 100, message = "郡望长度不能超过100")
        String commandery,

        @Size(max = 255, message = "发源地长度不能超过255")
        String originPlace,

        @Size(max = 2000, message = "简介长度不能超过2000")
        String description
) {
}
