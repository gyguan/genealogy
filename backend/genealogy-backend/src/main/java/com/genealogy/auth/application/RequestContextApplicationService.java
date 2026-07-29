package com.genealogy.auth.application;

import com.genealogy.auth.dto.ActorContext;
import com.genealogy.auth.dto.RequestUserContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RequestContextApplicationService {

    private static final String ACTOR_CONTEXT_ATTRIBUTE_PREFIX =
            RequestContextApplicationService.class.getName() + ".actor.";

    private final AuthorizationApplicationService authorizationApplicationService;
    private final ActorContextApplicationService actorContextApplicationService;

    @Autowired
    public RequestContextApplicationService(
            AuthorizationApplicationService authorizationApplicationService,
            ActorContextApplicationService actorContextApplicationService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.actorContextApplicationService = actorContextApplicationService;
    }

    /** Compatibility constructor for isolated unit tests. */
    public RequestContextApplicationService(AuthorizationApplicationService authorizationApplicationService) {
        this(authorizationApplicationService, null);
    }

    public RequestUserContext optional(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        Long userId = authorizationApplicationService.currentUserIdOrNull(authorization);
        return new RequestUserContext(userId, requestId(request), clientIp(request));
    }

    public RequestUserContext requireLogin(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        Long userId = authorizationApplicationService.requireLogin(authorization);
        return new RequestUserContext(userId, requestId(request), clientIp(request));
    }

    public RequestUserContext requireClanMember(Long clanId, HttpServletRequest request) {
        if (actorContextApplicationService == null) {
            String authorization = request.getHeader("Authorization");
            Long userId = authorizationApplicationService.requireClanMember(clanId, authorization);
            return new RequestUserContext(userId, requestId(request), clientIp(request));
        }
        ActorContext context = requireActor(clanId, request);
        return new RequestUserContext(context.userId(), context.requestId(), context.clientIp());
    }

    public ActorContext requireActor(Long clanId, HttpServletRequest request) {
        if (actorContextApplicationService == null) {
            throw new IllegalStateException("ActorContextApplicationService is required for actor context resolution");
        }
        String attributeName = ACTOR_CONTEXT_ATTRIBUTE_PREFIX + clanId;
        Object cached = request.getAttribute(attributeName);
        if (cached instanceof ActorContext context) {
            return context;
        }
        String authorization = request.getHeader("Authorization");
        Long userId = authorizationApplicationService.requireLogin(authorization);
        ActorContext context = actorContextApplicationService.resolve(clanId, userId)
                .withRequestMetadata(requestId(request), clientIp(request));
        request.setAttribute(attributeName, context);
        return context;
    }

    private String requestId(HttpServletRequest request) {
        String value = request.getHeader("X-Request-Id");
        if (value == null || value.isBlank()) {
            value = request.getHeader("X-Correlation-Id");
        }
        return value == null || value.isBlank() ? UUID.randomUUID().toString() : value.trim();
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
