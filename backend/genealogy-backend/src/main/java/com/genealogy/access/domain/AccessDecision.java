package com.genealogy.access.domain;

import com.genealogy.common.exception.BusinessException;

/**
 * Complete access result: permission, stable reason, query scope and disclosure.
 */
public record AccessDecision(
        boolean allowed,
        String reasonCode,
        DataScope dataScope,
        PrivacyDisclosure disclosure
) {
    public AccessDecision {
        dataScope = dataScope == null ? DataScope.none() : dataScope;
        disclosure = disclosure == null ? PrivacyDisclosure.NONE : disclosure;
    }

    public static AccessDecision allow(DataScope scope, PrivacyDisclosure disclosure) {
        return new AccessDecision(true, "ACCESS_ALLOWED", scope, disclosure);
    }

    public static AccessDecision deny(String reasonCode) {
        return new AccessDecision(false, reasonCode, DataScope.none(), PrivacyDisclosure.NONE);
    }

    public AccessDecision requireAllowed() {
        if (!allowed) {
            throw new BusinessException(reasonCode, "当前访问请求不在授权范围内");
        }
        return this;
    }
}
