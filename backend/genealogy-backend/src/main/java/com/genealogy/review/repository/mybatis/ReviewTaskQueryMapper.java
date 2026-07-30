package com.genealogy.review.repository.mybatis;
import com.genealogy.review.repository.ReviewTaskQueryCriteria;
import com.genealogy.review.repository.query.ReviewTaskQueryRow;
import org.apache.ibatis.annotations.Mapper; import org.apache.ibatis.annotations.Param;
import java.util.List;
@Mapper public interface ReviewTaskQueryMapper {
 List<ReviewTaskQueryRow> search(@Param("criteria") ReviewTaskQueryCriteria criteria,@Param("offset") long offset,@Param("limit") int limit);
 long count(@Param("criteria") ReviewTaskQueryCriteria criteria);
 ReviewTaskQueryRow findByTaskId(@Param("taskId") Long taskId);
 List<ReviewTaskQueryRow> findHistory(@Param("clanId") Long clanId,@Param("targetType") String targetType,@Param("targetId") Long targetId,@Param("limit") int limit);
}
