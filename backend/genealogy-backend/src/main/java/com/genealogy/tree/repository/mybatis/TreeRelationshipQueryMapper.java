package com.genealogy.tree.repository.mybatis;

import com.genealogy.tree.query.TreeRelationshipSnapshot;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface TreeRelationshipQueryMapper {

    List<TreeRelationshipSnapshot> selectOutgoing(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses,
            @Param("categories") Collection<String> categories,
            @Param("lineageOnly") boolean lineageOnly
    );

    List<TreeRelationshipSnapshot> selectIncoming(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses,
            @Param("categories") Collection<String> categories,
            @Param("lineageOnly") boolean lineageOnly
    );

    List<TreeRelationshipSnapshot> selectWithinPeople(
            @Param("clanId") Long clanId,
            @Param("fromPersonIds") Collection<Long> fromPersonIds,
            @Param("toPersonIds") Collection<Long> toPersonIds,
            @Param("statuses") Collection<String> statuses,
            @Param("categories") Collection<String> categories,
            @Param("limit") Integer limit
    );
}
