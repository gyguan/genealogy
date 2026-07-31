package com.genealogy.source.attachment.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper; import com.genealogy.source.attachment.entity.LegacySourceAttachmentEntity; import org.apache.ibatis.annotations.Mapper;
@Mapper public interface LegacySourceAttachmentPersistenceMapper extends BaseMapper<LegacySourceAttachmentEntity>{ int updateAllById(LegacySourceAttachmentEntity entity); }
