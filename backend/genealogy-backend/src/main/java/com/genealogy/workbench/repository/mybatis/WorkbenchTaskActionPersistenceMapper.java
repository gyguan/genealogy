package com.genealogy.workbench.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.workbench.entity.WorkbenchTaskActionEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface WorkbenchTaskActionPersistenceMapper extends BaseMapper<WorkbenchTaskActionEntity> {
}
