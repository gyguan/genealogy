package com.genealogy.operationlog.controller;

import com.genealogy.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/logs")
public class OpLogController {

    @GetMapping("/operations")
    public ApiResponse<List<String>> listOperations() {
        return ApiResponse.success(List.of());
    }
}
