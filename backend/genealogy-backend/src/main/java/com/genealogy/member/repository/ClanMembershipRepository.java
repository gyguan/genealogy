package com.genealogy.member.repository;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.member.enums.MemberStatus;
import com.genealogy.member.repository.mybatis.ClanMembershipPersistenceMapper;
import com.genealogy.member.repository.mybatis.ClanMembershipQueryMapper;
import com.genealogy.member.repository.query.ClanMembershipSearchCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Repository
@Transactional(readOnly = true)
public class ClanMembershipRepository {
    private final ClanMembershipPersistenceMapper persistenceMapper;
    private final ClanMembershipQueryMapper queryMapper;
    public ClanMembershipRepository(ClanMembershipPersistenceMapper persistenceMapper, ClanMembershipQueryMapper queryMapper){this.persistenceMapper=persistenceMapper;this.queryMapper=queryMapper;}
    @Transactional public ClanMembershipEntity save(ClanMembershipEntity e){Objects.requireNonNull(e);if(e.getId()==null)persistenceMapper.insert(e);else requireOne(persistenceMapper.updateAllById(e),e.getId());return e;}
    @Transactional public ClanMembershipEntity saveAndFlush(ClanMembershipEntity e){return save(e);}
    public Optional<ClanMembershipEntity> findById(Long id){return Optional.ofNullable(id==null?null:persistenceMapper.selectById(id));}
    public List<ClanMembershipEntity> findAllById(Iterable<Long> ids){List<Long> v=ids(ids);return v.isEmpty()?List.of():persistenceMapper.selectBatchIds(v);}
    public Optional<ClanMembershipEntity> findByClanIdAndUserId(Long clanId,Long userId){return one(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).eq(ClanMembershipEntity::getUserId,userId));}
    public Optional<ClanMembershipEntity> findByClanIdAndUserIdAndMemberStatus(Long clanId,Long userId,MemberStatus status){return one(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).eq(ClanMembershipEntity::getUserId,userId).eq(ClanMembershipEntity::getMemberStatus,status));}
    public List<ClanMembershipEntity> findByClanIdAndUserIdIn(Long clanId,Collection<Long> userIds){return userIds==null||userIds.isEmpty()?List.of():persistenceMapper.selectList(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).in(ClanMembershipEntity::getUserId,userIds).orderByAsc(ClanMembershipEntity::getId));}
    public List<ClanMembershipEntity> findByClanIdAndMemberStatus(Long clanId,MemberStatus status){return persistenceMapper.selectList(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).eq(ClanMembershipEntity::getMemberStatus,status).orderByAsc(ClanMembershipEntity::getId));}
    public List<ClanMembershipEntity> findByClanId(Long clanId){return persistenceMapper.selectList(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).orderByAsc(ClanMembershipEntity::getId));}
    public Page<ClanMembershipEntity> findByClanId(Long clanId,Pageable pageable){long total=persistenceMapper.selectCount(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId));if(total==0)return new PageImpl<>(List.of(),pageable,0);List<ClanMembershipEntity> rows=persistenceMapper.selectList(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).orderByAsc(ClanMembershipEntity::getId).last("limit "+pageable.getPageSize()+" offset "+pageable.getOffset()));return new PageImpl<>(rows,pageable,total);}
    public List<ClanMembershipEntity> findByUserIdAndMemberStatus(Long userId,MemberStatus status){return persistenceMapper.selectList(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getUserId,userId).eq(ClanMembershipEntity::getMemberStatus,status).orderByAsc(ClanMembershipEntity::getId));}
    public List<ClanMembershipEntity> findByPersonId(Long personId){return persistenceMapper.selectList(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getPersonId,personId).orderByAsc(ClanMembershipEntity::getId));}
    public boolean existsByClanIdAndUserIdAndMemberStatus(Long clanId,Long userId,MemberStatus status){return persistenceMapper.selectCount(Wrappers.<ClanMembershipEntity>lambdaQuery().eq(ClanMembershipEntity::getClanId,clanId).eq(ClanMembershipEntity::getUserId,userId).eq(ClanMembershipEntity::getMemberStatus,status))>0;}
    public Page<ClanMembershipEntity> searchMembers(Long clanId,String keyword,boolean filterByRoleCodes,Collection<String> roleCodes,boolean filterByScopeTypes,Collection<MemberRoleScopeType> scopeTypes,boolean filterByMemberStatuses,Collection<MemberStatus> memberStatuses,boolean fullClanAccess,MemberRoleScopeType branchScope,MemberRoleScopeType branchSubtreeScope,Collection<Long> visibleBranchIds,Collection<Long> visibleSubtreeIds,Pageable pageable){ClanMembershipSearchCriteria c=new ClanMembershipSearchCriteria(clanId,keyword,filterByRoleCodes,list(roleCodes),filterByScopeTypes,list(scopeTypes),filterByMemberStatuses,list(memberStatuses),fullClanAccess,branchScope,branchSubtreeScope,list(visibleBranchIds),list(visibleSubtreeIds));long total=queryMapper.count(c);List<ClanMembershipEntity> rows=total==0?List.of():queryMapper.search(c,pageable.getOffset(),pageable.getPageSize());return new PageImpl<>(rows,pageable,total);}
    @Transactional public List<ClanMembershipEntity> lockByClanId(Long clanId){return persistenceMapper.selectByClanIdForUpdate(clanId);}
    @Transactional public void deleteAll(Iterable<ClanMembershipEntity> entities){for(ClanMembershipEntity e:entities)if(e!=null&&e.getId()!=null)persistenceMapper.deleteById(e.getId());}
    private Optional<ClanMembershipEntity> one(com.baomidou.mybatisplus.core.conditions.Wrapper<ClanMembershipEntity> w){return Optional.ofNullable(persistenceMapper.selectOne(w));}
    private static void requireOne(int n,Long id){if(n!=1)throw new IllegalStateException("Membership update expected one row for id "+id);}
    private static List<Long> ids(Iterable<Long> values){LinkedHashSet<Long>s=new LinkedHashSet<>();if(values!=null)for(Long v:values)if(v!=null)s.add(v);return List.copyOf(s);} private static <T> List<T> list(Collection<T> v){return v==null?List.of():List.copyOf(v);}
}
