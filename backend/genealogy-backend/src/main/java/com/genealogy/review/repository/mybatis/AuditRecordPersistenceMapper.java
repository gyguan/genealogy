package com.genealogy.review.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.review.entity.AuditRecordEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface AuditRecordPersistenceMapper extends BaseMapper<AuditRecordEntity> { int insertRecord(AuditRecordEntity entity); int updateAllById(AuditRecordEntity entity); }
