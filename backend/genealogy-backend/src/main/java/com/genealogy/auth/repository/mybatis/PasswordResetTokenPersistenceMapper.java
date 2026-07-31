package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.PasswordResetTokenEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PasswordResetTokenPersistenceMapper
        extends BaseMapper<PasswordResetTokenEntity> {
    int updateAllById(@Param("entity") PasswordResetTokenEntity entity);

    PasswordResetTokenEntity findByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("forUpdate") boolean forUpdate
    );

    List<PasswordResetTokenEntity> findActiveByUserId(
            @Param("userId") Long userId
    );
}
