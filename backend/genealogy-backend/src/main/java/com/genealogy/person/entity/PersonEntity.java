package com.genealogy.person.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@TableName("person")
public class PersonEntity {

    @TableId(type = IdType.AUTO)
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
    private String occupation;
    private String education;
    private String titleOrHonor;
    private String biography;
    private String tombPlace;
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
