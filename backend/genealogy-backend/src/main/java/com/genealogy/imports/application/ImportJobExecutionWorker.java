package com.genealogy.imports.application;

import com.genealogy.imports.entity.ImportJobEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ImportJobExecutionWorker {

    private final ImportJobExecutionCoordinatorService coordinatorService;
    private final PersonAsyncImportChunkService personAsyncImportChunkService;
    private final ImportPublishingChunkService publishingChunkService;

    public ImportJobExecutionWorker(
            ImportJobExecutionCoordinatorService coordinatorService,
            PersonAsyncImportChunkService personAsyncImportChunkService,
            ImportPublishingChunkService publishingChunkService
    ) {
        this.coordinatorService = coordinatorService;
        this.personAsyncImportChunkService = personAsyncImportChunkService;
        this.publishingChunkService = publishingChunkService;
    }

    @Scheduled(fixedDelayString = "${genealogy.import.execution.poll-delay-ms:1000}")
    public void executeOneChunk() {
        coordinatorService.claimNext().ifPresent(claim -> {
            try {
                if (ImportJobEntity.STAGE_PARSING.equals(claim.stage())
                        || ImportJobEntity.STAGE_DRAFTING.equals(claim.stage())
                        || ImportJobEntity.STAGE_QUEUED.equals(claim.stage())) {
                    personAsyncImportChunkService.processNextChunk(claim.jobId());
                } else if (ImportJobEntity.STAGE_PUBLISHING.equals(claim.stage())) {
                    publishingChunkService.processNextChunk(claim.jobId());
                }
                coordinatorService.release(claim.jobId(), claim.owner());
            } catch (RuntimeException exception) {
                coordinatorService.recordFailure(claim.jobId(), claim.owner(), exception);
            }
        });
    }
}
