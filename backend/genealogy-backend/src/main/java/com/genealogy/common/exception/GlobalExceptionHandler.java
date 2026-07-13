package com.genealogy.common.exception;

import com.genealogy.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Set;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Set<String> UNAUTHORIZED_CODES = Set.of(
            "AUTH_UNAUTHORIZED",
            "AUTH_LOGIN_FAILED",
            "AUTH_USER_NOT_FOUND"
    );
    private static final Set<String> FORBIDDEN_CODES = Set.of(
            "AUTH_FORBIDDEN",
            "AUTH_CSRF_INVALID",
            "AUTH_PUBLIC_REGISTRATION_DISABLED",
            "MEMBER_GRANT_FORBIDDEN",
            "CROSS_CLAN_ADMIN_ASSIGN_FORBIDDEN"
    );
    private static final Set<String> CONFLICT_CODES = Set.of(
            "AUTH_USERNAME_DUPLICATED",
            "AUTH_PHONE_DUPLICATED",
            "AUTH_EMAIL_DUPLICATED",
            "AUTH_INVITATION_INVALID",
            "AUTH_RESET_TOKEN_INVALID",
            "MEMBER_GRANT_DUPLICATED",
            "LAST_CLAN_ADMIN_REQUIRED",
            "USER_ALREADY_JOINED_ANOTHER_CLAN"
    );

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
        return ResponseEntity.status(statusFor(exception.getCode()))
                .body(ApiResponse.fail(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse(ErrorCode.COMMON_BAD_REQUEST.message());
        return ApiResponse.fail(ErrorCode.COMMON_BAD_REQUEST.code(), message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleConstraintViolationException(ConstraintViolationException exception) {
        return ApiResponse.fail(ErrorCode.COMMON_BAD_REQUEST.code(), exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception exception) {
        return ApiResponse.fail(ErrorCode.COMMON_SYSTEM_ERROR.code(), ErrorCode.COMMON_SYSTEM_ERROR.message());
    }

    private HttpStatus statusFor(String code) {
        if (UNAUTHORIZED_CODES.contains(code)) return HttpStatus.UNAUTHORIZED;
        if ("AUTH_LOGIN_THROTTLED".equals(code)) return HttpStatus.TOO_MANY_REQUESTS;
        if (FORBIDDEN_CODES.contains(code)) return HttpStatus.FORBIDDEN;
        if (code != null && code.endsWith("_NOT_FOUND")) return HttpStatus.NOT_FOUND;
        if (CONFLICT_CODES.contains(code)) return HttpStatus.CONFLICT;
        return HttpStatus.BAD_REQUEST;
    }
}
