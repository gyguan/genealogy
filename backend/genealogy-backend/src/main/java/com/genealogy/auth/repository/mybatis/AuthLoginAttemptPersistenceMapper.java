package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AuthLoginAttemptEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface AuthLoginAttemptPersistenceMapper
        extends BaseMapper<AuthLoginAttemptEntity> {
    int updateAllById(@Param("entity") AuthLoginAttemptEntity entity);

    long countAccountFailures(
            @Param("accountHash") String accountHash,
            @Param("createdAt") LocalDateTime createdAt
    );

    long countIpFailures(
            @Param("ipHash") String ipHash,
            @Param("createdAt") LocalDateTime createdAt
    );

    AuthLoginAttemptEntity findLatestAccountFailure(
            @Param("accountHash") String accountHash
    );

    AuthLoginAttemptEntity findLatestIpFailure(
            @Param("ipHash") String ipHash
    );

    int deleteAccountFailures(@Param("accountHash") String accountHash);
}
