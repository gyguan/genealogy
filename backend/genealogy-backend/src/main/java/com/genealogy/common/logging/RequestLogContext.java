package com.genealogy.common.logging;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;

import java.util.UUID;
import java.util.regex.Pattern;

/** Shared request logging context for synchronous HTTP request processing. */
public final class RequestLogContext {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String REQUEST_ID_ATTRIBUTE = RequestLogContext.class.getName() + ".requestId";
    public static final String REQUEST_ID_MDC_KEY = "requestId";

    private static final int MAX_REQUEST_ID_LENGTH = 128;
    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("[A-Za-z0-9._:-]{1,128}");

    private RequestLogContext() {
    }

    public static String resolveOrGenerate(HttpServletRequest request) {
        String supplied = request == null ? null : request.getHeader(REQUEST_ID_HEADER);
        if (supplied != null) {
            String normalized = supplied.trim();
            if (SAFE_REQUEST_ID.matcher(normalized).matches()) {
                return normalized;
            }
        }
        return UUID.randomUUID().toString();
    }

    public static void bind(HttpServletRequest request, String requestId) {
        if (request != null) {
            request.setAttribute(REQUEST_ID_ATTRIBUTE, requestId);
        }
        MDC.put(REQUEST_ID_MDC_KEY, requestId);
    }

    public static String currentRequestId(HttpServletRequest request) {
        if (request != null) {
            Object attribute = request.getAttribute(REQUEST_ID_ATTRIBUTE);
            if (attribute instanceof String value && !value.isBlank()) {
                return limit(value.trim());
            }
        }
        String mdcValue = MDC.get(REQUEST_ID_MDC_KEY);
        if (mdcValue != null && !mdcValue.isBlank()) {
            return limit(mdcValue.trim());
        }
        if (request != null) {
            String headerValue = request.getHeader(REQUEST_ID_HEADER);
            if (headerValue != null && !headerValue.isBlank()) {
                return limit(headerValue.trim());
            }
        }
        return "";
    }

    /** Clear before and after asynchronous or scheduled work when no request context is propagated. */
    public static void clear() {
        MDC.remove(REQUEST_ID_MDC_KEY);
    }

    private static String limit(String value) {
        return value.length() <= MAX_REQUEST_ID_LENGTH
                ? value
                : value.substring(0, MAX_REQUEST_ID_LENGTH);
    }
}
