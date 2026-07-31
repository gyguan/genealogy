package com.genealogy.review.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.review.entity.ReviewTaskEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface ReviewTaskPersistenceMapper extends BaseMapper<ReviewTaskEntity> { int updateAllById(ReviewTaskEntity entity); }
