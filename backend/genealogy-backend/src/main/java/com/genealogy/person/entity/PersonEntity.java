package com.genealogy.person.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "person")
public class PersonEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    private Long branchId;
    private String personCode;

    @Column(nullable = false)
    private String name;

    private String genealogyName;
    private String courtesyName;
    private String aliasName;
    private String gender;
    private Integer generationNo;
    private String generationWord;
    private String rankInFamily;
    private LocalDate birthDate;
    private String birthDatePrecision;
    private LocalDate deathDate;
    private String deathDatePrecision;
    private Boolean isLiving;
    private String birthPlace;
    private String residencePlace;
    private String occupation;
    private String education;
    private String titleOrHonor;

    @Column(columnDefinition = "text")
    private String biography;

    private String tombPlace;

    @Column(columnDefinition = "text")
    private String epitaph;

    private Boolean hasDescendant;
    private String lineageStatus;
    private String privacyLevel;
    private String dataStatus;
    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}
