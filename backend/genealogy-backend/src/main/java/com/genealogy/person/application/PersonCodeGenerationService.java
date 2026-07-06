package com.genealogy.person.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;

@Service
public class PersonCodeGenerationService {

    private final ClanRepository clanRepository;
    private final BranchRepository branchRepository;
    private final PersonRepository personRepository;
    private final PersonCodeRuleProperties properties;

    public PersonCodeGenerationService(
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            PersonRepository personRepository,
            PersonCodeRuleProperties properties
    ) {
        this.clanRepository = clanRepository;
        this.branchRepository = branchRepository;
        this.personRepository = personRepository;
        this.properties = properties;
    }

    public String generate(Long clanId, PersonEntity person) {
        ClanEntity clan = clanRepository.findById(clanId).orElseThrow(() -> new BusinessException(ErrorCode.CLAN_NOT_FOUND));
        BranchEntity branch = branchRepository.findByIdAndClanId(person.getBranchId(), clanId)
                .orElseThrow(() -> new BusinessException("BRANCH_CLAN_MISMATCH", "支派不存在或不属于当前宗族"));
        long baseSeq = person.getId() == null ? 1 : person.getId();
        for (int offset = 0; offset < 1000; offset++) {
            String candidate = render(clan, branch, person, baseSeq + offset);
            if (!personRepository.existsByClanIdAndPersonCodeAndDeletedAtIsNull(clanId, candidate)) {
                return candidate;
            }
        }
        throw new BusinessException("PERSON_CODE_GENERATE_FAILED", "人物谱号生成失败，请稍后重试");
    }

    private String render(ClanEntity clan, BranchEntity branch, PersonEntity person, long sequence) {
        return safePattern()
                .replace("{clanCode}", clanCode(clan))
                .replace("{branchCode}", branchCode(branch))
                .replace("{generationNo}", generationNo(person))
                .replace("{rank}", rank(person))
                .replace("{seq}", leftPad(sequence, properties.getSequenceWidth()));
    }

    private String safePattern() {
        if (properties.getPattern() == null || properties.getPattern().isBlank()) {
            return "{clanCode}-{branchCode}-G{generationNo}-R{rank}-{seq}";
        }
        return properties.getPattern().trim();
    }

    private String clanCode(ClanEntity clan) {
        if (hasText(clan.getClanCode())) {
            return normalizeSegment(clan.getClanCode());
        }
        if (hasText(clan.getSurname())) {
            return normalizeSegment(clan.getSurname());
        }
        return "CLAN" + leftPad(clan.getId(), 3);
    }

    private String branchCode(BranchEntity branch) {
        String fromName = normalizeSegment(branch.getBranchName());
        if (hasText(fromName)) {
            return "B" + leftPad(branch.getId(), properties.getBranchWidth()) + "-" + fromName;
        }
        return "B" + leftPad(branch.getId(), properties.getBranchWidth());
    }

    private String generationNo(PersonEntity person) {
        if (person.getGenerationNo() == null) {
            return properties.getUnknownGeneration();
        }
        return leftPad(person.getGenerationNo(), properties.getGenerationWidth());
    }

    private String rank(PersonEntity person) {
        if (!hasText(person.getRankInFamily())) {
            return properties.getUnknownRank();
        }
        return normalizeSegment(person.getRankInFamily());
    }

    private String normalizeSegment(String value) {
        if (!hasText(value)) {
            return null;
        }
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFKC)
                .replaceAll("\\s+", "")
                .replaceAll("[^\\p{IsHan}A-Za-z0-9_-]", "")
                .toUpperCase(Locale.ROOT);
        return normalized.isBlank() ? null : normalized;
    }

    private String leftPad(long value, int width) {
        int safeWidth = Math.max(1, width);
        return String.format("%0" + safeWidth + "d", value);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
