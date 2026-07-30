package com.genealogy.source.repository.mybatis;
import com.genealogy.source.entity.SourceEntity; import com.genealogy.source.repository.query.SourceSearchCriteriaRow; import com.genealogy.source.repository.query.SourceTypeCountRow;
import org.apache.ibatis.annotations.Mapper; import org.apache.ibatis.annotations.Param; import java.util.Collection; import java.util.List;
@Mapper public interface SourceQueryMapper {
 List<SourceEntity> search(@Param("criteria") SourceSearchCriteriaRow criteria,@Param("offset") long offset,@Param("limit") int limit); long count(@Param("criteria") SourceSearchCriteriaRow criteria);
 List<SourceTypeCountRow> countDashboardBySourceType(@Param("clanId") Long clanId); List<SourceEntity> findRecentDashboardSources(@Param("clanId") Long clanId,@Param("limit") int limit);
 List<SourceEntity> findTreeSourcesByIds(@Param("clanId") Long clanId,@Param("sourceIds") Collection<Long> sourceIds); int countAttachmentsBySourceId(@Param("sourceId") Long sourceId);
}
