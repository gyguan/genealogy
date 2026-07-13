package com.genealogy.member.controller;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class MemberManagementControllerContractTest {

    @Test
    void legacyControllerMustNotExposeUserDirectoryOrMemberMutations() {
        Set<String> getPaths = Arrays.stream(MemberManagementController.class.getDeclaredMethods())
                .map(method -> method.getAnnotation(GetMapping.class))
                .filter(annotation -> annotation != null)
                .flatMap(annotation -> Arrays.stream(annotation.value()))
                .collect(Collectors.toSet());

        assertThat(getPaths).doesNotContain(
                "/users",
                "/clans/{clanId}/members"
        );
        assertThat(Arrays.stream(MemberManagementController.class.getDeclaredMethods())
                .anyMatch(this::isMemberMutation)).isFalse();
    }

    private boolean isMemberMutation(Method method) {
        return method.getAnnotation(PostMapping.class) != null
                || method.getAnnotation(PutMapping.class) != null
                || method.getAnnotation(DeleteMapping.class) != null;
    }
}
