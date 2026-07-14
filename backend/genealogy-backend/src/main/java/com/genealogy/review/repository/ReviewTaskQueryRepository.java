package com.genealogy.review.repository;

import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ReviewTaskQueryRepository {

    private static final String VIEW_PENDING = "pending";
    private static final String VIEW_SUBMITTED = "submitted";
    private static final String VIEW_PROCESSED = "processed";
    private static final String SCOPE_MINE = "mine";

    @PersistenceContext
    private EntityManager entityManager;

    public QueryPage search(ReviewTaskQueryCriteria criteria, int pageNo, int pageSize) {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> queryDefinition = builder.createTupleQuery();
        Root<CheckTaskEntity> task = queryDefinition.from(CheckTaskEntity.class);
        Root<AuditRecordEntity> record = queryDefinition.from(AuditRecordEntity.class);
        List<Predicate> predicates = predicates(builder, task, record, criteria);
        queryDefinition.multiselect(task.alias("task"), record.alias("record"));
        queryDefinition.where(predicates.toArray(Predicate[]::new));
        if (VIEW_PROCESSED.equals(criteria.view())) {
            queryDefinition.orderBy(builder.desc(task.get("reviewedAt")), builder.desc(task.get("id")));
        } else {
            queryDefinition.orderBy(builder.desc(record.get("submitTime")), builder.desc(task.get("id")));
        }

        TypedQuery<Tuple> query = entityManager.createQuery(queryDefinition);
        query.setFirstResult(Math.max(0, pageNo - 1) * pageSize);
        query.setMaxResults(pageSize);
        List<ReviewTaskPair> rows = query.getResultList().stream()
                .map(tuple -> new ReviewTaskPair(
                        tuple.get("task", CheckTaskEntity.class),
                        tuple.get("record", AuditRecordEntity.class)
                ))
                .toList();

        CriteriaQuery<Long> countDefinition = builder.createQuery(Long.class);
        Root<CheckTaskEntity> countTask = countDefinition.from(CheckTaskEntity.class);
        Root<AuditRecordEntity> countRecord = countDefinition.from(AuditRecordEntity.class);
        countDefinition.select(builder.countDistinct(countTask.get("id")));
        countDefinition.where(predicates(builder, countTask, countRecord, criteria).toArray(Predicate[]::new));
        long total = entityManager.createQuery(countDefinition).getSingleResult();
        return new QueryPage(rows, total);
    }

    public Optional<ReviewTaskPair> findByTaskId(Long taskId) {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> queryDefinition = builder.createTupleQuery();
        Root<CheckTaskEntity> task = queryDefinition.from(CheckTaskEntity.class);
        Root<AuditRecordEntity> record = queryDefinition.from(AuditRecordEntity.class);
        queryDefinition.multiselect(task.alias("task"), record.alias("record"));
        queryDefinition.where(
                builder.equal(task.get("id"), taskId),
                builder.equal(task.get("revisionId"), record.get("id"))
        );
        return entityManager.createQuery(queryDefinition).getResultStream()
                .findFirst()
                .map(tuple -> new ReviewTaskPair(
                        tuple.get("task", CheckTaskEntity.class),
                        tuple.get("record", AuditRecordEntity.class)
                ));
    }

    public List<ReviewTaskPair> findHistory(Long clanId, String targetType, Long targetId, int limit) {
        CriteriaBuilder builder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> queryDefinition = builder.createTupleQuery();
        Root<CheckTaskEntity> task = queryDefinition.from(CheckTaskEntity.class);
        Root<AuditRecordEntity> record = queryDefinition.from(AuditRecordEntity.class);
        queryDefinition.multiselect(task.alias("task"), record.alias("record"));
        queryDefinition.where(
                builder.equal(task.get("revisionId"), record.get("id")),
                builder.equal(task.get("clanId"), clanId),
                builder.equal(record.get("clanId"), clanId),
                builder.equal(record.get("targetType"), targetType),
                builder.equal(record.get("targetId"), targetId)
        );
        queryDefinition.orderBy(builder.desc(record.get("submitTime")), builder.desc(task.get("id")));
        return entityManager.createQuery(queryDefinition)
                .setMaxResults(Math.max(1, limit))
                .getResultList()
                .stream()
                .map(tuple -> new ReviewTaskPair(
                        tuple.get("task", CheckTaskEntity.class),
                        tuple.get("record", AuditRecordEntity.class)
                ))
                .toList();
    }

    private List<Predicate> predicates(
            CriteriaBuilder builder,
            Root<CheckTaskEntity> task,
            Root<AuditRecordEntity> record,
            ReviewTaskQueryCriteria criteria
    ) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(builder.equal(task.get("revisionId"), record.get("id")));
        predicates.add(builder.equal(task.get("clanId"), criteria.clanId()));
        predicates.add(builder.equal(record.get("clanId"), criteria.clanId()));

        if (VIEW_PENDING.equals(criteria.view())) {
            predicates.add(builder.equal(task.get("status"), VIEW_PENDING));
            predicates.add(builder.notEqual(record.get("submitterId"), criteria.actorId()));
        } else if (VIEW_SUBMITTED.equals(criteria.view()) && SCOPE_MINE.equals(criteria.scope())) {
            predicates.add(builder.equal(record.get("submitterId"), criteria.actorId()));
        } else if (VIEW_PROCESSED.equals(criteria.view())) {
            predicates.add(builder.isNotNull(task.get("reviewedAt")));
            predicates.add(builder.notEqual(task.get("status"), VIEW_PENDING));
            if (SCOPE_MINE.equals(criteria.scope())) {
                predicates.add(builder.equal(task.get("reviewerId"), criteria.actorId()));
            }
        }

        if (criteria.targetType() != null) {
            predicates.add(builder.equal(record.get("targetType"), criteria.targetType()));
        }
        if (criteria.targetId() != null) {
            predicates.add(builder.equal(record.get("targetId"), criteria.targetId()));
        }
        if (criteria.status() != null) {
            predicates.add(builder.equal(task.get("status"), criteria.status()));
        }
        if (criteria.branchId() != null) {
            predicates.add(builder.equal(task.get("branchId"), criteria.branchId()));
        }
        if (criteria.submittedFrom() != null) {
            predicates.add(builder.greaterThanOrEqualTo(record.get("submitTime"), criteria.submittedFrom()));
        }
        if (criteria.submittedTo() != null) {
            predicates.add(builder.lessThanOrEqualTo(record.get("submitTime"), criteria.submittedTo()));
        }
        if (criteria.processedFrom() != null) {
            predicates.add(builder.greaterThanOrEqualTo(task.get("reviewedAt"), criteria.processedFrom()));
        }
        if (criteria.processedTo() != null) {
            predicates.add(builder.lessThanOrEqualTo(task.get("reviewedAt"), criteria.processedTo()));
        }
        if (criteria.enforceBranchScope() && !criteria.fullClanAccess()) {
            if (criteria.visibleBranchIds().isEmpty()) {
                predicates.add(builder.disjunction());
            } else {
                predicates.add(task.get("branchId").in(criteria.visibleBranchIds()));
            }
        }
        return predicates;
    }

    public record ReviewTaskPair(CheckTaskEntity task, AuditRecordEntity record) {
    }

    public record QueryPage(List<ReviewTaskPair> records, long total) {
        public QueryPage {
            records = records == null ? List.of() : List.copyOf(records);
        }
    }
}
