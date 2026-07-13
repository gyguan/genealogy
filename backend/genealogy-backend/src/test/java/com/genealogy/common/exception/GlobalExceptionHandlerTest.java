package com.genealogy.common.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsAuthenticationAuthorizationNotFoundAndConflictCodesToHttpStatus() {
        assertThat(handler.handleBusinessException(new BusinessException("AUTH_UNAUTHORIZED", "login"))
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(handler.handleBusinessException(new BusinessException("AUTH_FORBIDDEN", "forbidden"))
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(handler.handleBusinessException(new BusinessException("MEMBER_NOT_FOUND", "missing"))
                .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(handler.handleBusinessException(new BusinessException("LAST_CLAN_ADMIN_REQUIRED", "conflict"))
                .getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void keepsValidationStyleBusinessErrorsAsBadRequest() {
        assertThat(handler.handleBusinessException(new BusinessException("MEMBER_SCOPE_INVALID", "invalid"))
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
