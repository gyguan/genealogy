package com.genealogy.review.repository;

import com.genealogy.person.entity.PersonEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Provides the database lock used to serialize review submission for one person.
 */
public interface PersonReviewSubmissionLockRepository extends JpaRepository<PersonEntity, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select person from PersonEntity person where person.id = :personId and person.deletedAt is null")
    Optional<PersonEntity> findByIdForReviewSubmission(@Param("personId") Long personId);
}
