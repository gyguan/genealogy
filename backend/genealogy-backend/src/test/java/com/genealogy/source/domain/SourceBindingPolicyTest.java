package com.genealogy.source.domain;

import com.genealogy.auth.dto.ActorContext;
import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SourceBindingPolicyTest {

    private final SourceBindingAccessPolicy policy = new SourceBindingAccessPolicy();

    @Test
    void shouldNormalizeSupportedApiTargetTypes() {
        assertThat(SourceBindingTargetType.fromApi(" Generation_Word "))
                .isEqualTo(SourceBindingTargetType.GENERATION_WORD);
        assertThat(SourceBindingTargetType.PERSON.apiValue()).isEqualTo("person");
    }

    @Test
    void shouldRejectUnsupportedTargetTypes() {
        assertThatThrownBy(() -> SourceBindingTargetType.fromApi("unknown"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("来源绑定对象类型不合法");
    }

    @Test
    void shouldRequireDedicatedViewAndBindPermissions() {
        ActorContext viewer = actor(Set.of("source:view"));
        policy.requireView(viewer, 1L);
        assertThatThrownBy(() -> policy.requireManage(viewer, 1L))
                .isInstanceOf(BusinessException.class);

        ActorContext editor = actor(Set.of("source:view", "source:bind"));
        policy.requireManage(editor, 1L);
    }

    @Test
    void crossClanAdministratorShouldBypassClanAndPermissionChecks() {
        ActorContext administrator = new ActorContext(
                7L, 2L, null, Set.of("cross_clan_admin"), Set.of(), Set.of(),
                true, "request-1", "127.0.0.1"
        );
        policy.requireView(administrator, 1L);
        policy.requireManage(administrator, 1L);
    }

    private ActorContext actor(Set<String> permissions) {
        return new ActorContext(
                7L, 1L, 10L, Set.of("editor"), permissions, Set.of(99L),
                false, "request-1", "127.0.0.1"
        );
    }
}
