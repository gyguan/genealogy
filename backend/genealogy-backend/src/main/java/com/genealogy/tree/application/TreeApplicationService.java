package com.genealogy.tree.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeNodeResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TreeApplicationService {

    private static final int DEFAULT_DEPTH = 5;
    private static final String LINEAGE_RELATION_TYPE = "parent_child";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final BranchRepository branchRepository;

    public TreeApplicationService(PersonRepository personRepository, RelationshipRepository relationshipRepository, BranchRepository branchRepository) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.branchRepository = branchRepository;
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse family(Long personId) {
        PersonEntity center = getPerson(personId);
        Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
        List<TreeEdgeResponse> edges = new ArrayList<>();
        addNode(nodes, center);
        appendRelationships(personId, nodes, edges, true);
        appendRelationships(personId, nodes, edges, false);
        return new TreeGraphResponse(personId, new ArrayList<>(nodes.values()), edges);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse descendants(Long rootPersonId, Integer maxDepth) {
        int depthLimit = normalizeDepth(maxDepth);
        PersonEntity root = getPerson(rootPersonId);
        Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
        List<TreeEdgeResponse> edges = new ArrayList<>();
        addNode(nodes, root);
        Queue<PersonDepth> queue = new ArrayDeque<>();
        queue.add(new PersonDepth(rootPersonId, 0));
        while (!queue.isEmpty()) {
            PersonDepth current = queue.poll();
            if (current.depth() >= depthLimit) {
                continue;
            }
            List<RelationshipEntity> outgoing = relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(current.personId());
            for (RelationshipEntity relationship : outgoing) {
                if (!isLineageRelationship(relationship)) {
                    continue;
                }
                PersonEntity child = personRepository.findByIdAndDeletedAtIsNull(relationship.getToPersonId()).orElse(null);
                if (child == null) {
                    continue;
                }
                addNode(nodes, child);
                edges.add(toEdge(relationship));
                queue.add(new PersonDepth(child.getId(), current.depth() + 1));
            }
        }
        return new TreeGraphResponse(rootPersonId, new ArrayList<>(nodes.values()), edges);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse ancestors(Long personId, Integer maxDepth) {
        int depthLimit = normalizeDepth(maxDepth);
        PersonEntity root = getPerson(personId);
        Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
        List<TreeEdgeResponse> edges = new ArrayList<>();
        addNode(nodes, root);
        Queue<PersonDepth> queue = new ArrayDeque<>();
        queue.add(new PersonDepth(personId, 0));
        while (!queue.isEmpty()) {
            PersonDepth current = queue.poll();
            if (current.depth() >= depthLimit) {
                continue;
            }
            List<RelationshipEntity> incoming = relationshipRepository.findByToPersonIdAndDeletedAtIsNull(current.personId());
            for (RelationshipEntity relationship : incoming) {
                if (!isLineageRelationship(relationship)) {
                    continue;
                }
                PersonEntity parent = personRepository.findByIdAndDeletedAtIsNull(relationship.getFromPersonId()).orElse(null);
                if (parent == null) {
                    continue;
                }
                addNode(nodes, parent);
                edges.add(toEdge(relationship));
                queue.add(new PersonDepth(parent.getId(), current.depth() + 1));
            }
        }
        return new TreeGraphResponse(personId, new ArrayList<>(nodes.values()), edges);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse branchLineage(Long clanId, Long branchId) {
        BranchEntity rootBranch = branchRepository.findByIdAndClanId(branchId, clanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        Set<Long> branchScopeIds = findBranchScopeIds(clanId, rootBranch);
        List<PersonEntity> persons = personRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(person -> person.getBranchId() != null && branchScopeIds.contains(person.getBranchId()))
                .sorted(Comparator
                        .comparing((PersonEntity person) -> person.getGenerationNo() == null ? Integer.MAX_VALUE : person.getGenerationNo())
                        .thenComparing(person -> person.getPersonCode() == null ? "" : person.getPersonCode())
                        .thenComparing(PersonEntity::getId))
                .toList();
        Set<Long> personIds = persons.stream().map(PersonEntity::getId).collect(Collectors.toCollection(HashSet::new));
        Map<Long, TreeNodeResponse> nodes = new LinkedHashMap<>();
        persons.forEach(person -> addNode(nodes, person));
        List<TreeEdgeResponse> edges = relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId).stream()
                .filter(this::isLineageRelationship)
                .filter(relationship -> personIds.contains(relationship.getFromPersonId()) && personIds.contains(relationship.getToPersonId()))
                .sorted(Comparator
                        .comparing((RelationshipEntity relationship) -> nodeSortKey(nodes.get(relationship.getFromPersonId())))
                        .thenComparing(relationship -> nodeSortKey(nodes.get(relationship.getToPersonId())))
                        .thenComparing(RelationshipEntity::getId))
                .map(this::toEdge)
                .toList();
        Long rootPersonId = rootPersonId(rootBranch, persons, edges);
        return new TreeGraphResponse(rootPersonId, new ArrayList<>(nodes.values()), edges);
    }

    private Set<Long> findBranchScopeIds(Long clanId, BranchEntity rootBranch) {
        String rootPath = rootBranch.getBranchPath();
        return branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream()
                .filter(branch -> branch.getId().equals(rootBranch.getId()) || isDescendant(rootPath, branch.getBranchPath()))
                .map(BranchEntity::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private boolean isDescendant(String rootPath, String candidatePath) {
        return rootPath != null && !rootPath.isBlank()
                && candidatePath != null && !candidatePath.isBlank()
                && (candidatePath.equals(rootPath) || candidatePath.startsWith(rootPath + "/"));
    }

    private Long rootPersonId(BranchEntity rootBranch, List<PersonEntity> persons, List<TreeEdgeResponse> edges) {
        if (rootBranch.getFounderPersonId() != null && persons.stream().anyMatch(person -> person.getId().equals(rootBranch.getFounderPersonId()))) {
            return rootBranch.getFounderPersonId();
        }
        Set<Long> childIds = edges.stream().map(TreeEdgeResponse::toPersonId).collect(Collectors.toCollection(HashSet::new));
        return persons.stream()
                .filter(person -> !childIds.contains(person.getId()))
                .findFirst()
                .or(() -> persons.stream().findFirst())
                .map(PersonEntity::getId)
                .orElse(null);
    }

    private String nodeSortKey(TreeNodeResponse node) {
        if (node == null) {
            return "9999-9999999999";
        }
        int generation = node.generationNo() == null ? 9999 : node.generationNo();
        return String.format("%04d-%010d", generation, node.personId());
    }

    private void appendRelationships(Long personId, Map<Long, TreeNodeResponse> nodes, List<TreeEdgeResponse> edges, boolean outgoing) {
        List<RelationshipEntity> relationships = outgoing
                ? relationshipRepository.findByFromPersonIdAndDeletedAtIsNull(personId)
                : relationshipRepository.findByToPersonIdAndDeletedAtIsNull(personId);
        for (RelationshipEntity relationship : relationships) {
            Long relatedPersonId = outgoing ? relationship.getToPersonId() : relationship.getFromPersonId();
            personRepository.findByIdAndDeletedAtIsNull(relatedPersonId).ifPresent(person -> addNode(nodes, person));
            edges.add(toEdge(relationship));
        }
    }

    private PersonEntity getPerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private void addNode(Map<Long, TreeNodeResponse> nodes, PersonEntity person) {
        nodes.putIfAbsent(person.getId(), new TreeNodeResponse(
                person.getId(),
                person.getName(),
                person.getGender(),
                person.getGenerationNo(),
                person.getGenerationWord(),
                person.getBranchId()
        ));
    }

    private TreeEdgeResponse toEdge(RelationshipEntity relationship) {
        return new TreeEdgeResponse(
                relationship.getId(),
                relationship.getFromPersonId(),
                relationship.getToPersonId(),
                relationship.getRelationType(),
                relationship.getRelationLabel()
        );
    }

    private boolean isLineageRelationship(RelationshipEntity relationship) {
        return LINEAGE_RELATION_TYPE.equals(relationship.getRelationType())
                || Boolean.TRUE.equals(relationship.getIsLineageRelation());
    }

    private int normalizeDepth(Integer maxDepth) {
        if (maxDepth == null || maxDepth < 1) {
            return DEFAULT_DEPTH;
        }
        return Math.min(maxDepth, 20);
    }

    private record PersonDepth(Long personId, int depth) {
    }
}
