package com.genealogy.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.exception.BusinessException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class AuthCookieBridgeFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/invitations/accept",
            "/api/v1/auth/password/forgot",
            "/api/v1/auth/password/reset"
    );

    private final AuthCookieService cookieService;
    private final AuthApplicationService authApplicationService;
    private final ObjectMapper objectMapper;

    public AuthCookieBridgeFilter(
            AuthCookieService cookieService,
            AuthApplicationService authApplicationService,
            ObjectMapper objectMapper
    ) {
        this.cookieService = cookieService;
        this.authApplicationService = authApplicationService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return PUBLIC_AUTH_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String explicitAuthorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        String sessionToken = cookieService.sessionToken(request);
        if ((explicitAuthorization != null && !explicitAuthorization.isBlank()) || sessionToken == null || sessionToken.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (requiresCsrf(request)) {
                authApplicationService.validateCsrf(sessionToken, request.getHeader("X-CSRF-Token"));
            }
            authApplicationService.touchSessionToken(sessionToken);
            filterChain.doFilter(new BearerRequestWrapper(request, sessionToken), response);
        } catch (BusinessException exception) {
            int status = "AUTH_CSRF_INVALID".equals(exception.getCode()) ? 403 : 401;
            if (status == 401) cookieService.clear(response);
            response.setStatus(status);
            response.setCharacterEncoding("UTF-8");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), ApiResponse.fail(exception.getCode(), exception.getMessage()));
        }
    }

    private boolean requiresCsrf(HttpServletRequest request) {
        String method = request.getMethod().toUpperCase(Locale.ROOT);
        return Set.of("POST", "PUT", "PATCH", "DELETE").contains(method);
    }

    private static final class BearerRequestWrapper extends HttpServletRequestWrapper {
        private final String authorization;

        private BearerRequestWrapper(HttpServletRequest request, String sessionToken) {
            super(request);
            this.authorization = "Bearer " + sessionToken;
        }

        @Override
        public String getHeader(String name) {
            if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) return authorization;
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) {
                return Collections.enumeration(Set.of(authorization));
            }
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            LinkedHashSet<String> names = new LinkedHashSet<>();
            Enumeration<String> existing = super.getHeaderNames();
            if (existing != null) while (existing.hasMoreElements()) names.add(existing.nextElement());
            names.add(HttpHeaders.AUTHORIZATION);
            return Collections.enumeration(names);
        }
    }
}
