package com.genealogy.source.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper; import com.genealogy.source.entity.SourceEntity; import org.apache.ibatis.annotations.Mapper;
@Mapper public interface SourcePersistenceMapper extends BaseMapper<SourceEntity>{ int updateAllById(SourceEntity entity); }
