package com.genealogy.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "用户名不能为空")
        @Size(max = 80, message = "用户名长度不能超过80")
        String username,

        @NotBlank(message = "密码不能为空")
        @Size(min = 8, max = 64, message = "密码长度必须在8到64之间")
        String password,

        @NotBlank(message = "显示名称不能为空")
        @Size(max = 120, message = "显示名称长度不能超过120")
        String displayName,

        @Size(max = 30, message = "手机号长度不能超过30")
        String phone,

        @Size(max = 120, message = "邮箱长度不能超过120")
        String email
) {
}
