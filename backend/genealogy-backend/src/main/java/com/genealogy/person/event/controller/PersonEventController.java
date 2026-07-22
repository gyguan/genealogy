package com.genealogy.person.event.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.person.event.application.PersonEventApplicationService;
import com.genealogy.person.event.dto.PersonEventResponse;
import com.genealogy.person.event.dto.ReplacePersonEventsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class PersonEventController {

    private final PersonEventApplicationService personEventApplicationService;

    public PersonEventController(PersonEventApplicationService personEventApplicationService) {
        this.personEventApplicationService = personEventApplicationService;
    }

    @GetMapping("/persons/{personId}/events")
    public ApiResponse<List<PersonEventResponse>> listByPerson(@Positive @PathVariable Long personId) {
        return ApiResponse.success(personEventApplicationService.listByPerson(personId));
    }

    @PutMapping("/persons/{personId}/events")
    public ApiResponse<List<PersonEventResponse>> replaceByPerson(
            @Positive @PathVariable Long personId,
            @Valid @RequestBody ReplacePersonEventsRequest request
    ) {
        return ApiResponse.success(personEventApplicationService.replaceByPerson(personId, request));
    }
}