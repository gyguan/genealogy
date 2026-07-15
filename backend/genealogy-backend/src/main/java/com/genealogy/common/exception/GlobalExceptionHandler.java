package com.genealogy.common.exception;

import com.genealogy.common.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Set;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

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
        HttpServletRequest request = currentRequest();
        HttpStatus status = statusFor(exception.getCode());
        log.warn(
                "api_business_exception code={} status={} path={} requestId={}",
                exception.getCode(),
                status.value(),
                path(request),
                requestId(request)
        );
        return ResponseEntity.status(status)
                .body(ApiResponse.fail(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse(ErrorCode.COMMON_BAD_REQUEST.message());
        HttpServletRequest request = currentRequest();
        log.warn(
                "api_validation_exception path={} requestId={} message={}",
                path(request),
                requestId(request),
                limit(message, 300)
        );
        return ApiResponse.fail(ErrorCode.COMMON_BAD_REQUEST.code(), message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleConstraintViolationException(ConstraintViolationException exception) {
        HttpServletRequest request = currentRequest();
        log.warn(
                "api_constraint_violation path={} requestId={} message={}",
                path(request),
                requestId(request),
                limit(exception.getMessage(), 300)
        );
        return ApiResponse.fail(ErrorCode.COMMON_BAD_REQUEST.code(), exception.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ApiResponse<Void> handleException(Exception exception) {
        HttpServletRequest request = currentRequest();
        log.error(
                "api_unexpected_exception path={} requestId={} exceptionType={}",
                path(request),
                requestId(request),
                exception.getClass().getName(),
                exception
        );
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

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }

    private String path(HttpServletRequest request) {
        if (request == null || request.getRequestURI() == null || request.getRequestURI().isBlank()) {
            return "";
        }
        return limit(request.getRequestURI(), 300);
    }

    private String requestId(HttpServletRequest request) {
        if (request == null) {
            return "";
        }
        String value = request.getHeader(REQUEST_ID_HEADER);
        return value == null || value.isBlank() ? "" : limit(value.trim(), 128);
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }
}
