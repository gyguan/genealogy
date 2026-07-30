package com.genealogy.person.repository.mybatis;

import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.query.PersonDashboardBucket;
import com.genealogy.person.repository.query.PersonDashboardDailyCount;
import com.genealogy.person.repository.query.PersonDashboardSummary;
import com.genealogy.person.repository.query.PersonDuplicateCriteria;
import com.genealogy.person.repository.query.PersonSearchCriteria;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface PersonQueryMapper {

    long countSearch(@Param("criteria") PersonSearchCriteria criteria);

    List<PersonEntity> search(
            @Param("criteria") PersonSearchCriteria criteria,
            @Param("offset") long offset,
            @Param("limit") int limit
    );

    List<PersonEntity> findForExport(@Param("criteria") PersonSearchCriteria criteria);

    long countDuplicates(@Param("criteria") PersonDuplicateCriteria criteria);

    List<PersonEntity> findDuplicateCandidates(
            @Param("criteria") PersonDuplicateCriteria criteria,
            @Param("limit") int limit
    );

    PersonDashboardSummary selectDashboardSummary(
            @Param("clanId") Long clanId,
            @Param("dataStatus") String dataStatus
    );

    List<PersonDashboardBucket> selectDashboardBuckets(
            @Param("clanId") Long clanId,
            @Param("dataStatus") String dataStatus
    );

    List<PersonDashboardDailyCount> selectCreatedDaily(
            @Param("clanId") Long clanId,
            @Param("dataStatus") String dataStatus,
            @Param("fromTime") LocalDateTime fromTime
    );

    List<PersonEntity> selectRecentDashboardPeople(
            @Param("clanId") Long clanId,
            @Param("dataStatus") String dataStatus,
            @Param("limit") int limit
    );
}
