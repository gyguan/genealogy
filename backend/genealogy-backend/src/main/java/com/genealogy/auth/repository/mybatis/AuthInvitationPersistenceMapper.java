package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AuthInvitationEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AuthInvitationPersistenceMapper
        extends BaseMapper<AuthInvitationEntity> {
    int updateAllById(@Param("entity") AuthInvitationEntity entity);

    AuthInvitationEntity findByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("forUpdate") boolean forUpdate
    );
}
