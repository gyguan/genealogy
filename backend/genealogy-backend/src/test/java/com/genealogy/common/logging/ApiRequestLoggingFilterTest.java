package com.genealogy.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ApiRequestLoggingFilterTest {

    private final TestableApiRequestLoggingFilter filter = new TestableApiRequestLoggingFilter();

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
