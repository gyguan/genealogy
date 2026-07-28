package com.genealogy.workbench.entity;

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
@Table(name = "workbench_task_action")
public class WorkbenchTaskActionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clan_id", nullable = false)
    private Long clanId;

    @Column(name = "task_key", nullable = false, length = 255)
    private String taskKey;

    @Column(name = "action_type", nullable = false, length = 32)
    private String actionType;

    @Column(name = "comment_text", length = 500)
    private String comment;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "expected_updated_at")
    private LocalDateTime expectedUpdatedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
