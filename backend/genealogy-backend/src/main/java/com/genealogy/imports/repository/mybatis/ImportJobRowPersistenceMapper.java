package com.genealogy.imports.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.imports.entity.ImportJobRowEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.Collection;
import java.util.List;
import com.genealogy.imports.repository.query.ImportJobRowCount;

@Mapper
public interface ImportJobRowPersistenceMapper extends BaseMapper<ImportJobRowEntity> {
    List<ImportJobRowEntity> page(@Param("jobId") Long jobId, @Param("statuses") Collection<String> statuses, @Param("publishedNull") boolean publishedNull, @Param("offset") long offset, @Param("limit") int limit);
    long count(@Param("jobId") Long jobId, @Param("statuses") Collection<String> statuses, @Param("publishedNull") boolean publishedNull);
    List<ImportJobRowEntity> findByJobAndStatuses(@Param("jobId") Long jobId, @Param("statuses") Collection<String> statuses);
    List<ImportJobRowEntity> findByRowNos(@Param("jobId") Long jobId, @Param("rowNos") Collection<Integer> rowNos);
    ImportJobRowEntity findByIdAndJobId(@Param("id") Long id, @Param("jobId") Long jobId);
    ImportJobRowEntity findByJobIdAndRowNo(@Param("jobId") Long jobId, @Param("rowNo") Integer rowNo);
    ImportJobRowEntity findByJobIdAndRowNoForUpdate(@Param("jobId") Long jobId, @Param("rowNo") Integer rowNo);
    List<ImportJobRowCount> countByJobIdsAndStatus(@Param("jobIds") Collection<Long> jobIds, @Param("rowStatus") String rowStatus);
    int updateWithVersion(ImportJobRowEntity entity);
}
