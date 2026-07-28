package com.genealogy.member.application;

import com.genealogy.member.dto.CreateMemberGrantRequest;
import com.genealogy.member.dto.UpdateMemberGrantRequest;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RevokedMemberGrantReactivationAspect {

    private static final String STATUS_ACTIVE = "active";

    private final ClanMembershipRepository clanMembershipRepository;
    private final RoleRepository roleRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final ObjectProvider<MemberPermissionApplicationService> serviceProvider;

    public RevokedMemberGrantReactivationAspect(
            ClanMembershipRepository clanMembershipRepository,
            RoleRepository roleRepository,
            MemberRoleRepository memberRoleRepository,
            ObjectProvider<MemberPermissionApplicationService> serviceProvider
    ) {
        this.clanMembershipRepository = clanMembershipRepository;
        this.roleRepository = roleRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.serviceProvider = serviceProvider;
    }

    @Around("execution(* com.genealogy.member.application.MemberPermissionApplicationService.createGrant(..))")
    public Object reactivateRevokedGrant(ProceedingJoinPoint joinPoint) throws Throwable {
        Object[] args = joinPoint.getArgs();
        if (args.length < 3
                || !(args[0] instanceof Long clanId)
                || !(args[1] instanceof Long actorId)
                || !(args[2] instanceof CreateMemberGrantRequest request)) {
            return joinPoint.proceed();
        }

        ClanMembershipEntity membership = clanMembershipRepository
                .findByClanIdAndUserId(clanId, request.userId())
                .orElse(null);
        RoleEntity role = roleRepository.findByRoleCode(request.roleCode()).orElse(null);
        MemberRoleScopeType scopeType;
        try {
            scopeType = MemberRoleScopeType.valueOf(request.scopeType());
        } catch (RuntimeException ignored) {
            return joinPoint.proceed();
        }
        if (membership == null || role == null) {
            return joinPoint.proceed();
        }

        MemberRoleEntity existing = memberRoleRepository
                .findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(
                        membership.getId(),
                        role.getId(),
                        scopeType,
                        request.scopeId()
                )
                .orElse(null);
        if (existing == null || STATUS_ACTIVE.equals(existing.getStatus())) {
            return joinPoint.proceed();
        }

        return serviceProvider.getObject().updateGrant(
                clanId,
                actorId,
                existing.getId(),
                new UpdateMemberGrantRequest(
                        request.roleCode(),
                        request.scopeType(),
                        request.scopeId(),
                        request.reason()
                )
        );
    }
}
