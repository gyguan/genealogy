package com.genealogy.auth.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.auth.entity.AppUserEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface AppUserPersistenceMapper extends BaseMapper<AppUserEntity> {
    int updateAllById(@Param("entity") AppUserEntity entity);

    AppUserEntity findByUsername(
            @Param("username") String username,
            @Param("activeOnly") boolean activeOnly
    );

    boolean existsUsername(
            @Param("username") String username,
            @Param("activeOnly") boolean activeOnly
    );

    boolean existsPhone(@Param("phone") String phone);

    boolean existsEmail(@Param("email") String email);

    AppUserEntity findRecoverableAccount(@Param("account") String account);

    long countActiveCandidates(@Param("keyword") String keyword);

    List<AppUserEntity> searchActiveCandidates(
            @Param("keyword") String keyword,
            @Param("offset") long offset,
            @Param("limit") int limit
    );

    List<AppUserEntity> findAllByIds(@Param("ids") Collection<Long> ids);

    List<AppUserEntity> findAll();
}
