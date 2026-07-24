package com.genealogy.review.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.application.ReviewQualityCheckApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ReviewQualityApprovalGateInterceptor implements HandlerInterceptor {

    private static final Pattern APPROVE_PATH = Pattern.compile("^/api/v1/(?:review-tasks|reviews/tasks)/(\\d+)/approve$");

    private final ReviewQualityCheckApplicationService reviewQualityCheckApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ReviewQualityApprovalGateInterceptor(
            ReviewQualityCheckApplicationService reviewQualityCheckApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.reviewQualityCheckApplicationService = reviewQualityCheckApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        Matcher matcher = APPROVE_PATH.matcher(request.getRequestURI());
        if (!matcher.matches()) {
            return true;
        }
        final Long taskId;
        try {
            taskId = Long.valueOf(matcher.group(1));
        } catch (NumberFormatException ex) {
            throw new BusinessException("REVIEW_QUALITY_NOT_FOUND", "审核任务不存在");
        }
        Long actorId = authorizationApplicationService.requireLogin(request.getHeader("Authorization"));
        reviewQualityCheckApplicationService.ensureApprovalAllowed(taskId, actorId);
        return true;
    }
}
