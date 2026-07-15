package com.genealogy.culture.governance;

import java.util.Set;

public interface CultureTargetGovernanceAdapter {

    String targetType();

    String sensitiveViewPermission();

    String restrictedLogSummary();

    default Set<String> aliases() {
        return Set.of(targetType(), targetType() + "s");
    }

    CultureTargetContext requireExisting(Long targetId);

    CultureTargetContext require(Long targetId, Long actorId, CultureTargetAction action);
}
