package com.genealogy.source.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper; import com.genealogy.common.persistence.TargetCountRow; import com.genealogy.source.entity.SourceBindingEntity;
import org.apache.ibatis.annotations.Mapper; import org.apache.ibatis.annotations.Param; import java.util.Collection; import java.util.List;
@Mapper public interface SourceBindingPersistenceMapper extends BaseMapper<SourceBindingEntity>{ int updateAllById(SourceBindingEntity entity);
 List<TargetCountRow> countActiveByTargets(@Param("clanId") Long clanId,@Param("targetType") String targetType,@Param("targetIds") Collection<Long> targetIds,@Param("excludedStatus") String excludedStatus);
 List<SourceBindingEntity> findTreeBindingsByTargets(@Param("clanId") Long clanId,@Param("targetTypes") Collection<String> targetTypes,@Param("targetIds") Collection<Long> targetIds); }
