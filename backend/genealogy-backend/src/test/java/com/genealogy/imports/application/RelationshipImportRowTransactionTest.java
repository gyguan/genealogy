package com.genealogy.imports.application;

import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.lang.reflect.Method;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = RelationshipImportRowTransactionTest.TestConfiguration.class)
class RelationshipImportRowTransactionTest {

    @Autowired
    private RelationshipImportRowTransactionService proxiedRowTransactionService;

    @Autowired
    private RelationshipApplicationService relationshipApplicationService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private DataSource dataSource;

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
    void springProxySuspendsBatchTransactionAndStartsIndependentRowTransaction() throws Exception {
        RelationshipCreateRequest request = request();
        TransactionTemplate batchTransaction = new TransactionTemplate(transactionManager);

        batchTransaction.executeWithoutResult(status ->
                proxiedRowTransactionService.create(1L, request, 99L)
        );

        verify(relationshipApplicationService).create(1L, request, 99L);
        verify(dataSource, times(2)).getConnection();
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
        verify(rowTransactionService, never()).create(anyLong(), any(RelationshipCreateRequest.class), anyLong());
    }

    @Test
    void importedRelationshipCreationDelegatesToIsolatedRowService() throws Throwable {
        RelationshipImportRowTransactionService rowTransactionService = mock(RelationshipImportRowTransactionService.class);
        RelationshipImportRowTransactionAspect aspect = new RelationshipImportRowTransactionAspect(rowTransactionService);
        ProceedingJoinPoint importJoinPoint = mock(ProceedingJoinPoint.class);
        ProceedingJoinPoint createJoinPoint = mock(ProceedingJoinPoint.class);
        RelationshipCreateRequest request = request();
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

    private RelationshipCreateRequest request() {
        return new RelationshipCreateRequest(
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
    }

    @Configuration
    @EnableTransactionManagement(proxyTargetClass = true)
    static class TestConfiguration {

        @Bean
        DataSource dataSource() throws Exception {
            DataSource dataSource = mock(DataSource.class);
            Connection batchConnection = mock(Connection.class);
            Connection rowConnection = mock(Connection.class);
            when(batchConnection.getAutoCommit()).thenReturn(true);
            when(rowConnection.getAutoCommit()).thenReturn(true);
            when(dataSource.getConnection()).thenReturn(batchConnection, rowConnection);
            return dataSource;
        }

        @Bean
        PlatformTransactionManager transactionManager(DataSource dataSource) {
            return new DataSourceTransactionManager(dataSource);
        }

        @Bean
        RelationshipApplicationService relationshipApplicationService() {
            return mock(RelationshipApplicationService.class);
        }

        @Bean
        RelationshipImportRowTransactionService relationshipImportRowTransactionService(
                ObjectProvider<RelationshipApplicationService> provider
        ) {
            return new RelationshipImportRowTransactionService(provider);
        }
    }
}
