package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobPayloadEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportAsyncApplicationServiceTest {

    @Mock
    private ImportJobRepository jobRepository;
    @Mock
    private ImportJobPayloadRepository payloadRepository;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private PersonImportFilePolicyService filePolicyService;

    private ImportExecutionProperties properties;
    private ImportAsyncApplicationService service;

    @BeforeEach
    void setUp() {
        properties = new ImportExecutionProperties();
        properties.setAsyncFileBytesThreshold(10);
        properties.setChunkSize(50);
        properties.setMaxRetries(4);
        service = new ImportAsyncApplicationService(
                jobRepository,
                payloadRepository,
                authorizationApplicationService,
                filePolicyService,
                properties
        );
    }

    @Test
    void autoModeShouldRouteOnlyFilesAtOrAboveThreshold() {
        assertThat(service.shouldUseAsync(file("small.csv", "123456789"), "auto")).isFalse();
        assertThat(service.shouldUseAsync(file("large.csv", "1234567890"), "auto")).isTrue();
        assertThat(service.shouldUseAsync(file("small.csv", "1"), "async")).isTrue();
        assertThat(service.shouldUseAsync(file("large.csv", "1234567890"), "sync")).isFalse();
    }

    @Test
    void enqueueShouldPersistRecoverableJobAndPayloadWithoutProcessingRows() {
        when(jobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> {
            ImportJobEntity job = invocation.getArgument(0);
            job.setId(77L);
            return job;
        });
        MockMultipartFile file = file("persons.csv", "姓名,性别,代次,字辈,出生日期,是否在世\n张三,男,5,德,1980-01-01,是");

        ImportJobResponse result = service.enqueuePersons(1L, 2L, file, true, 9L);

        assertThat(result.id()).isEqualTo(77L);
        assertThat(result.status()).isEqualTo("running");
        assertThat(result.totalCount()).isZero();
        verify(filePolicyService).validate(2L, file);
        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 2L);

        ArgumentCaptor<ImportJobEntity> jobCaptor = ArgumentCaptor.forClass(ImportJobEntity.class);
        verify(jobRepository).save(jobCaptor.capture());
        ImportJobEntity savedJob = jobCaptor.getValue();
        assertThat(savedJob.getExecutionMode()).isEqualTo(ImportJobEntity.EXECUTION_MODE_ASYNC);
        assertThat(savedJob.getExecutionStatus()).isEqualTo(ImportJobEntity.EXECUTION_QUEUED);
        assertThat(savedJob.getExecutionStage()).isEqualTo(ImportJobEntity.STAGE_PARSING);
        assertThat(savedJob.getChunkSize()).isEqualTo(50);
        assertThat(savedJob.getExecutionMaxRetries()).isEqualTo(4);

        ArgumentCaptor<ImportJobPayloadEntity> payloadCaptor = ArgumentCaptor.forClass(ImportJobPayloadEntity.class);
        verify(payloadRepository).save(payloadCaptor.capture());
        assertThat(payloadCaptor.getValue().getJobId()).isEqualTo(77L);
        assertThat(payloadCaptor.getValue().getFileContent()).isEqualTo(file.getBytes());
        assertThat(payloadCaptor.getValue().getConfirmDuplicates()).isTrue();
    }

    private MockMultipartFile file(String name, String content) {
        return new MockMultipartFile("file", name, "text/csv", content.getBytes());
    }
}
