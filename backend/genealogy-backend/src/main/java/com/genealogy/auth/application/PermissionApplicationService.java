package com.genealogy.auth.application;

import com.genealogy.auth.entity.AppPermissionEntity;
import com.genealogy.auth.entity.AppRolePermissionEntity;
import com.genealogy.auth.repository.AppPermissionRepository;
import com.genealogy.auth.repository.AppRolePermissionRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PermissionApplicationService {

    public static final String STATUS_ACTIVE = "active";
    public static final String EFFECT_ALLOW = "allow";

    private final AppPermissionRepository appPermissionRepository;
    private final AppRolePermissionRepository appRolePermissionRepository;
    private final RoleRepository roleRepository;

    public PermissionApplicationService(
            AppPermissionRepository appPermissionRepository,
            AppRolePermissionRepository appRolePermissionRepository,
            RoleRepository roleRepository
    ) {
        this.appPermissionRepository = appPermissionRepository;
        this.appRolePermissionRepository = appRolePermissionRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<AppPermissionEntity> listActivePermissions() {
        return appPermissionRepository.findByStatus(STATUS_ACTIVE);
    }

    @Transactional(readOnly = true)
    public List<AppPermissionEntity> listActivePermissionsByModule(String moduleCode) {
        return appPermissionRepository.findByModuleCodeAndStatus(moduleCode, STATUS_ACTIVE);
    }

    @Transactional(readOnly = true)
    public AppPermissionEntity requireActivePermission(String permissionCode) {
        return appPermissionRepository.findByPermissionCodeAndStatus(normalizePermissionCode(permissionCode), STATUS_ACTIVE)
                .orElseThrow(() -> new BusinessException("PERMISSION_NOT_FOUND", "权限点不存在或已停用"));
    }

    @Transactional(readOnly = true)
    public Set<String> permissionsForRoleCode(String roleCode) {
        RoleEntity role = roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "角色不存在"));
        return permissionsForRoleId(role.getId());
    }

    @Transactional(readOnly = true)
    public Set<String> permissionsForRoleId(Long roleId) {
        List<Long> permissionIds = appRolePermissionRepository.findByRoleIdAndStatus(roleId, STATUS_ACTIVE).stream()
                .filter(item -> EFFECT_ALLOW.equals(item.getEffect()))
                .map(AppRolePermissionEntity::getPermissionId)
                .toList();
        return appPermissionRepository.findAllById(permissionIds).stream()
                .filter(permission -> STATUS_ACTIVE.equals(permission.getStatus()))
                .map(AppPermissionEntity::getPermissionCode)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Transactional(readOnly = true)
    public boolean roleHasPermission(Long roleId, String permissionCode) {
        return appPermissionRepository.findByPermissionCodeAndStatus(normalizePermissionCode(permissionCode), STATUS_ACTIVE)
                .map(permission -> appRolePermissionRepository.existsByRoleIdAndPermissionIdAndEffectAndStatus(
                        roleId,
                        permission.getId(),
                        EFFECT_ALLOW,
                        STATUS_ACTIVE
                ))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean roleCodeHasPermission(String roleCode, String permissionCode) {
        return roleRepository.findByRoleCode(roleCode)
                .map(role -> roleHasPermission(role.getId(), permissionCode))
                .orElse(false);
    }

    public String normalizePermissionCode(String permissionCode) {
        if (permissionCode == null) {
            return null;
        }
        return permissionCode.trim().replace(':', '.');
    }
}
