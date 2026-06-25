package com.genealogy.generation.entity;

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
@Table(name = "generation_scheme")
public class GenerationSchemeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clanId;
    private Long branchId;
    private String schemeName;
    private String poemText;
    private Integer startGeneration;
    private Boolean isDefault;
    private Boolean validationEnabled;
    private Boolean strictMode;
    private String status;
    private LocalDateTime createdAt;
}
