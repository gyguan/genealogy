package com.genealogy.importexport.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.importexport.dto.CsvImportResultResponse;
import com.genealogy.importexport.dto.PersonImportOptions;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PersonCsvApplicationService {

    private static final List<String> PERSON_HEADERS = List.of(
            "branchId", "personCode", "name", "genealogyName", "courtesyName", "aliasName", "gender",
            "generationNo", "generationWord", "rankInFamily", "birthDate", "birthDatePrecision", "deathDate",
            "deathDatePrecision", "isLiving", "birthPlace", "residencePlace", "occupation", "education",
            "titleOrHonor", "biography", "tombPlace", "epitaph", "hasDescendant", "lineageStatus", "privacyLevel"
    );

    private static final List<String> RELATION_HEADERS = List.of(
            "fromPersonId", "toPersonId", "relationType", "relationLabel", "isLineageRelation",
            "isBiological", "isPrimary", "description", "confidenceLevel"
    );

    private static final Map<String, List<String>> PERSON_IMPORT_ALIASES = Map.of(
            "branchId", List.of("branchId", "branch_id", "支派ID", "支派id", "支派编号", "支派"),
            "name", List.of("name", "姓名", "人物姓名", "族人姓名"),
            "gender", List.of("gender", "性别"),
            "generationNo", List.of("generationNo", "generation_no", "代次", "世次", "第几世"),
            "generationWord", List.of("generationWord", "generation_word", "字辈", "辈字", "派语"),
            "birthDate", List.of("birthDate", "birth_date", "出生日期", "出生年月", "出生时间"),
            "isLiving", List.of("isLiving", "is_living", "是否在世", "在世", "是否健在"),
            "personCode", List.of("personCode", "person_code", "人物编码", "谱号", "编号")
    );

    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final PersonApplicationService personApplicationService;
    private final RelationshipRepository relationshipRepository;
    private final RelationshipApplicationService relationshipApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public PersonCsvApplicationService(
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
            PersonApplicationService personApplicationService,
            RelationshipRepository relationshipRepository,
            RelationshipApplicationService relationshipApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
        this.personApplicationService = personApplicationService;
        this.relationshipRepository = relationshipRepository;
        this.relationshipApplicationService = relationshipApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public byte[] buildPersonTemplate() {
        StringBuilder builder = new StringBuilder();
        builder.append(String.join(",", PERSON_HEADERS)).append("\n");
        builder.append("1,P001,张三,三公,子明,,male,5,德,长子,1980-01-01,day,,,,湖南长沙,湖南长沙,教师,本科,,家族成员简介,,,true,normal,clan_only\n");
        return addUtf8Bom(builder.toString()).getBytes(StandardCharsets.UTF_8);
    }

    public byte[] buildRelationTemplate() {
        StringBuilder builder = new StringBuilder();
        appendCsvRow(builder, RELATION_HEADERS);
        appendCsvRow(builder, List.of("1", "2", "parent_child", "father", "true", "true", "true", "父子关系", "high"));
        return addUtf8Bom(builder.toString()).getBytes(StandardCharsets.UTF_8);
    }

    public byte[] exportPersons(Long clanId) {
        ensureClanExists(clanId);
        return exportPersonList(personRepository.findByClanIdAndDeletedAtIsNull(clanId));
    }

    public byte[] exportPersonsByBranch(Long clanId, Long branchId) {
        ensureClanExists(clanId);
        Set<Long> branchScopeIds = findBranchScopeIds(clanId, branchId);
        return exportPersonList(personRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(person -> person.getBranchId() != null && branchScopeIds.contains(person.getBranchId()))
                .toList());
    }

    public byte[] exportRelations(Long clanId) {
        ensureClanExists(clanId);
        return exportRelationList(relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId));
    }

    public byte[] exportRelationsByBranch(Long clanId, Long branchId) {
        ensureClanExists(clanId);
        Set<Long> branchScopeIds = findBranchScopeIds(clanId, branchId);
        Set<Long> personIds = personRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(person -> person.getBranchId() != null && branchScopeIds.contains(person.getBranchId()))
                .map(PersonEntity::getId)
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));
        return exportRelationList(relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(relation -> personIds.contains(relation.getFromPersonId()) && personIds.contains(relation.getToPersonId()))
                .toList());
    }

    private byte[] exportPersonList(List<PersonEntity> persons) {
        StringBuilder builder = new StringBuilder();
        appendCsvRow(builder, PERSON_HEADERS);
        for (PersonEntity person : persons) {
            appendCsvRow(builder, List.of(
                    value(person.getBranchId()), value(person.getPersonCode()), value(person.getName()), value(person.getGenealogyName()),
                    value(person.getCourtesyName()), value(person.getAliasName()), value(person.getGender()), value(person.getGenerationNo()),
                    value(person.getGenerationWord()), value(person.getRankInFamily()), value(person.getBirthDate()), value(person.getBirthDatePrecision()),
                    value(person.getDeathDate()), value(person.getDeathDatePrecision()), value(person.getIsLiving()), value(person.getBirthPlace()),
                    value(person.getResidencePlace()), value(person.getOccupation()), value(person.getEducation()), value(person.getTitleOrHonor()),
                    value(person.getBiography()), value(person.getTombPlace()), value(person.getEpitaph()), value(person.getHasDescendant()),
                    value(person.getLineageStatus()), value(person.getPrivacyLevel())
            ));
        }
        return addUtf8Bom(builder.toString()).getBytes(StandardCharsets.UTF_8);
    }

    private byte[] exportRelationList(List<RelationshipEntity> relations) {
        StringBuilder builder = new StringBuilder();
        appendCsvRow(builder, RELATION_HEADERS);
        for (RelationshipEntity relation : relations) {
            appendCsvRow(builder, List.of(
                    value(relation.getFromPersonId()), value(relation.getToPersonId()), value(relation.getRelationType()),
                    value(relation.getRelationLabel()), value(relation.getIsLineageRelation()), value(relation.getIsBiological()),
                    value(relation.getIsPrimary()), value(relation.getDescription()), value(relation.getConfidenceLevel())
            ));
        }
        return addUtf8Bom(builder.toString()).getBytes(StandardCharsets.UTF_8);
    }

    private Set<Long> findBranchScopeIds(Long clanId, Long branchId) {
        BranchEntity root = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        String rootPath = root.getBranchPath();
        Set<Long> result = new HashSet<>();
        for (BranchEntity branch : branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId)) {
            if (root.getId().equals(branch.getId()) || isDescendantPath(rootPath, branch.getBranchPath())) {
                result.add(branch.getId());
            }
        }
        if (result.isEmpty()) {
            result.add(branchId);
        }
        return result;
    }

    private boolean isDescendantPath(String rootPath, String candidatePath) {
        if (rootPath == null || rootPath.isBlank() || candidatePath == null || candidatePath.isBlank()) {
            return false;
        }
        return candidatePath.equals(rootPath) || candidatePath.startsWith(rootPath + "/");
    }

    public CsvImportResultResponse previewPersons(Long clanId, MultipartFile file) {
        return previewPersons(clanId, file, new PersonImportOptions());
    }

    public CsvImportResultResponse previewPersons(Long clanId, MultipartFile file, PersonImportOptions options) {
        return parsePersons(clanId, file, null, false, effectiveOptions(options));
    }

    public CsvImportResultResponse importPersons(Long clanId, MultipartFile file) {
        return importPersons(clanId, file, null, new PersonImportOptions());
    }

    public CsvImportResultResponse importPersons(Long clanId, MultipartFile file, Long actorId) {
        return importPersons(clanId, file, actorId, new PersonImportOptions());
    }

    public CsvImportResultResponse importPersons(Long clanId, MultipartFile file, Long actorId, PersonImportOptions options) {
        return parsePersons(clanId, file, actorId, true, effectiveOptions(options));
    }

    public CsvImportResultResponse previewRelations(Long clanId, MultipartFile file) {
        return parseRelations(clanId, file, null, false);
    }

    public CsvImportResultResponse importRelations(Long clanId, MultipartFile file, Long actorId) {
        return parseRelations(clanId, file, actorId, true);
    }

    private CsvImportResultResponse parsePersons(Long clanId, MultipartFile file, Long actorId, boolean persist, PersonImportOptions options) {
        ensureClanExists(clanId);
        List<String> lines = readNonEmptyLines(file);
        Map<String, Integer> headerIndex = parseHeader(lines.get(0));
        Map<String, Integer> personMapping = resolvePersonMapping(headerIndex, options);
        if (!personMapping.containsKey("name")) {
            throw new BusinessException("CSV_HEADER_INVALID", "CSV表头缺少姓名字段，且未指定 nameIndex");
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
                PersonCreateRequest request = toCreateRequest(personMapping, parseCsvLine(line), options);
                if (request.name() == null || request.name().isBlank()) {
                    throw new BusinessException("PERSON_NAME_REQUIRED", "姓名不能为空");
                }
                if (request.branchId() == null) {
                    throw new BusinessException("PERSON_BRANCH_REQUIRED", "支派不能为空，请在文件中提供 branchId 或通过 branchId 参数指定当前支派");
                }
                if (persist) {
                    personApplicationService.create(clanId, request, actorId);
                }
                success++;
            } catch (Exception ex) {
                errors.add("第" + (i + 1) + "行处理失败：" + ex.getMessage());
            }
        }
        CsvImportResultResponse result = new CsvImportResultResponse(total, success, total - success, errors);
        if (persist) {
            operationLogApplicationService.record(clanId, actorId, "person_csv_import", "clan", clanId, "导入人物CSV：成功" + success + "条，失败" + (total - success) + "条", String.join("\n", errors));
        }
        return result;
    }

    private CsvImportResultResponse parseRelations(Long clanId, MultipartFile file, Long actorId, boolean persist) {
        ensureClanExists(clanId);
        List<String> lines = readNonEmptyLines(file);
        Map<String, Integer> headerIndex = parseHeader(lines.get(0));
        if (!headerIndex.containsKey("fromPersonId") || !headerIndex.containsKey("toPersonId") || !headerIndex.containsKey("relationType")) {
            throw new BusinessException("CSV_HEADER_INVALID", "CSV表头缺少必填字段 fromPersonId/toPersonId/relationType");
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
                RelationshipCreateRequest request = toRelationCreateRequest(headerIndex, parseCsvLine(line));
                if (request.fromPersonId() == null || request.toPersonId() == null || request.relationType() == null) {
                    throw new BusinessException("RELATION_CSV_REQUIRED", "关系CSV必填字段为空");
                }
                if (persist) {
                    relationshipApplicationService.create(clanId, request, actorId);
                }
                success++;
            } catch (Exception ex) {
                errors.add("第" + (i + 1) + "行处理失败：" + ex.getMessage());
            }
        }
        CsvImportResultResponse result = new CsvImportResultResponse(total, success, total - success, errors);
        if (persist) {
            operationLogApplicationService.record(clanId, actorId, "relationship_csv_import", "clan", clanId, "导入关系CSV：成功" + success + "条，失败" + (total - success) + "条", String.join("\n", errors));
        }
        return result;
    }

    private List<String> readNonEmptyLines(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("CSV_FILE_EMPTY", "CSV文件不能为空");
        }
        List<String> lines = readLines(file);
        if (lines.isEmpty()) {
            throw new BusinessException("CSV_FILE_EMPTY", "CSV文件不能为空");
        }
        return lines;
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

    private Map<String, Integer> resolvePersonMapping(Map<String, Integer> headerIndex, PersonImportOptions options) {
        Map<String, Integer> result = new LinkedHashMap<>();
        if (options.autoMappingEnabled()) {
            for (String header : PERSON_HEADERS) {
                if (headerIndex.containsKey(header)) {
                    result.put(header, headerIndex.get(header));
                }
            }
            for (Map.Entry<String, List<String>> entry : PERSON_IMPORT_ALIASES.entrySet()) {
                Integer index = findHeaderIndex(headerIndex, entry.getValue());
                if (index != null) {
                    result.put(entry.getKey(), index);
                }
            }
        }
        boolean override = !options.autoMappingEnabled();
        applyExplicitIndex(result, "name", options.getNameIndex(), override);
        applyExplicitIndex(result, "gender", options.getGenderIndex(), override);
        applyExplicitIndex(result, "generationNo", options.getGenerationNoIndex(), override);
        applyExplicitIndex(result, "generationWord", options.getGenerationWordIndex(), override);
        applyExplicitIndex(result, "branchId", options.getBranchIdIndex(), override);
        applyExplicitIndex(result, "birthDate", options.getBirthDateIndex(), override);
        applyExplicitIndex(result, "isLiving", options.getIsLivingIndex(), override);
        return result;
    }

    private Integer findHeaderIndex(Map<String, Integer> headerIndex, List<String> aliases) {
        for (String alias : aliases) {
            Integer index = headerIndex.get(alias);
            if (index != null) {
                return index;
            }
        }
        Map<String, Integer> normalized = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> entry : headerIndex.entrySet()) {
            normalized.put(normalizeHeader(entry.getKey()), entry.getValue());
        }
        for (String alias : aliases) {
            Integer index = normalized.get(normalizeHeader(alias));
            if (index != null) {
                return index;
            }
        }
        return null;
    }

    private String normalizeHeader(String value) {
        return value == null ? "" : value.trim().replace(" ", "").replace("_", "").replace("-", "").toLowerCase(Locale.ROOT);
    }

    private void applyExplicitIndex(Map<String, Integer> mapping, String field, Integer index, boolean override) {
        if (index == null || index < 0) {
            return;
        }
        if (override || !mapping.containsKey(field)) {
            mapping.put(field, index);
        }
    }

    private PersonImportOptions effectiveOptions(PersonImportOptions options) {
        return options == null ? new PersonImportOptions() : options;
    }

    private PersonCreateRequest toCreateRequest(Map<String, Integer> headerIndex, List<String> cells, PersonImportOptions options) {
        Long branchId = parseLong(read(headerIndex, cells, "branchId"));
        if (branchId == null) {
            branchId = options.getBranchId();
        }
        return new PersonCreateRequest(
                branchId, read(headerIndex, cells, "personCode"), read(headerIndex, cells, "name"),
                read(headerIndex, cells, "genealogyName"), read(headerIndex, cells, "courtesyName"), read(headerIndex, cells, "aliasName"),
                read(headerIndex, cells, "gender"), parseInteger(read(headerIndex, cells, "generationNo")), read(headerIndex, cells, "generationWord"),
                read(headerIndex, cells, "rankInFamily"), parseDate(read(headerIndex, cells, "birthDate")), read(headerIndex, cells, "birthDatePrecision"),
                parseDate(read(headerIndex, cells, "deathDate")), read(headerIndex, cells, "deathDatePrecision"), parseBoolean(read(headerIndex, cells, "isLiving")),
                read(headerIndex, cells, "birthPlace"), read(headerIndex, cells, "residencePlace"), read(headerIndex, cells, "occupation"),
                read(headerIndex, cells, "education"), read(headerIndex, cells, "titleOrHonor"), read(headerIndex, cells, "biography"),
                read(headerIndex, cells, "tombPlace"), read(headerIndex, cells, "epitaph"), parseBoolean(read(headerIndex, cells, "hasDescendant")),
                read(headerIndex, cells, "lineageStatus"), read(headerIndex, cells, "privacyLevel"), options.confirmDuplicatesEnabled()
        );
    }

    private RelationshipCreateRequest toRelationCreateRequest(Map<String, Integer> headerIndex, List<String> cells) {
        return new RelationshipCreateRequest(
                parseLong(read(headerIndex, cells, "fromPersonId")), parseLong(read(headerIndex, cells, "toPersonId")), read(headerIndex, cells, "relationType"),
                read(headerIndex, cells, "relationLabel"), parseBoolean(read(headerIndex, cells, "isLineageRelation")), parseBoolean(read(headerIndex, cells, "isBiological")),
                parseBoolean(read(headerIndex, cells, "isPrimary")), read(headerIndex, cells, "description"), read(headerIndex, cells, "confidenceLevel")
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

    private Long parseLong(String value) { return value == null ? null : Long.valueOf(value); }
    private Integer parseInteger(String value) { return value == null ? null : Integer.valueOf(value); }
    private Boolean parseBoolean(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (List.of("true", "1", "yes", "y", "是", "在世", "健在", "有").contains(normalized)) {
            return true;
        }
        if (List.of("false", "0", "no", "n", "否", "不在世", "已故", "无").contains(normalized)) {
            return false;
        }
        return Boolean.valueOf(normalized);
    }
    private LocalDate parseDate(String value) { return value == null ? null : LocalDate.parse(value); }

    private List<String> parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (quoted && i + 1 < line.length() && line.charAt(i + 1) == '"') { current.append('"'); i++; } else { quoted = !quoted; }
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

    private String value(Object value) { return value == null ? "" : String.valueOf(value); }
    private String addUtf8Bom(String value) { return "\uFEFF" + value; }
    private String stripBom(String value) { if (value != null && value.startsWith("\uFEFF")) return value.substring(1); return value == null ? null : value.substring(0); }
}
