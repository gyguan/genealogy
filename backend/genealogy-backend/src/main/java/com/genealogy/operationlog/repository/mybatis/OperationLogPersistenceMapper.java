package com.genealogy.operationlog.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.query.OperationLogGroupCountRow;
import com.genealogy.operationlog.repository.query.OperationLogQueryCriteria;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OperationLogPersistenceMapper extends BaseMapper<OperationLogEntity> {
    int updateAllById(@Param("entity") OperationLogEntity entity);

    List<OperationLogEntity> search(
            @Param("criteria") OperationLogQueryCriteria criteria,
            @Param("offset") long offset,
            @Param("limit") int limit
    );

    long count(@Param("criteria") OperationLogQueryCriteria criteria);

    List<OperationLogGroupCountRow> groupByRiskLevel(
            @Param("criteria") OperationLogQueryCriteria criteria
    );

    List<OperationLogGroupCountRow> groupByRiskEventType(
            @Param("criteria") OperationLogQueryCriteria criteria
    );

    List<OperationLogGroupCountRow> groupByDispositionStatus(
            @Param("criteria") OperationLogQueryCriteria criteria
    );
}
