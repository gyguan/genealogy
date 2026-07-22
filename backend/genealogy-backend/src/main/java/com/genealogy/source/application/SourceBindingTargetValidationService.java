package com.genealogy.source.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.domain.ApprovedStatusPolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class SourceBindingTargetValidationService {

    private final GenerationWordRepository generationWordRepository;
    private final GenerationSchemeRepository generationSchemeRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final BranchRepository branchRepository;
    private final ClanRepository clanRepository;

    public SourceBindingTargetValidationService(
  GenerationWordRepository generationWordRepository,
  GenerationSchemeRepository generationSchemeRepository,
  PersonRepository personRepository,
  RelationshipRepository relationshipRepository,
  BranchRepository branchRepository,
  ClanRepository clanRepository
    ) {
        this.generationWordRepository = generationWordRepository;
        this.generationSchemeRepository = generationSchemeRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.branchRepository = branchRepository;
        this.clanRepository = clanRepository;
    }

    @Transactional(readOnly = true)
    public void validate(Long clanId, String targetType, Long targetId) {
        if (clanId == null || targetType == null || targetId == null) {
  throw new BusinessException("SOURCE_TARGET_INVALID", "来源绑定对象参数不完整");
        }
        switch (targetType.trim().toLowerCase(Locale.ROOT)) {
  case "person" -> validatePerson(clanId, targetId);
  case "relationship" -> validateRelationship(clanId, targetId);
  case "branch" -> validateBranch(clanId, targetId);
  case "clan" -> validateClan(clanId, targetId);
  case "generation_word" -> validateGenerationWord(clanId, targetId);
  default -> throw new BusinessException("SOURCE_TARGET_TYPE_INVALID", "来源绑定对象类型不合法");
        }
    }

    private void validatePerson(Long clanId, Long personId) {
        PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(personId)
      .filter(item -> clanId.equals(item.getClanId()))
      .orElseThrow(() -> new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "人物不存在或不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(person.getDataStatus(), "PERSON_NOT_OFFICIAL", "人物审核通过后才能绑定来源资料");
    }

    private void validateRelationship(Long clanId, Long relationshipId) {
        RelationshipEntity relationship = relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(relationshipId, clanId)
      .orElseThrow(() -> new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "关系不存在或不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(relationship.getDataStatus(), "RELATIONSHIP_NOT_OFFICIAL", "关系审核通过后才能绑定来源资料");
    }

    private void validateBranch(Long clanId, Long branchId) {
        BranchEntity branch = branchRepository.findByIdAndClanId(branchId, clanId)
      .orElseThrow(() -> new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "支派不存在或不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(branch.getStatus(), "BRANCH_NOT_OFFICIAL", "支派审核通过后才能绑定来源资料");
    }

    private void validateClan(Long clanId, Long targetId) {
        if (!clanId.equals(targetId) || !clanRepository.existsById(targetId)) {
  throw new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "宗族绑定对象无效");
        }
    }

    private void validateGenerationWord(Long clanId, Long generationWordId) {
        GenerationWordEntity word = generationWordRepository.findById(generationWordId)
      .orElseThrow(() -> new BusinessException("GENERATION_WORD_NOT_FOUND", "字辈明细不存在"));
        GenerationSchemeEntity scheme = generationSchemeRepository.findByIdAndClanId(word.getSchemeId(), clanId)
      .orElseThrow(() -> new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "字辈不属于当前宗族"));
        ApprovedStatusPolicy.requireApproved(scheme.getStatus(), "GENERATION_SCHEME_NOT_OFFICIAL", "字辈方案审核通过后才能绑定来源资料");
    }
}
