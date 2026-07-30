package com.genealogy.generation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@TableName("generation_word")
public class GenerationWordEntity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long schemeId;
    private Integer generationNo;
    private String word;
    private String description;
    private Integer sortOrder;
}
