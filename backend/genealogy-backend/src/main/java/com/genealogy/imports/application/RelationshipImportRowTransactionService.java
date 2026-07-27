package com.genealogy.imports.application;

import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RelationshipImportRowTransactionService {

    private final ObjectProvider<RelationshipApplicationService> relationshipApplicationServiceProvider;

    public RelationshipImportRowTransactionService(
            ObjectProvider<RelationshipApplicationService> relationshipApplicationServiceProvider
    ) {
        this.relationshipApplicationServiceProvider = relationshipApplicationServiceProvider;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public RelationshipResponse create(
            Long clanId,
            RelationshipCreateRequest request,
            Long actorId
    ) {
        return relationshipApplicationServiceProvider.getObject().create(clanId, request, actorId);
    }
}
