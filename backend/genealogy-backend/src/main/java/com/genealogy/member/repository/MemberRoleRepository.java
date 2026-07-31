package com.genealogy.member.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.mybatis.MemberRolePersistenceMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Repository @Transactional(readOnly=true)
public class MemberRoleRepository {
 private final MemberRolePersistenceMapper mapper; public MemberRoleRepository(MemberRolePersistenceMapper mapper){this.mapper=mapper;}
 @Transactional public MemberRoleEntity save(MemberRoleEntity e){Objects.requireNonNull(e);if(e.getId()==null)mapper.insert(e);else if(mapper.updateAllById(e)!=1)throw new IllegalStateException("Member role update expected one row for id "+e.getId());return e;}
 @Transactional public MemberRoleEntity saveAndFlush(MemberRoleEntity e){return save(e);} public Optional<MemberRoleEntity> findById(Long id){return Optional.ofNullable(id==null?null:mapper.selectById(id));}
 public List<MemberRoleEntity> findAllById(Iterable<Long> ids){List<Long>v=ids(ids);return v.isEmpty()?List.of():mapper.selectBatchIds(v);} public List<MemberRoleEntity> findByMembershipIdAndStatus(Long id,String status){return list(Wrappers.<MemberRoleEntity>lambdaQuery().eq(MemberRoleEntity::getMembershipId,id).eq(MemberRoleEntity::getStatus,status));}
 public List<MemberRoleEntity> findByMembershipIdInAndStatus(Collection<Long> ids,String status){return ids==null||ids.isEmpty()?List.of():list(Wrappers.<MemberRoleEntity>lambdaQuery().in(MemberRoleEntity::getMembershipId,ids).eq(MemberRoleEntity::getStatus,status));}
 public List<MemberRoleEntity> findByMembershipIdIn(Collection<Long> ids){return ids==null||ids.isEmpty()?List.of():list(Wrappers.<MemberRoleEntity>lambdaQuery().in(MemberRoleEntity::getMembershipId,ids));}
 public List<MemberRoleEntity> findByRoleIdAndStatus(Long roleId,String status){return list(Wrappers.<MemberRoleEntity>lambdaQuery().eq(MemberRoleEntity::getRoleId,roleId).eq(MemberRoleEntity::getStatus,status));}
 public Optional<MemberRoleEntity> findByMembershipIdAndRoleIdAndScopeTypeAndScopeId(Long membershipId,Long roleId,MemberRoleScopeType scopeType,Long scopeId){return Optional.ofNullable(mapper.selectOne(Wrappers.<MemberRoleEntity>lambdaQuery().eq(MemberRoleEntity::getMembershipId,membershipId).eq(MemberRoleEntity::getRoleId,roleId).eq(MemberRoleEntity::getScopeType,scopeType).eq(MemberRoleEntity::getScopeId,scopeId)));}
 public boolean existsByMembershipIdAndRoleIdAndScopeTypeAndScopeIdAndStatus(Long membershipId,Long roleId,MemberRoleScopeType scopeType,Long scopeId,String status){return mapper.selectCount(Wrappers.<MemberRoleEntity>lambdaQuery().eq(MemberRoleEntity::getMembershipId,membershipId).eq(MemberRoleEntity::getRoleId,roleId).eq(MemberRoleEntity::getScopeType,scopeType).eq(MemberRoleEntity::getScopeId,scopeId).eq(MemberRoleEntity::getStatus,status))>0;}
 public long countActiveRoleGrants(Long clanId,MemberStatus memberStatus,String grantStatus,String roleCode,MemberRoleScopeType scopeType){return mapper.countActiveRoleGrants(clanId,memberStatus,grantStatus,roleCode,scopeType);}
 @Transactional public void deleteAll(Iterable<MemberRoleEntity> entities){for(MemberRoleEntity e:entities)if(e!=null&&e.getId()!=null)mapper.deleteById(e.getId());}
 private List<MemberRoleEntity> list(com.baomidou.mybatisplus.core.conditions.Wrapper<MemberRoleEntity>w){return mapper.selectList(w);}
 private static List<Long> ids(Iterable<Long> values){LinkedHashSet<Long>s=new LinkedHashSet<>();if(values!=null)for(Long v:values)if(v!=null)s.add(v);return List.copyOf(s);}
}
