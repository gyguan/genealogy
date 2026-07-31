package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AuthSessionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface AuthSessionPersistenceMapper
        extends BaseMapper<AuthSessionEntity> {
    int updateAllById(@Param("entity") AuthSessionEntity entity);

    AuthSessionEntity findActiveByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("now") LocalDateTime now
    );

    AuthSessionEntity findByTokenHash(
            @Param("tokenHash") String tokenHash
    );

    List<AuthSessionEntity> findActiveByUserId(
            @Param("userId") Long userId,
            @Param("now") LocalDateTime now
    );

    int deleteRetiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
