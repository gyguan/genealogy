package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.observability.ImportMetrics;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.application.PersonDuplicateDetectionService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportApplicationServiceRowStateTest {

    @Mock
    private ImportJobRepository importJobRepository;

    @Mock
    private ImportJobErrorRepository importJobErrorRepository;

    @Mock
    private ImportJobRowRepository importJobRowRepository;

    @Mock
    private PersonRepository personRepository;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private ImportApplicationService service;
    private ImportJobEntity lastSavedJob;

    @BeforeEach
    void setUp() {
        PersonImportParser parser = new PersonImportParser();
        PersonDuplicateDetectionService duplicateDetectionService = new PersonDuplicateDetectionService(personRepository);
        PersonImportBatchProcessor batchProcessor = new PersonImportBatchProcessor(
                parser,
                personRepository,
                importJobRowRepository,
                importJobErrorRepository
        );
        ImportJobLifecycleService lifecycleService = new ImportJobLifecycleService(
                importJobRepository,
                importJobErrorRepository
        );
        service = new ImportApplicationService(
                authorizationApplicationService,
                new PersonImportFilePolicyService(),
                parser,
                duplicateDetectionService,
                batchProcessor,
                lifecycleService,
                new ImportMetrics(new SimpleMeterRegistry()),
                200
        );
        when(importJobRepository.saveAndFlush(any(ImportJobEntity.class))).thenAnswer(invocation -> rememberJob(invocation.getArgument(0)));
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> rememberJob(invocation.getArgument(0)));
        lenient().when(importJobRepository.findById(anyLong()))
                .thenAnswer(invocation -> Optional.ofNullable(lastSavedJob));
        lenient().when(importJobErrorRepository.findByJobIdOrderByRowNoAsc(anyLong())).thenReturn(List.of());
        lenient().when(personRepository.findDuplicateCandidates(any())).thenReturn(List.of());
        lenient().when(personRepository.save(any(PersonEntity.class))).thenAnswer(invocation -> {
            PersonEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(1001L);
            return entity;
        });
    }

    @Test
    void successfulRowsShouldBeLinkedToDraftPersonsAndBecomeReadyForReview() {
        MockMultipartFile file = csv("""
                姓名,性别,代次,字辈,出生日期,是否在世
                张三,男,5,德,1980-01-01,是
                """);

        ImportJobResponse result = service.importPersonsCsv(1L, 5L, file, false, 9L);

        assertThat(result.status()).isEqualTo("completed");
        assertThat(result.importType()).isEqualTo("person");
        assertThat(result.fileFormat()).isEqualTo("csv");
        assertThat(result.legacyImportType()).isEqualTo("person_csv");

        verify(importJobRepository).saveAndFlush(any(ImportJobEntity.class));
        verify(importJobRepository).save(any(ImportJobEntity.class));
        assertThat(lastSavedJob.getImportType()).isEqualTo(ImportJobEntity.TYPE_PERSON);
        assertThat(lastSavedJob.getFileFormat()).isEqualTo(ImportJobEntity.FORMAT_CSV);
        assertThat(lastSavedJob.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        assertThat(lastSavedJob.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        assertThat(lastSavedJob.getReviewRound()).isZero();

        ArgumentCaptor<PersonEntity> personCaptor = ArgumentCaptor.forClass(PersonEntity.class);
        verify(personRepository).save(personCaptor.capture());
        assertThat(personCaptor.getValue().getGender()).isEqualTo("male");
        assertThat(personCaptor.getValue().getIsLiving()).isTrue();
        assertThat(personCaptor.getValue().getBranchId()).isEqualTo(5L);

        List<ImportJobRowEntity> rows = capturedRows();
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getRowStatus()).isEqualTo(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        assertThat(rows.get(0).getDraftPersonId()).isEqualTo(1001L);
        assertThat(rows.get(0).getNormalizedData())
                .containsEntry("name", "张三")
                .containsEntry("gender", "male")
                .containsEntry("branchId", 5L)
                .containsEntry("birthDate", "1980-01-01")
                .containsEntry("isLiving", true);
    }

    @Test
    void invalidRowsShouldRemainTraceableAndRequireCorrection() {
        MockMultipartFile file = csv("""
                姓名,性别,代次,字辈,出生日期,是否在世
                张三,男,5,德,1980-01-01,是
                李四,男,六,明,1982-01-01,是
                """);

        ImportJobResponse result = service.importPersonsCsv(1L, 5L, file, false, 9L);

        assertThat(result.status()).isEqualTo("partial_completed");
        assertThat(result.successCount()).isEqualTo(1);
        assertThat(result.failureCount()).isEqualTo(1);
        assertThat(lastSavedJob.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        assertThat(lastSavedJob.getErrorSummary()).contains("修正后再提交审核");

        List<ImportJobRowEntity> rows = capturedRows();
        assertThat(rows).hasSize(2);
        assertThat(rows).extracting(ImportJobRowEntity::getRowStatus)
                .containsExactly(ImportJobRowEntity.STATUS_DRAFT_CREATED, ImportJobRowEntity.STATUS_INVALID);
        ImportJobRowEntity invalidRow = rows.get(1);
        assertThat(invalidRow.getRowNo()).isEqualTo(3);
        assertThat(invalidRow.getErrorCode()).isEqualTo("IMPORT_ROW_INVALID");
        assertThat(invalidRow.getErrorMessage()).contains("代次必须是正整数");
        assertThat(invalidRow.getRawData()).contains("李四", "六");
    }

    @Test
    void invalidBusinessValuesShouldBecomeCorrectableRows() {
        MockMultipartFile file = csv("""
                姓名,性别,代次,字辈,出生日期,是否在世
                张三,male,5,德,1980-01-01,是
                李四,女,5,明,1982-01-01,true
                王五,男,0,承,1985-01-01,否
                """);

        ImportJobResponse result = service.importPersonsCsv(1L, 5L, file, false, 9L);

        assertThat(result.status()).isEqualTo("failed");
        assertThat(result.successCount()).isZero();
        assertThat(result.failureCount()).isEqualTo(3);

        List<ImportJobRowEntity> rows = capturedRows();
        assertThat(rows).allMatch(row -> ImportJobRowEntity.STATUS_INVALID.equals(row.getRowStatus()));
        assertThat(rows).extracting(ImportJobRowEntity::getErrorMessage)
                .containsExactly(
                        "性别必须填写男、女或未知",
                        "是否在世必须填写是或否",
                        "代次必须是正整数"
                );
    }

    private ImportJobEntity rememberJob(ImportJobEntity entity) {
        if (entity.getId() == null) entity.setId(101L);
        lastSavedJob = entity;
        return entity;
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile(
                "file",
                "persons.csv",
                "text/csv",
                content.stripIndent().getBytes(StandardCharsets.UTF_8)
        );
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private List<ImportJobRowEntity> capturedRows() {
        ArgumentCaptor<Iterable> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(importJobRowRepository).saveAll(captor.capture());
        List<ImportJobRowEntity> rows = new ArrayList<>();
        captor.getValue().forEach(value -> rows.add((ImportJobRowEntity) value));
        return rows;
    }
}
