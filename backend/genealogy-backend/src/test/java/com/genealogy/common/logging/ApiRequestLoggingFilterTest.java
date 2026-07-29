package com.genealogy.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ApiRequestLoggingFilterTest {

    private final TestableApiRequestLoggingFilter filter = new TestableApiRequestLoggingFilter();

    @AfterEach
    void clearMdc() {
        RequestLogContext.clear();
    }

    @Test
    void skipsNonApiPaths() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/swagger-ui.html");

        assertThat(filter.skips(request)).isTrue();
    }

    @Test
    void appliesToApiPaths() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/clans");

        assertThat(filter.skips(request)).isFalse();
    }

    @Test
    void generatesRequestIdAndPropagatesItToResponseAttributeAndMdc() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/clans");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        AtomicReference<String> requestIdInsideChain = new AtomicReference<>();

        doAnswer(invocation -> {
            requestIdInsideChain.set(MDC.get(RequestLogContext.REQUEST_ID_MDC_KEY));
            assertThat(request.getAttribute(RequestLogContext.REQUEST_ID_ATTRIBUTE))
                    .isEqualTo(requestIdInsideChain.get());
            return null;
        }).when(chain).doFilter(request, response);

        filter.invoke(request, response, chain);

        assertThat(requestIdInsideChain.get()).isNotBlank();
        assertThat(response.getHeader(RequestLogContext.REQUEST_ID_HEADER))
                .isEqualTo(requestIdInsideChain.get());
        assertThat(MDC.get(RequestLogContext.REQUEST_ID_MDC_KEY)).isNull();
    }

    @Test
    void preservesSafeClientRequestIdAndCleansMdcAfterRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/clans");
        request.addHeader(RequestLogContext.REQUEST_ID_HEADER, "client-request_2026:07.29");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        doAnswer(invocation -> {
            assertThat(MDC.get(RequestLogContext.REQUEST_ID_MDC_KEY))
                    .isEqualTo("client-request_2026:07.29");
            return null;
        }).when(chain).doFilter(request, response);

        filter.invoke(request, response, chain);

        assertThat(response.getHeader(RequestLogContext.REQUEST_ID_HEADER))
                .isEqualTo("client-request_2026:07.29");
        assertThat(MDC.get(RequestLogContext.REQUEST_ID_MDC_KEY)).isNull();
    }

    @Test
    void replacesUnsafeRequestIdToPreventLogInjection() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/clans");
        request.addHeader(RequestLogContext.REQUEST_ID_HEADER, "unsafe\nrequest-id");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.invoke(request, response, chain);

        assertThat(response.getHeader(RequestLogContext.REQUEST_ID_HEADER))
                .isNotBlank()
                .doesNotContain("\n")
                .isNotEqualTo("unsafe\nrequest-id");
    }

    @Test
    void clearsStaleMdcBeforeNextApiRequest() throws Exception {
        MDC.put(RequestLogContext.REQUEST_ID_MDC_KEY, "stale-request");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/clans");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        AtomicReference<String> actual = new AtomicReference<>();

        doAnswer(invocation -> {
            actual.set(MDC.get(RequestLogContext.REQUEST_ID_MDC_KEY));
            return null;
        }).when(chain).doFilter(request, response);

        filter.invoke(request, response, chain);

        assertThat(actual.get()).isNotEqualTo("stale-request");
        assertThat(MDC.get(RequestLogContext.REQUEST_ID_MDC_KEY)).isNull();
    }

    @Test
    void letsApiRequestContinueWithoutReadingSensitivePayload() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.addHeader("Authorization", "Bearer secret-token");
        request.addHeader("Cookie", "SESSION=secret-cookie");
        request.addHeader("X-Forwarded-For", "192.0.2.8, 198.51.100.10");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.invoke(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    private static class TestableApiRequestLoggingFilter extends ApiRequestLoggingFilter {
        boolean skips(MockHttpServletRequest request) {
            return shouldNotFilter(request);
        }

        void invoke(
                MockHttpServletRequest request,
                MockHttpServletResponse response,
                FilterChain chain
        ) throws ServletException, IOException {
            doFilterInternal(request, response, chain);
        }
    }
}
