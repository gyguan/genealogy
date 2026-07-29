package com.genealogy.access.domain;

public record ActorContext(Long userId, Long clanId, boolean authenticated, boolean activeMember, boolean crossClanAdmin) {
    public static ActorContext anonymous(Long clanId) {
        return new ActorContext(null, clanId, false, false, false);
    }
}
