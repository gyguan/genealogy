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
@Table(name = "source")
public class SourceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long clanId;

    @Column(nullable = false)
    private String sourceName;

    @Column(nullable = false)
    private String sourceType;

    private String providerName;
    private String bookTitle;
    private String volumeNo;
    private String pageNo;

    @Column(columnDefinition = "text")
    private String excerpt;

    private String verificationStatus;

    @Column(columnDefinition = "text")
    private String description;

    private Long createdBy;
    private LocalDateTime createdAt;
}
