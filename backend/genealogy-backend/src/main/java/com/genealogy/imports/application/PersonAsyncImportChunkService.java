package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.entity.ImportJobChunkEntity;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobPayloadEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobChunkRepository;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PersonAsyncImportChunkService {

    private final ImportJobRepository jobRepository;
    private final ImportJobPayloadRepository payloadRepository;
    private final ImportJobRowRepository rowRepository;
    private final ImportJobErrorRepository errorRepository;
    private final ImportJobChunkRepository chunkRepository;
    private final PersonRepository personRepository;

    public PersonAsyncImportChunkService(
            ImportJobRepository jobRepository,
            ImportJobPayloadRepository payloadRepository,
            ImportJobRowRepository rowRepository,
            ImportJobErrorRepository errorRepository,
            ImportJobChunkRepository chunkRepository,
            PersonRepository personRepository
    ) {
        this.jobRepository = jobRepository;
        this.payloadRepository = payloadRepository;
        this.rowRepository = rowRepository;
        this.errorRepository = errorRepository;
        this.chunkRepository = chunkRepository;
        this.personRepository = personRepository;
    }

    @Transactional
    public boolean processNextChunk(Long jobId) {
        ImportJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        if (!ImportJobEntity.TYPE_PERSON.equals(job.getImportType())) {
            throw new BusinessException("IMPORT_ASYNC_TYPE_UNSUPPORTED", "当前异步解析仅支持人物导入");
        }
        ImportJobPayloadEntity payload = payloadRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_PAYLOAD_NOT_FOUND", "异步导入源文件不存在"));

        int cursor = value(job.getCursorRowNo());
        int chunkSize = Math.max(1, value(job.getChunkSize(), 200));
        ReadWindow window = readWindow(payload, cursor, chunkSize);
        if (window.totalCount() == 0) {
            throw new BusinessException("IMPORT_FILE_NO_ROWS", "导入文件没有可处理的数据行");
        }
        job.setTotalCount(window.totalCount());
        if (window.rows().isEmpty()) {
            completeDrafting(job);
            return true;
        }

        int fromRowNo = window.rows().get(0).rowNo();
        int toRowNo = window.rows().get(window.rows().size() - 1).rowNo();
        int chunkNo = Math.max(0, (fromRowNo - 2) / chunkSize);
        ImportJobChunkEntity chunk = chunkRepository.findByJobIdAndStageAndChunkNo(
                        jobId, ImportJobChunkEntity.STAGE_DRAFTING, chunkNo)
                .orElseGet(() -> newChunk(jobId, chunkNo, fromRowNo, toRowNo));
        if (ImportJobChunkEntity.STATUS_COMPLETED.equals(chunk.getStatus())) {
            job.setCursorRowNo(Math.max(cursor, chunk.getToRowNo()));
            job.setExecutionStage(ImportJobEntity.STAGE_DRAFTING);
            job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
            job.setUpdatedAt(LocalDateTime.now());
            jobRepository.save(job);
            return false;
        }
        chunk.setStatus(ImportJobChunkEntity.STATUS_RUNNING);
        chunk.setAttemptCount(Math.max(1, value(chunk.getAttemptCount()) + (chunk.getId() == null ? 0 : 1)));
        chunk.setErrorSummary(null);
        chunk.setStartedAt(LocalDateTime.now());
        chunkRepository.save(chunk);

        for (InputRow input : window.rows()) {
            if (rowRepository.findByJobIdAndRowNo(jobId, input.rowNo()).isPresent()) {
                continue;
            }
            processRow(job, payload, input);
        }

        LocalDateTime now = LocalDateTime.now();
        chunk.setStatus(ImportJobChunkEntity.STATUS_COMPLETED);
        chunk.setCompletedAt(now);
        chunkRepository.save(chunk);

        long success = rowRepository.countByJobIdAndRowStatus(jobId, ImportJobRowEntity.STATUS_DRAFT_CREATED);
        long failure = rowRepository.countByJobIdAndRowStatusIn(
                jobId, List.of(ImportJobRowEntity.STATUS_INVALID, ImportJobRowEntity.STATUS_RETRY_FAILED));
        long processed = rowRepository.countByJobId(jobId);
        job.setCursorRowNo(toRowNo);
        job.setProcessedCount(safeInt(processed));
        job.setSuccessCount(safeInt(success));
        job.setFailureCount(safeInt(failure));
        job.setExecutionStage(ImportJobEntity.STAGE_DRAFTING);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        return processed >= window.totalCount();
    }

    private void processRow(ImportJobEntity job, ImportJobPayloadEntity payload, InputRow input) {
        LocalDateTime now = LocalDateTime.now();
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setJobId(job.getId());
        row.setRowNo(input.rowNo());
        row.setRawData(input.rawData());
        row.setRetryCount(0);
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        try {
            ParsedPerson parsed = parsePerson(input.cells());
            int duplicateCount = countDuplicates(job, parsed);
            Map<String, Object> normalized = normalizedData(job, parsed, duplicateCount);
            row.setNormalizedData(normalized);
            if (duplicateCount > 0 && !Boolean.TRUE.equals(payload.getConfirmDuplicates())) {
                throw new BusinessException(
                        "IMPORT_DUPLICATE_CONFIRM_REQUIRED",
                        "存在疑似重复人物，请修正或确认重复后重试"
                );
            }
            PersonEntity person = personRepository.save(toPerson(job, parsed));
            row.setDraftPersonId(person.getId());
            row.setDraftTargetType(ImportJobEntity.TYPE_PERSON);
            row.setDraftTargetId(person.getId());
            row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        } catch (RuntimeException exception) {
            String message = errorMessage(exception);
            row.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
            row.setErrorCode(errorCode(exception));
            row.setErrorMessage(message);
            errorRepository.save(error(job.getId(), input.rowNo(), message, input.rawData()));
        }
        rowRepository.save(row);
    }

    private void completeDrafting(ImportJobEntity job) {
        long success = rowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED);
        long failure = rowRepository.countByJobIdAndRowStatusIn(
                job.getId(), List.of(ImportJobRowEntity.STATUS_INVALID, ImportJobRowEntity.STATUS_RETRY_FAILED));
        LocalDateTime now = LocalDateTime.now();
        job.setProcessedCount(safeInt(success + failure));
        job.setSuccessCount(safeInt(success));
        job.setFailureCount(safeInt(failure));
        job.setStatus(failure == 0 ? "completed" : success == 0 ? "failed" : "partial_completed");
        job.setProcessingStatus(failure == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行导入失败，请修正后再提交审核");
        job.setExecutionStatus(ImportJobEntity.EXECUTION_COMPLETED);
        job.setExecutionStage(failure == 0 ? ImportJobEntity.STAGE_READY_FOR_REVIEW : ImportJobEntity.STAGE_COMPLETED);
        job.setCompletedAt(now);
        job.setHeartbeatAt(now);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setUpdatedAt(now);
        jobRepository.save(job);
        payloadRepository.deleteById(job.getId());
    }

    private ImportJobChunkEntity newChunk(Long jobId, int chunkNo, int fromRowNo, int toRowNo) {
        ImportJobChunkEntity chunk = new ImportJobChunkEntity();
        chunk.setJobId(jobId);
        chunk.setStage(ImportJobChunkEntity.STAGE_DRAFTING);
        chunk.setChunkNo(chunkNo);
        chunk.setFromRowNo(fromRowNo);
        chunk.setToRowNo(toRowNo);
        chunk.setIdempotencyKey("import:" + jobId + ":drafting:" + fromRowNo + "-" + toRowNo);
        chunk.setStatus(ImportJobChunkEntity.STATUS_RUNNING);
        chunk.setAttemptCount(1);
        chunk.setStartedAt(LocalDateTime.now());
        return chunk;
    }

    private ReadWindow readWindow(ImportJobPayloadEntity payload, int cursor, int chunkSize) {
        String filename = payload.getOriginalFilename().toLowerCase(Locale.ROOT);
        return filename.endsWith(".xlsx")
                ? readXlsxWindow(payload.getFileContent(), cursor, chunkSize)
                : readCsvWindow(payload.getFileContent(), cursor, chunkSize);
    }

    private ReadWindow readCsvWindow(byte[] content, int cursor, int chunkSize) {
        List<InputRow> rows = new ArrayList<>();
        int total = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ByteArrayInputStream(content), StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            int rowNo = 1;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                if (line.isBlank()) continue;
                total++;
                if (rowNo > cursor && rows.size() < chunkSize) {
                    rows.add(new InputRow(rowNo, parseCsv(line), line));
                }
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "异步导入文件读取失败");
        }
        return new ReadWindow(total, rows);
    }

    private ReadWindow readXlsxWindow(byte[] content, int cursor, int chunkSize) {
        List<InputRow> rows = new ArrayList<>();
        int total = 0;
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(content))) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) throw new BusinessException("IMPORT_XLSX_EMPTY", "Excel 工作表不能为空");
            int headerRowIndex = sheet.getFirstRowNum();
            for (Row row : sheet) {
                if (row.getRowNum() == headerRowIndex) continue;
                List<String> cells = rowToCells(row, formatter);
                if (cells.stream().allMatch(String::isBlank)) continue;
                total++;
                int rowNo = row.getRowNum() + 1;
                if (rowNo > cursor && rows.size() < chunkSize) {
                    rows.add(new InputRow(rowNo, cells, String.join(",", cells)));
                }
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_XLSX_PARSE_FAILED", "Excel 解析失败，请确认文件格式为 .xlsx");
        }
        return new ReadWindow(total, rows);
    }

    private ParsedPerson parsePerson(List<String> cells) {
        ensureNoExtraColumns(cells);
        String name = cell(cells, PersonImportTemplateDefinition.NAME_INDEX);
        if (name.isBlank()) throw new BusinessException("IMPORT_PERSON_NAME_REQUIRED", "姓名不能为空");
        String gender = PersonImportTemplateDefinition.GENDER_CODES.get(cell(cells, PersonImportTemplateDefinition.GENDER_INDEX));
        if (gender == null) throw new BusinessException("IMPORT_GENDER_INVALID", "性别必须填写男、女或未知");
        Integer generationNo = parseGenerationNo(cell(cells, PersonImportTemplateDefinition.GENERATION_NO_INDEX));
        String generationWord = cell(cells, PersonImportTemplateDefinition.GENERATION_WORD_INDEX);
        LocalDate birthDate = parseDate(cell(cells, PersonImportTemplateDefinition.BIRTH_DATE_INDEX));
        Boolean living = PersonImportTemplateDefinition.LIVING_VALUES.get(cell(cells, PersonImportTemplateDefinition.IS_LIVING_INDEX));
        if (living == null) throw new BusinessException("IMPORT_LIVING_INVALID", "是否在世必须填写是或否");
        return new ParsedPerson(name, gender, generationNo, generationWord, birthDate, living);
    }

    private int countDuplicates(ImportJobEntity job, ParsedPerson person) {
        Specification<PersonEntity> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("clanId"), job.getClanId()));
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(cb.equal(cb.lower(root.get("name")), person.name().toLowerCase(Locale.ROOT)));
            if (job.getBranchId() != null) predicates.add(cb.equal(root.get("branchId"), job.getBranchId()));
            if (person.generationNo() != null) predicates.add(cb.equal(root.get("generationNo"), person.generationNo()));
            if (!person.generationWord().isBlank()) predicates.add(cb.equal(root.get("generationWord"), person.generationWord()));
            if (person.birthDate() != null) predicates.add(cb.equal(root.get("birthDate"), person.birthDate()));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return safeInt(personRepository.count(specification));
    }

    private Map<String, Object> normalizedData(ImportJobEntity job, ParsedPerson person, int duplicateCount) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", person.name());
        data.put("gender", person.gender());
        data.put("generationNo", person.generationNo());
        data.put("generationWord", person.generationWord());
        data.put("branchId", job.getBranchId());
        data.put("birthDate", person.birthDate() == null ? null : person.birthDate().toString());
        data.put("isLiving", person.isLiving());
        data.put("duplicated", duplicateCount > 0);
        data.put("duplicateCount", duplicateCount);
        return data;
    }

    private PersonEntity toPerson(ImportJobEntity job, ParsedPerson parsed) {
        PersonEntity person = new PersonEntity();
        person.setClanId(job.getClanId());
        person.setBranchId(job.getBranchId());
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
        person.setCreatedBy(job.getCreatedBy());
        person.setUpdatedBy(job.getCreatedBy());
        LocalDateTime now = LocalDateTime.now();
        person.setCreatedAt(now);
        person.setUpdatedAt(now);
        return person;
    }

    private ImportJobErrorEntity error(Long jobId, int rowNo, String message, String rawData) {
        ImportJobErrorEntity error = new ImportJobErrorEntity();
        error.setJobId(jobId);
        error.setRowNo(rowNo);
        error.setErrorMessage(message);
        error.setRawData(rawData);
        error.setCreatedAt(LocalDateTime.now());
        return error;
    }

    private List<String> rowToCells(Row row, DataFormatter formatter) {
        int max = Math.max(PersonImportTemplateDefinition.HEADERS.size(), row.getLastCellNum());
        List<String> cells = new ArrayList<>(max);
        for (int index = 0; index < max; index++) {
            Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            cells.add(cell == null ? "" : formatter.formatCellValue(cell).trim());
        }
        return cells;
    }

    private List<String> parseCsv(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                cells.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        if (quoted) throw new BusinessException("IMPORT_ROW_CSV_INVALID", "CSV 数据行格式不正确");
        cells.add(current.toString().trim());
        return cells;
    }

    private void ensureNoExtraColumns(List<String> cells) {
        if (cells.size() <= PersonImportTemplateDefinition.HEADERS.size()) return;
        boolean hasExtra = cells.subList(PersonImportTemplateDefinition.HEADERS.size(), cells.size())
                .stream().anyMatch(value -> value != null && !value.isBlank());
        if (hasExtra) throw new BusinessException("IMPORT_ROW_EXTRA_COLUMNS", "数据行包含人物导入模板之外的字段");
    }

    private String cell(List<String> cells, int index) {
        return index >= 0 && index < cells.size() ? cells.get(index).trim() : "";
    }

    private Integer parseGenerationNo(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            int parsed = Integer.parseInt(value.trim());
            if (parsed <= 0) throw new NumberFormatException();
            return parsed;
        } catch (NumberFormatException exception) {
            throw new BusinessException("IMPORT_GENERATION_INVALID", "代次必须是正整数");
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (RuntimeException exception) {
            throw new BusinessException("IMPORT_DATE_INVALID", "出生日期格式必须是 yyyy-MM-dd");
        }
    }

    private String errorCode(RuntimeException exception) {
        return exception instanceof BusinessException businessException
                ? businessException.getCode()
                : "IMPORT_ROW_PROCESS_FAILED";
    }

    private String errorMessage(RuntimeException exception) {
        return exception.getMessage() == null || exception.getMessage().isBlank()
                ? "导入行处理失败"
                : exception.getMessage();
    }

    private int value(Integer number) {
        return number == null ? 0 : number;
    }

    private int value(Integer number, int fallback) {
        return number == null ? fallback : number;
    }

    private int safeInt(long number) {
        return number > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) number;
    }

    private record ReadWindow(int totalCount, List<InputRow> rows) {
    }

    private record InputRow(int rowNo, List<String> cells, String rawData) {
    }

    private record ParsedPerson(
            String name,
            String gender,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate,
            Boolean isLiving
    ) {
    }
}
