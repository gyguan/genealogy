package com.genealogy.access.domain;

public record ResourceContext(
        Type type,
        Long resourceId,
        Long clanId,
        Long branchId,
        Long ownerUserId,
        boolean livingPerson,
        boolean containsContact,
        boolean containsAttachment
) {
    public enum Type {
        PERSON,
        TREE,
        SOURCE,
        MEMBER,
        ATTACHMENT,
        AUDIT
    }
}
