package com.genealogy.clan.entity;

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
@Table(name = "clan")
public class ClanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String clanCode;

    @Column(nullable = false)
    private String clanName;

    @Column(nullable = false)
    private String surname;

    private String hallName;
    private String commandery;
    private Long ancestorPersonId;
    private String originPlace;

    @Column(columnDefinition = "text")
    private String description;

    private String status;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
