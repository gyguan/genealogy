package com.genealogy.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LocalTestDataAutoInitializerTest {

    @Test
    void seedsFreshNoProfileLocalDatabase() {
        MockEnvironment environment = new MockEnvironment();
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("select count(*) from clan", Long.class)).thenReturn(0L);
        when(jdbcTemplate.queryForObject(
                "select count(*) from clan where clan_code like 'SCENARIO-%'",
                Long.class
        )).thenReturn(2L);

        new LocalTestDataAutoInitializer(environment, jdbcTemplate).initializeIfNeeded();

        verify(jdbcTemplate).execute(contains("SCENARIO-ZHANG-HUAIYANG"));
    }

    @Test
    void skipsWhenBusinessDataAlreadyExists() {
        MockEnvironment environment = new MockEnvironment();
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject("select count(*) from clan", Long.class)).thenReturn(1L);

        new LocalTestDataAutoInitializer(environment, jdbcTemplate).initializeIfNeeded();

        verify(jdbcTemplate, never()).execute(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void skipsCiAndNonLocalProfiles() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);

        MockEnvironment ciEnvironment = new MockEnvironment().withProperty("CI", "true");
        new LocalTestDataAutoInitializer(ciEnvironment, jdbcTemplate).initializeIfNeeded();

        MockEnvironment testEnvironment = new MockEnvironment();
        testEnvironment.setActiveProfiles("test");
        new LocalTestDataAutoInitializer(testEnvironment, jdbcTemplate).initializeIfNeeded();

        MockEnvironment prodEnvironment = new MockEnvironment();
        prodEnvironment.setActiveProfiles("production", "prod");
        new LocalTestDataAutoInitializer(prodEnvironment, jdbcTemplate).initializeIfNeeded();

        verify(jdbcTemplate, never()).queryForObject("select count(*) from clan", Long.class);
        verify(jdbcTemplate, never()).execute(org.mockito.ArgumentMatchers.anyString());
    }
}
