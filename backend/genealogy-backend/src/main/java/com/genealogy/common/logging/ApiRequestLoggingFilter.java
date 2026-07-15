package com.genealogy.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
public class ApiRequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiRequestLoggingFilter.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = requestId(request);
        Throwable failure = null;
        try {
            filterChain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException exception) {
            failure = exception;
            throw exception;
        } finally {
            long costMs = Math.max(0, (System.nanoTime() - startedAt) / 1_000_000);
            log.info(
                    "api_request method={} path={} status={} costMs={} requestId={} clientIpMasked={} exceptionType={}",
                    request.getMethod(),
                    safePath(request),
                    response.getStatus(),
                    costMs,
                    requestId,
                    maskIp(clientIp(request)),
                    failure == null ? "" : failure.getClass().getSimpleName()
            );
        }
    }

    private String requestId(HttpServletRequest request) {
        String value = request.getHeader(REQUEST_ID_HEADER);
        if (value == null || value.isBlank()) {
            value = UUID.randomUUID().toString();
        }
        return limit(value.trim(), 128);
    }

    private String safePath(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null || path.isBlank()) {
            return "/";
        }
        return limit(path, 300);
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String maskIp(String value) {
        String ip = value == null ? "" : value.trim();
        if (ip.isBlank()) {
            return "";
        }
        if (ip.contains(":")) {
            int marker = ip.indexOf(':');
            return ip.substring(0, Math.min(marker + 1, ip.length())) + "***";
        }
        String[] parts = ip.split("\\.");
        if (parts.length == 4) {
            return parts[0] + "." + parts[1] + ".***.***";
        }
        return "***";
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }
}
