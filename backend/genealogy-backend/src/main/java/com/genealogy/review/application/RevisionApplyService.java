package com.genealogy.review.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class RevisionApplyService {

    private static final String TARGET_PERSON = "person";
    private static final String TARGET_RELATIONSHIP = "relationship";
    private static final String TARGET_SOURCE = "source";
    private static final String TARGET_BRANCH = "branch";
    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_VERIFIED = "verified";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final BranchRepository branchRepository;
    private final GenSchemeRepository genSchemeRepository;

    public RevisionApplyService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
    }

    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        String targetType = normalize(revision.getTargetType());
        if (TARGET_PERSON.equals(targetType)) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                    .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "人物不存在或已删除"));
            person.setDataStatus(STATUS_OFFICIAL);
            person.setUpdatedAt(applyTime);
            personRepository.save(person);
            return;
        }
        if (TARGET_RELATIONSHIP.equals(targetType)) {
            relationshipRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setDataStatus(STATUS_OFFICIAL);
                entity.setUpdatedAt(applyTime);
                relationshipRepository.save(entity);
            });
            return;
        }
        if (TARGET_SOURCE.equals(targetType)) {
            sourceRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setVerificationStatus(STATUS_VERIFIED);
                sourceRepository.save(entity);
            });
            return;
        }
        if (TARGET_BRANCH.equals(targetType)) {
            branchRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus("active");
                entity.setUpdatedAt(applyTime);
                branchRepository.save(entity);
            });
            return;
        }
        if (TARGET_GENERATION_SCHEME.equals(targetType)) {
            genSchemeRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus("active");
                genSchemeRepository.save(entity);
            });
            return;
        }
        throw new BusinessException("REVISION_TARGET_UNSUPPORTED", "暂不支持该对象类型的审核生效");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
