package com.genealogy.importexport.controller;

import com.genealogy.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ImportExportCapabilityController {

    /**
     * Compatibility catalog for existing clients. Business actions are handled by
     * ImportController, DataExportController and BookletController respectively.
     */
    @GetMapping("/exports/types")
    public ApiResponse<Map<String, Object>> exportTypes() {
        return ApiResponse.success(Map.ofEntries(
                Map.entry("person_import_preview", "/api/v1/clans/{clanId}/imports/persons/preview"),
                Map.entry("person_import", "/api/v1/clans/{clanId}/imports/persons"),
                Map.entry("relationship_import_preview", "/api/v1/clans/{clanId}/imports/relationships/preview"),
                Map.entry("relationship_import", "/api/v1/clans/{clanId}/imports/relationships"),
                Map.entry("person_csv", "/api/v1/clans/{clanId}/exports/persons.csv"),
                Map.entry("branch_person_csv", "/api/v1/clans/{clanId}/branches/{branchId}/exports/persons.csv"),
                Map.entry("relation_csv", "/api/v1/clans/{clanId}/exports/relations.csv"),
                Map.entry("branch_relation_csv", "/api/v1/clans/{clanId}/branches/{branchId}/exports/relations.csv"),
                Map.entry("booklet_html", "/api/v1/clans/{clanId}/exports/booklet.html"),
                Map.entry("branch_booklet_html", "/api/v1/clans/{clanId}/branches/{branchId}/exports/booklet.html"),
                Map.entry("person_template_csv", "/api/v1/imports/templates/persons.csv"),
                Map.entry("relation_template_csv", "/api/v1/imports/templates/relations.csv")
        ));
    }
}
