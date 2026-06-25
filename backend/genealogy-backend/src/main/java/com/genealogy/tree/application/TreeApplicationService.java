package com.genealogy.tree.application;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;

@Service
public class TreeApplicationService {

    private static final int DEFAULT_DEPTH = 5;

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;

    public TreeApplicationService(PersonRepository personRepository, RelationshipRepository relationshipRepository) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
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

    private int normalizeDepth(Integer maxDepth) {
        if (maxDepth == null || maxDepth < 1) {
            return DEFAULT_DEPTH;
        }
        return Math.min(maxDepth, 20);
    }

    private record PersonDepth(Long personId, int depth) {
    }
}
