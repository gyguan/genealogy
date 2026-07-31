package com.genealogy.source.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper; import com.genealogy.source.entity.AttachmentEntity; import org.apache.ibatis.annotations.Mapper;
@Mapper public interface AttachmentPersistenceMapper extends BaseMapper<AttachmentEntity>{ int updateAllById(AttachmentEntity entity); }
