package com.genealogy.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "app_permission")
public class AppPermissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String permissionCode;

    @Column(nullable = false)
    private String permissionName;

    @Column(nullable = false)
    private String moduleCode;

    @Column(nullable = false)
    private String moduleName;

    @Column(nullable = false)
    private String resourceCode;

    @Column(nullable = false)
    private String actionCode;

    @Column(columnDefinition = "text")
    private String description;

    private Boolean systemPermission;
    private String status;

    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}
