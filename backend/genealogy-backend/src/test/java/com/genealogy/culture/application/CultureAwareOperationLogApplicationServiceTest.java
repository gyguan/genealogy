package com.genealogy.culture.application;

import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CultureAwareOperationLogApplicationServiceTest {

    private final OperationLogRepository repository = mock(OperationLogRepository.class);
    private final CultureTargetGovernanceRegistry targetRegistry = mock(CultureTargetGovernanceRegistry.class);
    private final CultureAwareOperationLogApplicationService service =
            new CultureAwareOperationLogApplicationService(repository, targetRegistry);

    @Test
    void cultureAuditRollbackDoesNotEscapeForCreateEndpoints() {
        when(repository.save(any(OperationLogEntity.class)))
                .thenThrow(new UnexpectedRollbackException("audit transaction marked rollback-only"));

        for (String targetType : List.of("culture_item", "migration_event", "culture_site")) {
            assertThatCode(() -> service.record(
                    6L,
                    20L,
                    targetType + "_create",
                    targetType,
                    30L,
                    "create " + targetType,
                    "snapshot",
                    "request-1",
                    "192.0.2.8"
            )).doesNotThrowAnyException();
        }
    }

    @Test
    void overriddenRecordEntryPointsSuspendTheCallerTransaction() throws NoSuchMethodException {
        assertNotSupported(Long.class, Long.class, String.class, String.class, Long.class, String.class, String.class);
        assertNotSupported(
                Long.class,
                Long.class,
                String.class,
                String.class,
                Long.class,
                String.class,
                String.class,
                String.class,
                String.class
        );
    }

    private void assertNotSupported(Class<?>... parameterTypes) throws NoSuchMethodException {
        Method method = CultureAwareOperationLogApplicationService.class.getMethod("record", parameterTypes);
        Transactional transactional = method.getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
        assertThat(transactional.propagation()).isEqualTo(Propagation.NOT_SUPPORTED);
    }
}
