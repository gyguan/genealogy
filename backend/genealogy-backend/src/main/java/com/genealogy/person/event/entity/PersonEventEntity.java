package com.genealogy.person.event.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@TableName("person_event")
public class PersonEventEntity {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private Long personId;
    private String eventType;
    private String eventTitle;
    private LocalDate eventDate;
    private String eventDatePrecision;
    private String eventPlace;
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
