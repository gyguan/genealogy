package com.genealogy.culture.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "culture_revision_payload")
public class CultureRevisionPayloadEntity {

    @Id
    private Long revisionId;

    @Column(nullable = false, columnDefinition = "text")
    private String payloadJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
