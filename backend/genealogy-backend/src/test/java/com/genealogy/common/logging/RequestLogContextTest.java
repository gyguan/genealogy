package com.genealogy.common.logging;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class RequestLogContextTest {

    @AfterEach
    void clear() {
        RequestLogContext.clear();
    }

    @Test
    void readsRequestAttributeBeforeMdcAndHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(RequestLogContext.REQUEST_ID_HEADER, "header-id");
        request.setAttribute(RequestLogContext.REQUEST_ID_ATTRIBUTE, "attribute-id");
        MDC.put(RequestLogContext.REQUEST_ID_MDC_KEY, "mdc-id");

        assertThat(RequestLogContext.currentRequestId(request)).isEqualTo("attribute-id");
    }

    @Test
    void fallsBackToMdcOutsideServletRequest() {
        MDC.put(RequestLogContext.REQUEST_ID_MDC_KEY, "async-context-id");

        assertThat(RequestLogContext.currentRequestId(null)).isEqualTo("async-context-id");

        RequestLogContext.clear();
        assertThat(RequestLogContext.currentRequestId(null)).isEmpty();
    }

    @Test
    void rejectsOverlongOrUnsafeClientValues() {
        MockHttpServletRequest unsafe = new MockHttpServletRequest();
        unsafe.addHeader(RequestLogContext.REQUEST_ID_HEADER, "line\nbreak");
        MockHttpServletRequest overlong = new MockHttpServletRequest();
        overlong.addHeader(RequestLogContext.REQUEST_ID_HEADER, "a".repeat(129));

        assertThat(RequestLogContext.resolveOrGenerate(unsafe))
                .matches("[0-9a-f-]{36}")
                .doesNotContain("\n");
        assertThat(RequestLogContext.resolveOrGenerate(overlong))
                .matches("[0-9a-f-]{36}");
    }
}
