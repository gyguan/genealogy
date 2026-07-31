package com.genealogy.review.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.common.persistence.TargetCountRow;
import com.genealogy.review.entity.RevisionEntity;
import org.apache.ibatis.annotations.Mapper; import org.apache.ibatis.annotations.Param;
import java.util.Collection; import java.util.List;
@Mapper public interface RevisionPersistenceMapper extends BaseMapper<RevisionEntity> {
 int insertRecord(RevisionEntity entity); int updateAllById(RevisionEntity entity);
 List<TargetCountRow> countByTargets(@Param("clanId") Long clanId,@Param("targetType") String targetType,@Param("targetIds") Collection<Long> targetIds);
 List<RevisionEntity> findTreeRevisionsByTargets(@Param("clanId") Long clanId,@Param("targetTypes") Collection<String> targetTypes,@Param("targetIds") Collection<Long> targetIds);
}
