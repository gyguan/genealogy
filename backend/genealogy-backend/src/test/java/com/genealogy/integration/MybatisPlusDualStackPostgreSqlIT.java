package com.genealogy.integration;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.persistence.PageQuery;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class MybatisPlusDualStackPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_mybatis_dual_stack_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired ClanRepository clanRepository;
    @Autowired GenSchemeRepository genSchemeRepository;
    @Autowired GenWordRepository genWordRepository;
    @Autowired AppUserRepository appUserRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void clanMapperSupportsIdentityExplicitNullUpdatePagingAndDelete() {
        String token = token();
        ClanEntity first = clan("MP-CLAN-A-" + token, "双栈宗族甲", "黄");
        first.setDescription("待清空");
        clanRepository.save(first);

        ClanEntity second = clan("MP-CLAN-B-" + token, "双栈宗族乙", "黄");
        clanRepository.save(second);

        assertThat(first.getId()).isPositive();
        assertThat(second.getId()).isPositive();

        first.setDescription(null);
        first.setHallName(null);
        clanRepository.save(first);

        ClanEntity reloaded = clanRepository.findById(first.getId()).orElseThrow();
        assertThat(reloaded.getDescription()).isNull();
        assertThat(reloaded.getHallName()).isNull();

        List<Long> pageIds = clanRepository.findPage(new PageQuery(1, 1000)).records().stream()
                .map(ClanEntity::getId)
                .toList();
        assertThat(pageIds).contains(first.getId(), second.getId());
        assertThat(pageIds.indexOf(second.getId())).isLessThan(pageIds.indexOf(first.getId()));

        clanRepository.deleteById(second.getId());
        assertThat(clanRepository.existsById(second.getId())).isFalse();
        clanRepository.deleteById(first.getId());
    }

    @Test
    void generationMappersReturnIdentityAndKeepBoundedBatchAtomic() {
        String token = token();
        ClanEntity clan = clan("MP-GEN-CLAN-" + token, "字辈测试宗族", "黄");
        clanRepository.save(clan);

        GenerationSchemeEntity scheme = new GenerationSchemeEntity();
        scheme.setClanId(clan.getId());
        scheme.setSchemeName("测试字辈方案-" + token);
        scheme.setPoemText("承先启后");
        scheme.setStartGeneration(1);
        scheme.setIsDefault(true);
        scheme.setValidationEnabled(true);
        scheme.setStrictMode(false);
        scheme.setStatus("draft");
        scheme.setCreatedAt(LocalDateTime.now());
        genSchemeRepository.save(scheme);
        assertThat(scheme.getId()).isPositive();

        GenerationWordEntity duplicateA = word(scheme.getId(), 1, "承", 1, "重复批次甲");
        GenerationWordEntity duplicateB = word(scheme.getId(), 1, "先", 2, "重复批次乙");
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> transaction.executeWithoutResult(status ->
                genWordRepository.saveAll(List.of(duplicateA, duplicateB))))
                .isInstanceOf(RuntimeException.class);
        assertThat(genWordRepository.findBySchemeIdOrderByGenerationNoAsc(scheme.getId())).isEmpty();

        GenerationWordEntity first = word(scheme.getId(), 1, "承", 1, "待清空");
        GenerationWordEntity second = word(scheme.getId(), 2, "先", 2, null);
        genWordRepository.saveAll(List.of(first, second));
        assertThat(first.getId()).isPositive();
        assertThat(second.getId()).isPositive();

        first.setDescription(null);
        genWordRepository.save(first);
        assertThat(genWordRepository.findById(first.getId()).orElseThrow().getDescription()).isNull();
        assertThat(genWordRepository.findBySchemeIdOrderByGenerationNoAsc(scheme.getId()))
                .extracting(GenerationWordEntity::getGenerationNo)
                .containsExactly(1, 2);

        genWordRepository.deleteBySchemeId(scheme.getId());
        genSchemeRepository.deleteById(scheme.getId());
        clanRepository.deleteById(clan.getId());
    }

    @Test
    void mybatisAndJpaWritesRollbackInTheSameSpringTransaction() {
        String token = token();
        String username = "dual-stack-" + token;
        String clanCode = "MP-ROLLBACK-" + token;
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            AppUserEntity user = new AppUserEntity();
            user.setUsername(username);
            user.setPasswordHash("not-used-in-integration-test");
            user.setDisplayName("双栈事务用户");
            user.setStatus("active");
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            appUserRepository.saveAndFlush(user);

            clanRepository.save(clan(clanCode, "双栈事务宗族", "黄"));
            throw new IllegalStateException("force rollback");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(appUserRepository.existsByUsername(username)).isFalse();
        assertThat(clanRepository.existsByClanCode(clanCode)).isFalse();
    }

    private static ClanEntity clan(String code, String name, String surname) {
        ClanEntity clan = new ClanEntity();
        clan.setClanCode(code);
        clan.setClanName(name);
        clan.setSurname(surname);
        clan.setStatus("draft");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        return clan;
    }

    private static GenerationWordEntity word(
            Long schemeId,
            int generationNo,
            String word,
            int sortOrder,
            String description
    ) {
        GenerationWordEntity entity = new GenerationWordEntity();
        entity.setSchemeId(schemeId);
        entity.setGenerationNo(generationNo);
        entity.setWord(word);
        entity.setSortOrder(sortOrder);
        entity.setDescription(description);
        return entity;
    }

    private static String token() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
