package com.genealogy.review.controller;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ReviewQualityWebMvcConfiguration implements WebMvcConfigurer {

    private final ReviewQualityApprovalGateInterceptor approvalGateInterceptor;

    public ReviewQualityWebMvcConfiguration(ReviewQualityApprovalGateInterceptor approvalGateInterceptor) {
        this.approvalGateInterceptor = approvalGateInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(approvalGateInterceptor)
                .addPathPatterns(
                        "/api/v1/review-tasks/*/approve",
                        "/api/v1/reviews/tasks/*/approve"
                );
    }
}
