package com.genealogy.workbench.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@TableName("workbench_task_action")
public class WorkbenchTaskActionEntity {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long clanId;
    private String taskKey;
    private String actionType;
    private String commentText;
    private Long actorId;
    private LocalDateTime expectedUpdatedAt;
    private LocalDateTime createdAt;

    public String getComment() {
        return commentText;
    }

    public void setComment(String comment) {
        this.commentText = comment;
    }
}
