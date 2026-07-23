package com.genealogy.generation.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@JsonIgnoreProperties(ignoreUnknown = true)
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

    @JsonProperty(value = "scheme", access = JsonProperty.Access.WRITE_ONLY)
    public void applyWrappedReviewSnapshot(GenerationSchemeEntity scheme) {
        if (scheme == null) {
            return;
        }
        this.id = scheme.id;
        this.clanId = scheme.clanId;
        this.branchId = scheme.branchId;
        this.schemeName = scheme.schemeName;
        this.poemText = scheme.poemText;
        this.startGeneration = scheme.startGeneration;
        this.isDefault = scheme.isDefault;
        this.validationEnabled = scheme.validationEnabled;
        this.strictMode = scheme.strictMode;
        this.status = scheme.status;
        this.createdAt = scheme.createdAt;
    }
}
