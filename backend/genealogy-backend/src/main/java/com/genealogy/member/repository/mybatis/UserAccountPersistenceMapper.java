package com.genealogy.member.repository.mybatis;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.member.entity.UserAccountEntity;
import org.apache.ibatis.annotations.Mapper;
@Mapper public interface UserAccountPersistenceMapper extends BaseMapper<UserAccountEntity> { int updateAllById(UserAccountEntity entity); }
