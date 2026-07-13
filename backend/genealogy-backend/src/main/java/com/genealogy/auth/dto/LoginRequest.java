package com.genealogy.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "用户名不能为空")
        String username,

        @NotBlank(message = "密码不能为空")
        String password,

        Boolean rememberMe
) {
    public LoginRequest(String username, String password) {
        this(username, password, false);
    }

    public boolean rememberMeEnabled() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
