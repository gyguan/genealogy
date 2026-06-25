package com.genealogy.importexport.controller;

import com.genealogy.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ImportExportController {

    @GetMapping("/imports/templates/{templateType}")
    public ApiResponse<Map<String, Object>> getTemplate(@PathVariable String templateType) {
        return ApiResponse.success(Map.of("templateType", templateType, "status", "prepared"));
    }

    @GetMapping("/exports/types")
    public ApiResponse<Map<String, Object>> exportTypes() {
        return ApiResponse.success(Map.of("person", "person_excel", "relationship", "relationship_excel"));
    }
}
