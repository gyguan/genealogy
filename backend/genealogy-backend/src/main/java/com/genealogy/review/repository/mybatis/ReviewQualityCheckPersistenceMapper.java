package com.genealogy.review.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface ReviewQualityCheckPersistenceMapper extends BaseMapper<ReviewQualityCheckEntity> { int updateAllById(ReviewQualityCheckEntity entity); }
