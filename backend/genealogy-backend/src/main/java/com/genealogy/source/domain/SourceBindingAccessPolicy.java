package com.genealogy.source.domain;

import com.genealogy.auth.dto.ActorContext;
import com.genealogy.common.exception.BusinessException;

public final class SourceBindingAccessPolicy {

    public static final String VIEW_PERMISSION = "source:view";
    public static final String MANAGE_PERMISSION = "source:bind";

    public void requireView(ActorContext actor, Long bindingClanId) {
        requireSameClan(actor, bindingClanId);
        if (!actor.hasPermission(VIEW_PERMISSION)) {
            throw forbidden();
        }
    }

    public void requireManage(ActorContext actor, Long bindingClanId) {
        requireSameClan(actor, bindingClanId);
        if (!actor.hasPermission(MANAGE_PERMISSION)) {
            throw forbidden();
        }
    }

    private void requireSameClan(ActorContext actor, Long bindingClanId) {
        if (actor == null || actor.userId() == null) {
            throw new BusinessException("AUTH_UNAUTHORIZED", "请先登录");
        }
        if (!actor.crossClanAdmin() && !actor.clanId().equals(bindingClanId)) {
            throw forbidden();
        }
    }

    private BusinessException forbidden() {
        return new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该操作");
    }
}
