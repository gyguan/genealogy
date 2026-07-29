package com.genealogy.person.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.person.application.PersonDuplicateDetectionService;
import com.genealogy.person.dto.PersonDuplicateCheckRequest;
import com.genealogy.person.dto.PersonDuplicateCheckResponse;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
public class PersonQualityController {

    private final PersonDuplicateDetectionService duplicateDetectionService;

    public PersonQualityController(PersonDuplicateDetectionService duplicateDetectionService) {
        this.duplicateDetectionService = duplicateDetectionService;
    }

    @PostMapping("/persons/check-duplicate")
    public ApiResponse<PersonDuplicateCheckResponse> checkDuplicate(
            @Valid @RequestBody PersonDuplicateCheckRequest request
    ) {
        return ApiResponse.success(duplicateDetectionService.check(request));
    }
}
