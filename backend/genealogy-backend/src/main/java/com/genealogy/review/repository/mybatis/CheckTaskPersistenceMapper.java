package com.genealogy.review.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.review.entity.CheckTaskEntity;
import org.apache.ibatis.annotations.Mapper; import org.apache.ibatis.annotations.Param;
@Mapper public interface CheckTaskPersistenceMapper extends BaseMapper<CheckTaskEntity> { int updateAllById(CheckTaskEntity entity); CheckTaskEntity selectByIdForUpdate(@Param("taskId") Long taskId); }
