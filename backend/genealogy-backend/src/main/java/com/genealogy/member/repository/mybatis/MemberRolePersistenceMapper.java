package com.genealogy.member.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberRolePersistenceMapper extends BaseMapper<MemberRoleEntity> {
    int updateAllById(MemberRoleEntity entity);
    long countActiveRoleGrants(@Param("clanId") Long clanId, @Param("memberStatus") MemberStatus memberStatus,
                               @Param("grantStatus") String grantStatus, @Param("roleCode") String roleCode,
                               @Param("scopeType") MemberRoleScopeType scopeType);
}
