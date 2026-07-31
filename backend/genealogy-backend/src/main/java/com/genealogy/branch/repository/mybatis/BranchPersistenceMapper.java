package com.genealogy.branch.repository.mybatis;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.genealogy.branch.entity.BranchEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface BranchPersistenceMapper extends BaseMapper<BranchEntity> {

    int updateAllById(BranchEntity entity);

    boolean isDescendantOrSelf(
            @Param("clanId") Long clanId,
            @Param("ancestorId") Long ancestorId,
            @Param("candidateId") Long candidateId
    );

    List<Long> findSubtreeIds(
            @Param("clanId") Long clanId,
            @Param("ancestorIds") Collection<Long> ancestorIds
    );
}
