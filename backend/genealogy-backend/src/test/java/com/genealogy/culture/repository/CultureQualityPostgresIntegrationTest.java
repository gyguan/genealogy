package com.genealogy.culture.repository;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityMetrics;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityScope;
import com.genealogy.culture.repository.CultureQualityQueryRepository.TargetConfig;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_INTEGRATION_TESTS", matches = "true")
class CultureQualityPostgresIntegrationTest {

    @Autowired private ClanRepository clanRepository;
    @Autowired private CultureItemRepository cultureItemRepository;
    @Autowired private SourceRepository sourceRepository;
    @Autowired private SourceBindingRepository sourceBindingRepository;
    @Autowired private RevisionRepository revisionRepository;
    @Autowired private CultureQualityQueryRepository qualityQueryRepository;

    @Test
    void calculatesSourcesCompletenessPendingAndIssueCodes() {
        ClanEntity clan = new ClanEntity();
        clan.setClanCode("culture-quality-" + System.nanoTime());
        clan.setClanName("文化质量测试宗族");
        clan.setSurname("陈");
        clan.setStatus("active");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clan = clanRepository.saveAndFlush(clan);

        CultureItemEntity complete = item(clan.getId(), "忠孝传家", "家训摘要", "家训正文", "high");
        complete = cultureItemRepository.saveAndFlush(complete);
        CultureItemEntity incomplete = item(clan.getId(), "待考家训", null, null, "unknown");
        incomplete = cultureItemRepository.saveAndFlush(incomplete);

        SourceEntity source = new SourceEntity();
        source.setClanId(clan.getId());
        source.setSourceName("陈氏族谱");
        source.setSourceType("genealogy_book");
        source.setVerificationStatus("official");
        source.setConfidenceLevel("high");
        source.setPrivacyLevel("clan_only");
        source.setSensitiveLevel("normal");
        source.setCreatedAt(LocalDateTime.now());
        source.setUpdatedAt(LocalDateTime.now());
        source = sourceRepository.saveAndFlush(source);

        SourceBindingEntity binding = new SourceBindingEntity();
        binding.setClanId(clan.getId());
        binding.setSourceId(source.getId());
        binding.setTargetType("culture_item");
        binding.setTargetId(complete.getId());
        binding.setConfidenceLevel("high");
        binding.setBindingStatus("official");
        binding.setCreatedAt(LocalDateTime.now());
        binding.setUpdatedAt(LocalDateTime.now());
        sourceBindingRepository.saveAndFlush(binding);

        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clan.getId());
        revision.setTargetType("culture_item");
        revision.setTargetId(incomplete.getId());
        revision.setChangeType("update");
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus("pending");
        revisionRepository.saveAndFlush(revision);

        QualityScope scope = new QualityScope(
                clan.getId(), 999L, true, List.of(-1L), true, LocalDateTime.now().minusDays(365));
        QualityMetrics metrics = qualityQueryRepository.metrics(TargetConfig.CULTURE_ITEM, scope);

        assertThat(metrics.officialCount()).isEqualTo(2);
        assertThat(metrics.pendingReviewCount()).isEqualTo(1);
        assertThat(metrics.sourceCoveredCount()).isEqualTo(1);
        assertThat(metrics.strongSourceCount()).isEqualTo(1);
        assertThat(metrics.completeCount()).isEqualTo(1);
        assertThat(metrics.lowConfidenceCount()).isEqualTo(1);

        assertThat(qualityQueryRepository.issues(TargetConfig.CULTURE_ITEM, scope, 10))
                .singleElement()
                .satisfies(issue -> {
                    assertThat(issue.targetId()).isEqualTo(incomplete.getId());
                    assertThat(issue.issueCodes()).contains("PENDING_REVIEW", "NO_SOURCE", "INCOMPLETE", "LOW_CONFIDENCE");
                });
    }

    private CultureItemEntity item(Long clanId, String title, String summary, String content, String confidence) {
        CultureItemEntity item = new CultureItemEntity();
        item.setClanId(clanId);
        item.setCategory("family_instruction");
        item.setTitle(title);
        item.setSummary(summary);
        item.setContent(content);
        item.setConfidenceLevel(confidence);
        item.setPrivacyLevel("clan_only");
        item.setSensitiveLevel("normal");
        item.setDataStatus("official");
        item.setSortOrder(0);
        return item;
    }
}
