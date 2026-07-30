package com.genealogy.tree.repository.jpa;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tree-only JPA read mapping retained during the staged persistence migration.
 * Person write/search code no longer depends on this type.
 */
@Getter
@Setter
@Entity(name = "TreePersonJpaEntity")
@Table(name = "person")
@Immutable
public class TreePersonJpaEntity {

    @Id
    private Long id;
    private Long clanId;
    private Long branchId;
    private String personCode;
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
    private Boolean hasDescendant;
    private String lineageStatus;
    private String privacyLevel;
    private String dataStatus;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime deletedAt;
}
