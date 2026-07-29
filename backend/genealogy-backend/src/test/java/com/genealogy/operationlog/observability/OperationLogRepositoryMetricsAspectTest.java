package com.genealogy.operationlog.observability;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OperationLogRepositoryMetricsAspectTest {

    @Test
    void countsSuccessfulRepositoryWrite() throws Throwable {
        OperationLogMetrics metrics = new OperationLogMetrics(new SimpleMeterRegistry());
        OperationLogRepositoryMetricsAspect aspect = new OperationLogRepositoryMetricsAspect(metrics);
        ProceedingJoinPoint joinPoint = mock(ProceedingJoinPoint.class);
        when(joinPoint.proceed()).thenReturn("saved");

        assertThat(aspect.measureWrite(joinPoint)).isEqualTo("saved");
        assertThat(metrics.successCount()).isEqualTo(1);
        assertThat(metrics.failureCount()).isZero();
    }

    @Test
    void countsFailureAndPreservesRepositoryException() throws Throwable {
        OperationLogMetrics metrics = new OperationLogMetrics(new SimpleMeterRegistry());
        OperationLogRepositoryMetricsAspect aspect = new OperationLogRepositoryMetricsAspect(metrics);
        ProceedingJoinPoint joinPoint = mock(ProceedingJoinPoint.class);
        IllegalStateException failure = new IllegalStateException("database unavailable");
        when(joinPoint.proceed()).thenThrow(failure);

        assertThatThrownBy(() -> aspect.measureWrite(joinPoint)).isSameAs(failure);
        assertThat(metrics.successCount()).isZero();
        assertThat(metrics.failureCount()).isEqualTo(1);
        assertThat(metrics.consecutiveFailureCount()).isEqualTo(1);
    }
}
