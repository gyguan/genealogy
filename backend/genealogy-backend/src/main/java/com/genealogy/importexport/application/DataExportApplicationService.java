package com.genealogy.importexport.application;

import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.dto.PersonSearchQuery;
import com.genealogy.person.entity.PersonEntity;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class DataExportApplicationService {

    private static final List<String> PERSON_HEADERS = List.of(
            "branchId", "personCode", "name", "genealogyName", "courtesyName", "aliasName", "gender",
            "generationNo", "generationWord", "rankInFamily", "birthDate", "birthDatePrecision", "deathDate",
            "deathDatePrecision", "isLiving", "birthPlace", "residencePlace", "occupation", "education",
            "titleOrHonor", "biography", "tombPlace", "epitaph", "hasDescendant", "lineageStatus", "privacyLevel",
            "dataStatus"
    );

    private final PersonCsvApplicationService legacyCsvApplicationService;
    private final PersonApplicationService personApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public DataExportApplicationService(
            PersonCsvApplicationService legacyCsvApplicationService,
            PersonApplicationService personApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.legacyCsvApplicationService = legacyCsvApplicationService;
        this.personApplicationService = personApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public byte[] exportPersons(Long clanId) {
        return legacyCsvApplicationService.exportPersons(clanId);
    }

    public byte[] exportPersonsByBranch(Long clanId, Long branchId) {
        return legacyCsvApplicationService.exportPersonsByBranch(clanId, branchId);
    }

    public byte[] exportPersonSearchResult(PersonSearchQuery query, Long actorId) {
        List<PersonEntity> persons = personApplicationService.findForExport(query, actorId);
        byte[] content = exportPersonList(persons);
        operationLogApplicationService.record(
                query.clanId(),
                actorId,
                "person_search_export",
                "person",
                null,
                "导出人物查询结果：" + persons.size() + "条",
                auditDetail(query)
        );
        return content;
    }

    public byte[] exportRelations(Long clanId) {
        return legacyCsvApplicationService.exportRelations(clanId);
    }

    public byte[] exportRelationsByBranch(Long clanId, Long branchId) {
        return legacyCsvApplicationService.exportRelationsByBranch(clanId, branchId);
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
                    value(person.getLineageStatus()), value(person.getPrivacyLevel()), value(person.getDataStatus())
            ));
        }
        return ("\ufeff" + builder).getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvRow(StringBuilder builder, List<String> values) {
        builder.append(values.stream().map(this::escapeCsv).collect(java.util.stream.Collectors.joining(",")))
                .append('\n');
    }

    private String escapeCsv(String value) {
        String safe = value == null ? "" : value;
        if (safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r")) {
            return "\"" + safe.replace("\"", "\"\"") + "\"";
        }
        return safe;
    }

    private String value(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String auditDetail(PersonSearchQuery query) {
        return "branchId=" + value(query.branchId())
                + ", nameProvided=" + (query.name() != null)
                + ", keywordProvided=" + (query.keyword() != null)
                + ", genders=" + query.genders().size()
                + ", generationWords=" + query.generationWords().size()
                + ", generationNos=" + query.generationNos().size()
                + ", dataStatuses=" + query.dataStatuses().size()
                + ", sort=" + query.sort();
    }
}