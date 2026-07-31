package com.genealogy.tree.repository.mybatis;

import com.genealogy.tree.query.TreePersonSnapshot;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface TreePersonQueryMapper {

    List<TreePersonSnapshot> selectByIds(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses
    );

    List<TreePersonSnapshot> selectByBranches(
            @Param("clanId") Long clanId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("statuses") Collection<String> statuses,
            @Param("limit") Integer limit
    );
}
