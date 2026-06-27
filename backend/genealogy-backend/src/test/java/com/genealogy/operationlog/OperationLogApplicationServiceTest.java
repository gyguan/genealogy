package com.genealogy.operationlog;

import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class OperationLogApplicationServiceTest {

    @Test
    void recordShouldNormalizeAndTrim() {
        OperationLogRepository repository = mock(OperationLogRepository.class);
        OperationLogApplicationService service = new OperationLogApplicationService(repository);

        service.record(1L, 2L, "TEST_ACTION", "PERSON", 3L, " summary ", "detail", "req-1", "127.0.0.1");

        ArgumentCaptor<OperationLogEntity> captor = ArgumentCaptor.forClass(OperationLogEntity.class);
        verify(repository).save(captor.capture());
        OperationLogEntity saved = captor.getValue();
        assertThat(saved.getActionType()).isEqualTo("test_action");
        assertThat(saved.getTargetType()).isEqualTo("person");
        assertThat(saved.getSummary()).isEqualTo("summary");
        assertThat(saved.getRequestId()).isEqualTo("req-1");
        assertThat(saved.getClientIp()).isEqualTo("127.0.0.1");
    }
}
