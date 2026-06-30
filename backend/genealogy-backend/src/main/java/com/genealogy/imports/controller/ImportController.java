package com.genealogy.imports.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.imports.application.ImportApplicationService;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportPreviewResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class ImportController {

    private final ImportApplicationService importApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportController(ImportApplicationService importApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.importApplicationService = importApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/imports/persons/preview")
    public ApiResponse<ImportPreviewResponse> previewPersons(
            @Positive @PathVariable Long clanId,
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "nameIndex", defaultValue = "0") int nameIndex,
            @RequestParam(value = "genderIndex", defaultValue = "1") int genderIndex,
            @RequestParam(value = "generationNoIndex", defaultValue = "2") int generationNoIndex,
            @RequestParam(value = "generationWordIndex", defaultValue = "3") int generationWordIndex,
            @RequestParam(value = "branchIdIndex", defaultValue = "4") int branchIdIndex,
            @RequestParam(value = "birthDateIndex", defaultValue = "5") int birthDateIndex,
            @RequestParam(value = "isLivingIndex", defaultValue = "6") int isLivingIndex,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importApplicationService.previewPersons(clanId, branchId, file, mapping(nameIndex, genderIndex, generationNoIndex, generationWordIndex, branchIdIndex, birthDateIndex, isLivingIndex), actorId));
    }

    @PostMapping("/clans/{clanId}/imports/persons.csv")
    public ApiResponse<ImportJobResponse> importPersonsCsv(
            @Positive @PathVariable Long clanId,
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "confirmDuplicates", defaultValue = "false") boolean confirmDuplicates,
            @RequestParam(value = "nameIndex", defaultValue = "0") int nameIndex,
            @RequestParam(value = "genderIndex", defaultValue = "1") int genderIndex,
            @RequestParam(value = "generationNoIndex", defaultValue = "2") int generationNoIndex,
            @RequestParam(value = "generationWordIndex", defaultValue = "3") int generationWordIndex,
            @RequestParam(value = "branchIdIndex", defaultValue = "4") int branchIdIndex,
            @RequestParam(value = "birthDateIndex", defaultValue = "5") int birthDateIndex,
            @RequestParam(value = "isLivingIndex", defaultValue = "6") int isLivingIndex,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importApplicationService.importPersonsCsv(clanId, branchId, file, mapping(nameIndex, genderIndex, generationNoIndex, generationWordIndex, branchIdIndex, birthDateIndex, isLivingIndex), confirmDuplicates, actorId));
    }

    @GetMapping("/clans/{clanId}/imports")
    public ApiResponse<List<ImportJobResponse>> listJobs(@Positive @PathVariable Long clanId) {
        return ApiResponse.success(importApplicationService.listJobs(clanId));
    }

    private ImportApplicationService.FieldMapping mapping(int nameIndex, int genderIndex, int generationNoIndex, int generationWordIndex, int branchIdIndex, int birthDateIndex, int isLivingIndex) {
        return new ImportApplicationService.FieldMapping(nameIndex, genderIndex, generationNoIndex, generationWordIndex, branchIdIndex, birthDateIndex, isLivingIndex);
    }
}
