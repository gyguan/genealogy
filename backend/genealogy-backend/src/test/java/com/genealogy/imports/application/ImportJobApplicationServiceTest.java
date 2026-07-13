package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportJobSummaryResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobApplicationServiceTest {

    @Mock
    private ImportJobRepository importJobRepository;

    @Mock
    private ImportJobErrorRepository importJobErrorRepository;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private ImportJobApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ImportJobApplicationService(
                importJobRepository,
                importJobErrorRepository,
                authorizationApplicationService
        );
    }

    @Test
    void listJobsShouldPageSummariesWithoutLoadingErrorRows() {
        ImportJobEntity job = job(11L, 1L, 5L, "partial_completed");
        when(importJobRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(job), org.springframework.data.domain.PageRequest.of(1, 20), 21));

        PageResponse<ImportJobSummaryResponse> result = service.listJobs(
                1L,
                5L,
                "partial_completed",
                "person_csv",
                2,
                20,
                9L
        );

        assertThat(result.records()).hasSize(1);
        assertThat(result.records().get(0).id()).isEqualTo(11L);
        assertThat(result.total()).isEqualTo(21);
        assertThat(result.pageNo()).isEqualTo(2);
        assertThat(result.pageSize()).isEqualTo(20);
        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 5L);
        verify(importJobErrorRepository, never()).findByJobIdOrderByRowNoAsc(any());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(importJobRepository).findAll(any(Specification.class), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    void getJobShouldAuthorizeAgainstJobBranchBeforeReturningRawRows() {
        ImportJobEntity job = job(11L, 1L, 5L, "failed");
        ImportJobErrorEntity error = new ImportJobErrorEntity();
        error.setJobId(11L);
        error.setRowNo(3);
        error.setErrorMessage("姓名不能为空");
        error.setRawData(",male");
        when(importJobRepository.findByIdAndClanId(11L, 1L)).thenReturn(Optional.of(job));
        when(importJobErrorRepository.findByJobIdOrderByRowNoAsc(11L)).thenReturn(List.of(error));

        ImportJobResponse result = service.getJob(1L, 11L, 9L);

        verify(authorizationApplicationService).requireClanMember(1L, 9L);
        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 5L);
        assertThat(result.id()).isEqualTo(11L);
        assertThat(result.errors()).singleElement().satisfies(row -> {
            assertThat(row.rowNo()).isEqualTo(3);
            assertThat(row.errorMessage()).isEqualTo("姓名不能为空");
            assertThat(row.rawData()).isEqualTo(",male");
        });
    }

    @Test
    void getJobShouldCheckClanMembershipBeforeReturningNotFound() {
        when(importJobRepository.findByIdAndClanId(11L, 1L)).thenReturn(Optional.empty());

        BusinessException error = catchThrowableOfType(
                () -> service.getJob(1L, 11L, 9L),
                BusinessException.class
        );

        assertThat(error).isNotNull();
        assertThat(error.getCode()).isEqualTo("IMPORT_JOB_NOT_FOUND");
        assertThat(error).hasMessage("导入任务不存在");
        verify(authorizationApplicationService).requireClanMember(1L, 9L);
        verify(authorizationApplicationService, never()).requireBranchWriteScope(any(), any(), any());
        verify(importJobErrorRepository, never()).findByJobIdOrderByRowNoAsc(any());
    }

    private ImportJobEntity job(Long id, Long clanId, Long branchId, String status) {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(id);
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType("person_csv");
        job.setOriginalFilename("persons.csv");
        job.setTotalCount(10);
        job.setSuccessCount(8);
        job.setFailureCount(2);
        job.setStatus(status);
        job.setErrorSummary("存在 2 行导入失败，请查看错误明细");
        job.setCreatedAt(LocalDateTime.of(2026, 7, 13, 12, 0));
        return job;
    }
}
