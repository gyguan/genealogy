package com.genealogy.auth.application;

import com.genealogy.auth.dto.RequestUserContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RequestContextApplicationService {

    private final AuthorizationApplicationService authorizationApplicationService;

    public RequestContextApplicationService(AuthorizationApplicationService authorizationApplicationService) {
        this.authorizationApplicationService = authorizationApplicationService;
    }

    public RequestUserContext optional(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        Long userId = authorizationApplicationService.currentUserIdOrNull(authorization);
        return new RequestUserContext(userId, requestId(request), clientIp(request));
    }

    public RequestUserContext requireLogin(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        Long userId = authorizationApplicationService.requireLogin(authorization);
        return new RequestUserContext(userId, requestId(request), clientIp(request));
    }

    public RequestUserContext requireClanMember(Long clanId, HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        Long userId = authorizationApplicationService.requireClanMember(clanId, authorization);
        return new RequestUserContext(userId, requestId(request), clientIp(request));
    }

    private String requestId(HttpServletRequest request) {
        String value = request.getHeader("X-Request-Id");
        if (value == null || value.isBlank()) {
            value = request.getHeader("X-Correlation-Id");
        }
        return value == null || value.isBlank() ? UUID.randomUUID().toString() : value.trim();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
