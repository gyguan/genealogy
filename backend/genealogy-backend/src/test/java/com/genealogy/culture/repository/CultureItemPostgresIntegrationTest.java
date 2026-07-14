package com.genealogy.culture.repository;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.persistence.TargetCountProjection;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_INTEGRATION_TESTS", matches = "true")
class CultureItemPostgresIntegrationTest {

    @Autowired private ClanRepository clanRepository;
    @Autowired private CultureItemRepository cultureItemRepository;
    @Autowired private SourceRepository sourceRepository;
    @Autowired private SourceBindingRepository sourceBindingRepository;
    @Autowired private SourceAttachmentRepository sourceAttachmentRepository;
    @Autowired private RevisionRepository revisionRepository;

    @Test
    void executesBatchSourceAttachmentAndReviewCountsOnPostgres() {
        ClanEntity clan = new ClanEntity();
        clan.setClanCode("culture-it-" + System.nanoTime());
        clan.setClanName("文化集成测试宗族");
        clan.setSurname("张");
        clan.setStatus("active");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clan = clanRepository.saveAndFlush(clan);

        CultureItemEntity item = new CultureItemEntity();
        item.setClanId(clan.getId());
        item.setCategory("hall_name");
        item.setTitle("敦本堂");
        item.setSummary("堂号摘要");
        item.setContent("堂号正文与历史说明");
        item.setConfidenceLevel("high");
        item.setPrivacyLevel("clan_only");
        item.setSensitiveLevel("normal");
        item.setDataStatus("draft");
        item.setSortOrder(0);
        item = cultureItemRepository.saveAndFlush(item);

        SourceEntity source = new SourceEntity();
        source.setClanId(clan.getId());
        source.setSourceName("张氏族谱卷一");
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
        binding.setTargetId(item.getId());
        binding.setConfidenceLevel("high");
        binding.setBindingStatus("official");
        binding.setCreatedAt(LocalDateTime.now());
        binding.setUpdatedAt(LocalDateTime.now());
        sourceBindingRepository.saveAndFlush(binding);

        SourceAttachmentEntity attachment = new SourceAttachmentEntity();
        attachment.setClanId(clan.getId());
        attachment.setSourceId(source.getId());
        attachment.setOriginalFilename("page-12.jpg");
        attachment.setStoredFilename("stored-page-12.jpg");
        attachment.setContentType("image/jpeg");
        attachment.setFileSize(128L);
        attachment.setStoragePath("test/page-12.jpg");
        attachment.setChecksum("test-checksum");
        attachment.setUploadStatus("completed");
        attachment.setPrivacyLevel("clan_only");
        attachment.setSensitiveLevel("normal");
        attachment.setCreatedAt(LocalDateTime.now());
        sourceAttachmentRepository.saveAndFlush(attachment);

        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clan.getId());
        revision.setTargetType("culture_item");
        revision.setTargetId(item.getId());
        revision.setChangeType("create");
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus("pending");
        revisionRepository.saveAndFlush(revision);

        assertCount(sourceBindingRepository.countActiveByTargets(
                clan.getId(), "culture_item", List.of(item.getId()), "archived"), item.getId(), 1L);
        assertCount(sourceAttachmentRepository.countActiveByTargets(
                clan.getId(), "culture_item", List.of(item.getId()), "archived"), item.getId(), 1L);
        assertCount(revisionRepository.countByTargets(
                clan.getId(), "culture_item", List.of(item.getId())), item.getId(), 1L);

        assertEquals(1, cultureItemRepository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("clanId"), clan.getId()),
                cb.isNull(root.get("deletedAt")),
                cb.like(cb.lower(root.get("title")), "%敦本%")
        )).size());
    }

    private void assertCount(List<TargetCountProjection> values, Long targetId, long expected) {
        assertEquals(1, values.size());
        assertEquals(targetId, values.get(0).getTargetId());
        assertEquals(expected, values.get(0).getCount());
    }
}
