package com.genealogy.importexport.application;

import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.importexport.dto.CsvImportResultResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PersonCsvApplicationService {

    private static final List<String> PERSON_HEADERS = List.of(
            "branchId", "personCode", "name", "genealogyName", "courtesyName", "aliasName", "gender",
            "generationNo", "generationWord", "rankInFamily", "birthDate", "birthDatePrecision", "deathDate",
            "deathDatePrecision", "isLiving", "birthPlace", "residencePlace", "occupation", "education",
            "titleOrHonor", "biography", "tombPlace", "epitaph", "hasDescendant", "lineageStatus", "privacyLevel"
    );

    private final ClanRepository clanRepository;
    private final PersonRepository personRepository;
    private final PersonApplicationService personApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public PersonCsvApplicationService(
            ClanRepository clanRepository,
            PersonRepository personRepository,
            PersonApplicationService personApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.clanRepository = clanRepository;
        this.personRepository = personRepository;
        this.personApplicationService = personApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public byte[] buildPersonTemplate() {
        StringBuilder builder = new StringBuilder();
        builder.append(String.join(",", PERSON_HEADERS)).append("\n");
        builder.append("1,P001,张三,三公,子明,,male,5,德,长子,1980-01-01,day,,,,湖南长沙,湖南长沙,教师,本科,,家族成员简介,,,true,normal,clan_only\n");
        return addUtf8Bom(builder.toString()).getBytes(StandardCharsets.UTF_8);
    }

    public byte[] exportPersons(Long clanId) {
        ensureClanExists(clanId);
        StringBuilder builder = new StringBuilder();
        appendCsvRow(builder, PERSON_HEADERS);
        for (PersonEntity person : personRepository.findByClanIdAndDeletedAtIsNull(clanId)) {
            appendCsvRow(builder, List.of(
                    value(person.getBranchId()),
                    value(person.getPersonCode()),
                    value(person.getName()),
                    value(person.getGenealogyName()),
                    value(person.getCourtesyName()),
                    value(person.getAliasName()),
                    value(person.getGender()),
                    value(person.getGenerationNo()),
                    value(person.getGenerationWord()),
                    value(person.getRankInFamily()),
                    value(person.getBirthDate()),
                    value(person.getBirthDatePrecision()),
                    value(person.getDeathDate()),
                    value(person.getDeathDatePrecision()),
                    value(person.getIsLiving()),
                    value(person.getBirthPlace()),
                    value(person.getResidencePlace()),
                    value(person.getOccupation()),
                    value(person.getEducation()),
                    value(person.getTitleOrHonor()),
                    value(person.getBiography()),
                    value(person.getTombPlace()),
                    value(person.getEpitaph()),
                    value(person.getHasDescendant()),
                    value(person.getLineageStatus()),
                    value(person.getPrivacyLevel())
            ));
        }
        return addUtf8Bom(builder.toString()).getBytes(StandardCharsets.UTF_8);
    }

    public CsvImportResultResponse importPersons(Long clanId, MultipartFile file) {
        return importPersons(clanId, file, null);
    }

    public CsvImportResultResponse importPersons(Long clanId, MultipartFile file, Long actorId) {
        ensureClanExists(clanId);
        if (file == null || file.isEmpty()) {
            throw new BusinessException("CSV_FILE_EMPTY", "CSV文件不能为空");
        }

        List<String> lines = readLines(file);
        if (lines.isEmpty()) {
            throw new BusinessException("CSV_FILE_EMPTY", "CSV文件不能为空");
        }

        Map<String, Integer> headerIndex = parseHeader(lines.get(0));
        if (!headerIndex.containsKey("name")) {
            throw new BusinessException("CSV_HEADER_INVALID", "CSV表头缺少必填字段 name");
        }

        int total = 0;
        int success = 0;
        List<String> errors = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line == null || line.isBlank()) {
                continue;
            }
            total++;
            try {
                List<String> cells = parseCsvLine(line);
                PersonCreateRequest request = toCreateRequest(headerIndex, cells);
                personApplicationService.create(clanId, request, actorId);
                success++;
            } catch (Exception ex) {
                errors.add("第" + (i + 1) + "行导入失败：" + ex.getMessage());
            }
        }
        CsvImportResultResponse result = new CsvImportResultResponse(total, success, total - success, errors);
        operationLogApplicationService.record(clanId, actorId, "person_csv_import", "clan", clanId, "导入人物CSV：成功" + success + "条，失败" + (total - success) + "条", String.join("\n", errors));
        return result;
    }

    private void ensureClanExists(Long clanId) {
        if (!clanRepository.existsById(clanId)) {
            throw new BusinessException(ErrorCode.CLAN_NOT_FOUND);
        }
    }

    private List<String> readLines(MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            content = stripBom(content).replace("\r\n", "\n").replace('\r', '\n');
            return content.lines().toList();
        } catch (IOException ex) {
            throw new BusinessException("CSV_FILE_READ_FAILED", "CSV文件读取失败");
        }
    }

    private Map<String, Integer> parseHeader(String headerLine) {
        List<String> headers = parseCsvLine(stripBom(headerLine));
        Map<String, Integer> result = new LinkedHashMap<>();
        for (int i = 0; i < headers.size(); i++) {
            String header = headers.get(i) == null ? "" : headers.get(i).trim();
            if (!header.isEmpty()) {
                result.put(header, i);
            }
        }
        return result;
    }

    private PersonCreateRequest toCreateRequest(Map<String, Integer> headerIndex, List<String> cells) {
        return new PersonCreateRequest(
                parseLong(read(headerIndex, cells, "branchId")),
                read(headerIndex, cells, "personCode"),
                read(headerIndex, cells, "name"),
                read(headerIndex, cells, "genealogyName"),
                read(headerIndex, cells, "courtesyName"),
                read(headerIndex, cells, "aliasName"),
                read(headerIndex, cells, "gender"),
                parseInteger(read(headerIndex, cells, "generationNo")),
                read(headerIndex, cells, "generationWord"),
                read(headerIndex, cells, "rankInFamily"),
                parseDate(read(headerIndex, cells, "birthDate")),
                read(headerIndex, cells, "birthDatePrecision"),
                parseDate(read(headerIndex, cells, "deathDate")),
                read(headerIndex, cells, "deathDatePrecision"),
                parseBoolean(read(headerIndex, cells, "isLiving")),
                read(headerIndex, cells, "birthPlace"),
                read(headerIndex, cells, "residencePlace"),
                read(headerIndex, cells, "occupation"),
                read(headerIndex, cells, "education"),
                read(headerIndex, cells, "titleOrHonor"),
                read(headerIndex, cells, "biography"),
                read(headerIndex, cells, "tombPlace"),
                read(headerIndex, cells, "epitaph"),
                parseBoolean(read(headerIndex, cells, "hasDescendant")),
                read(headerIndex, cells, "lineageStatus"),
                read(headerIndex, cells, "privacyLevel")
        );
    }

    private String read(Map<String, Integer> headerIndex, List<String> cells, String name) {
        Integer index = headerIndex.get(name);
        if (index == null || index >= cells.size()) {
            return null;
        }
        String value = cells.get(index);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Long parseLong(String value) {
        if (value == null) {
            return null;
        }
        return Long.valueOf(value);
    }

    private Integer parseInteger(String value) {
        if (value == null) {
            return null;
        }
        return Integer.valueOf(value);
    }

    private Boolean parseBoolean(String value) {
        if (value == null) {
            return null;
        }
        return Boolean.valueOf(value);
    }

    private LocalDate parseDate(String value) {
        if (value == null) {
            return null;
        }
        return LocalDate.parse(value);
    }

    private List<String> parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (c == ',' && !quoted) {
                result.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());
        return result;
    }

    private void appendCsvRow(StringBuilder builder, List<String> values) {
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(escapeCsv(values.get(i)));
        }
        builder.append('\n');
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        boolean shouldQuote = value.contains(",") || value.contains("\n") || value.contains("\r") || value.contains("\"");
        String escaped = value.replace("\"", "\"\"");
        return shouldQuote ? "\"" + escaped + "\"" : escaped;
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String addUtf8Bom(String value) {
        return "\uFEFF" + value;
    }

    private String stripBom(String value) {
        if (value != null && value.startsWith("\uFEFF")) {
            return value.substring(1);
        }
        return value.substring(0);
    }
}
