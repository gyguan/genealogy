package com.genealogy.person.event.entity;

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
@Table(name = "person_event")
public class PersonEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long clanId;
    private Long personId;
    private String eventType;
    private String eventTitle;
    private LocalDate eventDate;
    private String eventDatePrecision;
    private String eventPlace;

    @Column(columnDefinition = "text")
    private String eventDescription;

    private String sourceType;
    private Long sourceId;
    private Integer sortOrder;
    private String dataStatus;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}
