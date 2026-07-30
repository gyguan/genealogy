package com.genealogy.review.repository;

import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.mybatis.PersonPersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Provides the PostgreSQL row lock used to serialize review submission for one person. */
@Repository
@Transactional(readOnly = true)
public class PersonReviewSubmissionLockRepository {

    private final PersonPersistenceMapper mapper;

    public PersonReviewSubmissionLockRepository(PersonPersistenceMapper mapper) {
        this.mapper = mapper;
    }

    @Transactional
    public Optional<PersonEntity> findByIdForReviewSubmission(Long personId) {
        return Optional.ofNullable(mapper.selectActiveByIdForUpdate(personId));
    }
}
