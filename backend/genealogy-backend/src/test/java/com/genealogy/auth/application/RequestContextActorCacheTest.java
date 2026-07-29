package com.genealogy.auth.application;

import com.genealogy.auth.dto.ActorContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestContextActorCacheTest {

    @Mock AuthorizationApplicationService authorizationApplicationService;
    @Mock ActorContextApplicationService actorContextApplicationService;

    @Test
    void shouldResolveActorFactsOnlyOnceForSameClanAndRequest() {
        RequestContextApplicationService service = new RequestContextApplicationService(
                authorizationApplicationService, actorContextApplicationService
        );
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        request.addHeader("X-Request-Id", "request-1");
        request.setRemoteAddr("127.0.0.1");
        ActorContext resolved = new ActorContext(
                7L, 1L, 10L, Set.of("editor"), Set.of("source:view"), Set.of(99L),
                false, null, null
        );
        when(authorizationApplicationService.requireLogin("Bearer token")).thenReturn(7L);
        when(actorContextApplicationService.resolve(1L, 7L)).thenReturn(resolved);

        ActorContext first = service.requireActor(1L, request);
        ActorContext second = service.requireActor(1L, request);

        assertThat(second).isSameAs(first);
        assertThat(first.requestId()).isEqualTo("request-1");
        assertThat(first.clientIp()).isEqualTo("127.0.0.1");
        verify(authorizationApplicationService, times(1)).requireLogin("Bearer token");
        verify(actorContextApplicationService, times(1)).resolve(1L, 7L);
    }
}
