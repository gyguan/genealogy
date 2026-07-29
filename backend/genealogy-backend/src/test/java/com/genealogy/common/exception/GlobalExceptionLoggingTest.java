package com.genealogy.common.exception;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionLoggingTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void attachAppender() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    void logsOrdinaryBadRequestAndNotFoundAtInfo() {
        handler.handleBusinessException(new BusinessException("MEMBER_SCOPE_INVALID", "invalid"));
        handler.handleBusinessException(new BusinessException("MEMBER_NOT_FOUND", "missing"));

        assertThat(appender.list)
                .extracting(ILoggingEvent::getLevel)
                .containsExactly(Level.INFO, Level.INFO);
        assertThat(appender.list)
                .extracting(ILoggingEvent::getFormattedMessage)
                .allMatch(message -> message.contains("event=api_business_exception"))
                .allMatch(message -> message.contains("errorCode="));
    }

    @Test
    void keepsSecurityRejectionAtWarn() {
        handler.handleBusinessException(new BusinessException("AUTH_CSRF_INVALID", "invalid csrf"));

        assertThat(appender.list).singleElement().satisfies(event -> {
            assertThat(event.getLevel()).isEqualTo(Level.WARN);
            assertThat(event.getFormattedMessage()).contains("result=rejected", "errorCode=AUTH_CSRF_INVALID");
        });
    }

    @Test
    void logsUnexpectedExceptionAtErrorWithThrowable() {
        handler.handleException(new IllegalStateException("boom"));

        assertThat(appender.list).singleElement().satisfies(event -> {
            assertThat(event.getLevel()).isEqualTo(Level.ERROR);
            assertThat(event.getThrowableProxy()).isNotNull();
            assertThat(event.getFormattedMessage())
                    .contains("event=api_unexpected_exception", "result=failed", "status=500");
        });
    }
}
