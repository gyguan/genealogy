package com.genealogy.imports.application;

import com.genealogy.relationship.dto.RelationshipCreateRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RelationshipImportRowTransactionTest {

    @Test
    void importedRelationshipCreationUsesRequiresNewTransaction() throws Exception {
        Method create = RelationshipImportRowTransactionService.class.getMethod(
                "create",
                Long.class,
                RelationshipCreateRequest.class,
                Long.class
        );

        Transactional transactional = create.getAnnotation(Transactional.class);

        assertEquals(Propagation.REQUIRES_NEW, transactional.propagation());
    }

    @Test
    void ordinaryRelationshipCreationKeepsOriginalInvocationPath() throws Throwable {
        RelationshipImportRowTransactionService rowTransactionService = mock(RelationshipImportRowTransactionService.class);
        RelationshipImportRowTransactionAspect aspect = new RelationshipImportRowTransactionAspect(rowTransactionService);
        ProceedingJoinPoint createJoinPoint = mock(ProceedingJoinPoint.class);
        Object expected = new Object();
        when(createJoinPoint.proceed()).thenReturn(expected);

        Object actual = aspect.isolateImportedRelationshipCreate(createJoinPoint);

        assertSame(expected, actual);
        verify(createJoinPoint).proceed();
        verify(rowTransactionService, never()).create(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(RelationshipCreateRequest.class),
                org.mockito.ArgumentMatchers.anyLong()
        );
    }

    @Test
    void importedRelationshipCreationDelegatesToIsolatedRowService() throws Throwable {
        RelationshipImportRowTransactionService rowTransactionService = mock(RelationshipImportRowTransactionService.class);
        RelationshipImportRowTransactionAspect aspect = new RelationshipImportRowTransactionAspect(rowTransactionService);
        ProceedingJoinPoint importJoinPoint = mock(ProceedingJoinPoint.class);
        ProceedingJoinPoint createJoinPoint = mock(ProceedingJoinPoint.class);
        RelationshipCreateRequest request = new RelationshipCreateRequest(
                11L,
                12L,
                "parent_child",
                "父子",
                true,
                true,
                true,
                "混合批次有效行",
                "confirmed"
        );
        Object isolatedResult = new Object();
        when(importJoinPoint.proceed()).thenAnswer(invocation -> {
            when(createJoinPoint.getArgs()).thenReturn(new Object[]{1L, request, 99L});
            return aspect.isolateImportedRelationshipCreate(createJoinPoint);
        });
        when(rowTransactionService.create(1L, request, 99L)).thenReturn(null);

        Object actual = aspect.markRelationshipImport(importJoinPoint);

        assertSame(null, actual);
        verify(rowTransactionService).create(1L, request, 99L);
        verify(createJoinPoint, never()).proceed();
    }
}
