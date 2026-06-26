package com.genealogy.source.entity;

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
@Table(name = "source_binding")
public class SourceBindingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clanId;
    private Long sourceId;
    private String targetType;
    private Long targetId;
    private String bindingReason;

    @Column(columnDefinition = "text")
    private String excerpt;

    private Long createdBy;
    private LocalDateTime createdAt;
}
