package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.application.ImportJobLifecycleService.ImportBatchSummary;
import com.genealogy.imports.application.PersonImportParser.ImportRow;
import com.genealogy.imports.application.PersonImportParser.ParsedPersonRow;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PersonImportBatchProcessor {

    private final PersonImportParser parser;
    private final PersonRepository personRepository;
    private final ImportJobRowRepository jobRowRepository;
    private final ImportJobErrorRepository errorRepository;

    public PersonImportBatchProcessor(
            PersonImportParser parser,
            PersonRepository personRepository,
            ImportJobRowRepository jobRowRepository,
            ImportJobErrorRepository errorRepository
    ) {
        this.parser = parser;
        this.personRepository = personRepository;
        this.jobRowRepository = jobRowRepository;
        this.errorRepository = errorRepository;
    }

    /**
     * A batch is the transaction boundary. Validation/business failures are captured per row and
     * do not abort the batch. Infrastructure or commit failures roll back the whole batch so the
     * caller can report/retry it without producing a partially committed batch.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ImportBatchSummary process(
            Long jobId,
            Long clanId,
            Long branchId,
            Long actorId,
            List<ImportRow> rows
    ) {
        int success = 0;
        int failure = 0;
        List<ImportJobRowEntity> jobRows = new ArrayList<>(rows.size());
        List<ImportJobErrorEntity> errors = new ArrayList<>();

        for (ImportRow row : rows) {
            ImportJobRowEntity jobRow = newJobRow(jobId, row);
            try {
                ParsedPersonRow parsed = parser.parse(branchId, row);
                jobRow.setNormalizedData(normalizedData(parsed));
                PersonEntity person = personRepository.save(toPerson(clanId, actorId, parsed));
                jobRow.setDraftPersonId(person.getId());
                jobRow.setDraftTargetType(ImportJobEntity.TYPE_PERSON);
                jobRow.setDraftTargetId(person.getId());
                jobRow.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
                success++;
            } catch (BusinessException exception) {
                failure++;
                captureFailure(jobRow, errors, jobId, row, exception.getCode(), exception.getMessage());
            } catch (IllegalArgumentException exception) {
                failure++;
                captureFailure(jobRow, errors, jobId, row, "IMPORT_ROW_INVALID", safeMessage(exception));
            }
            jobRow.setUpdatedAt(LocalDateTime.now());
            jobRows.add(jobRow);
        }

        if (!jobRows.isEmpty()) jobRowRepository.saveAll(jobRows);
        if (!errors.isEmpty()) errorRepository.saveAll(errors);
        return new ImportBatchSummary(rows.size(), success, failure, 0);
    }

    private PersonEntity toPerson(Long clanId, Long actorId, ParsedPersonRow parsed) {
        PersonEntity person = new PersonEntity();
        person.setClanId(clanId);
        person.setBranchId(parsed.branchId());
        person.setName(parsed.name());
        person.setGender(parsed.gender());
        person.setGenerationNo(parsed.generationNo());
        person.setGenerationWord(parsed.generationWord());
        person.setBirthDate(parsed.birthDate());
        person.setIsLiving(parsed.isLiving());
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("draft");
        person.setLineageStatus("normal");
        person.setHasDescendant(false);
        person.setCreatedBy(actorId);
        person.setUpdatedBy(actorId);
        LocalDateTime now = LocalDateTime.now();
        person.setCreatedAt(now);
        person.setUpdatedAt(now);
        return person;
    }

    private ImportJobRowEntity newJobRow(Long jobId, ImportRow row) {
        LocalDateTime now = LocalDateTime.now();
        ImportJobRowEntity entity = new ImportJobRowEntity();
        entity.setJobId(jobId);
        entity.setRowNo(row.rowNo());
        entity.setRawData(row.rawData());
        entity.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        entity.setRetryCount(0);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return entity;
    }

    private Map<String, Object> normalizedData(ParsedPersonRow parsed) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", parsed.name());
        data.put("gender", parsed.gender());
        data.put("generationNo", parsed.generationNo());
        data.put("generationWord", parsed.generationWord());
        data.put("branchId", parsed.branchId());
        data.put("birthDate", parsed.birthDate() == null ? null : parsed.birthDate().toString());
        data.put("isLiving", parsed.isLiving());
        return data;
    }

    private void captureFailure(
            ImportJobRowEntity jobRow,
            List<ImportJobErrorEntity> errors,
            Long jobId,
            ImportRow row,
            String code,
            String message
    ) {
        jobRow.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        jobRow.setErrorCode(code);
        jobRow.setErrorMessage(message);
        ImportJobErrorEntity error = new ImportJobErrorEntity();
        error.setJobId(jobId);
        error.setRowNo(row.rowNo());
        error.setErrorMessage(message);
        error.setRawData(row.rawData());
        error.setCreatedAt(LocalDateTime.now());
        errors.add(error);
    }

    private String safeMessage(RuntimeException exception) {
        return exception.getMessage() == null || exception.getMessage().isBlank()
                ? "导入行处理失败"
                : exception.getMessage();
    }
}
