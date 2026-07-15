package com.genealogy.tree.e2e;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

@Component
@Profile("tree-e2e")
@Order(Ordered.HIGHEST_PRECEDENCE)
class TreeReleaseGateExceptionDiagnostics implements HandlerExceptionResolver {

    @Override
    public ModelAndView resolveException(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception exception
    ) {
        System.err.println("TREE_RELEASE_GATE_EXCEPTION " + request.getMethod() + " " + request.getRequestURI());
        exception.printStackTrace(System.err);
        return null;
    }
}
