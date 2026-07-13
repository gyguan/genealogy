package com.genealogy.auth.security;

import com.genealogy.auth.application.AuthApplicationService.AuthLoginResult;
import com.genealogy.auth.config.AuthProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;

@Component
public class AuthCookieService {

    private final AuthProperties properties;

    public AuthCookieService(AuthProperties properties) {
        this.properties = properties;
    }

    public void write(HttpServletResponse response, AuthLoginResult result) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(
                properties.getSessionCookieName(), result.sessionToken(), true, result.maxAgeSeconds()).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(
                properties.getCsrfCookieName(), result.response().csrfToken(), false, result.maxAgeSeconds()).toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(properties.getSessionCookieName(), "", true, 0).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(properties.getCsrfCookieName(), "", false, 0).toString());
    }

    public String sessionToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> properties.getSessionCookieName().equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private ResponseCookie cookie(String name, String value, boolean httpOnly, int maxAgeSeconds) {
        return ResponseCookie.from(name, value == null ? "" : value)
                .httpOnly(httpOnly)
                .secure(properties.isCookieSecure())
                .sameSite(properties.getCookieSameSite())
                .path("/")
                .maxAge(Duration.ofSeconds(Math.max(0, maxAgeSeconds)))
                .build();
    }
}
